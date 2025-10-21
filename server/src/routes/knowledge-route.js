const express = require('express');
const multer = require('multer');
const { randomUUID } = require('crypto');
const path = require('path');

const config = require('../config-loader');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const KNOWLEDGE_BUCKET = config.getConfig('KNOWLEDGE_BUCKET', 'transcultural-knowledge');

function buildTagTranslations(rawTags, locale) {
  if (!rawTags) return [];
  const list = Array.isArray(rawTags) ? rawTags : String(rawTags).split(',');
  return list
    .map(tag => String(tag).trim())
    .filter(Boolean)
    .map(tag => ({ [locale]: tag }));
}

function buildLocaleJson(value, locale, fallback) {
  const text = (value || '').trim();
  if (!text && !fallback) return {};
  return { [locale]: text || fallback };
}

function sanitizeFilename(original, fallback) {
  if (!original) return fallback;
  const basename = path.basename(original);
  const safe = basename.normalize('NFKD').replace(/[^\w.-]+/g, '_');
  return safe.length ? safe : fallback;
}

router.post('/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '缺少文件' });
    }

    const user = req.user;
    const supabase = req.supabase;
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not available' });
    }

    const fileId = randomUUID();
    const locale = (req.body.locale || 'zh-TW').trim();
    const themeInput = req.body.theme || '';
    const descriptionInput = req.body.description || '';
    const summaryInput = req.body.summary || '';
    const tagsInput = req.body.tags || '';

    const extension = path.extname(file.originalname) || '';
    const fallbackName = `file${extension || '.dat'}`;
    const safeFilename = sanitizeFilename(file.originalname, fallbackName);
    const storagePath = `uploads/${user.id}/${fileId}/${safeFilename}`;

    const contentType = file.mimetype && file.mimetype.startsWith('text/')
      ? `${file.mimetype}; charset=utf-8`
      : file.mimetype || 'application/octet-stream';

    const uploadResult = await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadResult.error) {
      console.error('[knowledge-upload] storage upload error:', uploadResult.error, { storagePath, user: user.id });
      return res.status(500).json({
        error: uploadResult.error.message,
        details: uploadResult.error.message,
        code: uploadResult.error.statusCode
      });
    }

    const fileRecord = {
      id: fileId,
      user_id: user.id,
      filename: file.originalname,
      file_path: storagePath,
      file_type: file.mimetype,
      file_size: file.size,
      status: 'ready'
    };

    const { error: insertFileError } = await supabase
      .from('files')
      .insert(fileRecord);
    if (insertFileError) {
      console.error('[knowledge-upload] insert files error:', insertFileError, { fileRecord, user: user.id });
      return res.status(500).json({
        error: insertFileError.message,
        details: insertFileError.details,
        hint: insertFileError.hint,
        code: insertFileError.code
      });
    }

    const knowledgeRecord = {
      id: randomUUID(),
      file_id: fileId,
      user_id: user.id,
      theme_name: buildLocaleJson(themeInput, locale, '未命名主題'),
      description: buildLocaleJson(descriptionInput, locale, '暫無描述'),
      summary: buildLocaleJson(summaryInput, locale, `此內容源自 ${file.originalname}`),
      tags: buildTagTranslations(tagsInput, locale),
      metadata: {
        locale,
        uploader_email: user.email,
        filename: file.originalname,
        storage_filename: safeFilename
      },
      generated_at: new Date().toISOString()
    };

    const { error: insertKnowledgeError } = await supabase
      .from('knowledge_entries')
      .insert(knowledgeRecord);

    if (insertKnowledgeError) {
      console.error('[knowledge-upload] insert knowledge error:', insertKnowledgeError, { knowledgeRecord, user: user.id });
      return res.status(500).json({
        error: insertKnowledgeError.message,
        details: insertKnowledgeError.details,
        hint: insertKnowledgeError.hint,
        code: insertKnowledgeError.code
      });
    }

    res.status(201).json({
      file: fileRecord,
      knowledge_entry: knowledgeRecord
    });
  } catch (error) {
    console.error('[knowledge-upload] failed:', error);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

router.get('/entries', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = req.supabase;
    const locale = (req.query.locale || 'zh-TW').trim();
    const search = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();

    let query = supabase
      .from('knowledge_entries')
      .select('id,file_id,theme_name,tags,description,summary,metadata,generated_at')
      .order('generated_at', { ascending: false });

    if (search) {
      query = query.ilike(`theme_name->>${locale}`, `%${search}%`);
    }

    const { data: entries, error } = await query;
    if (error) {
      console.error('[knowledge-entries] select error:', error);
      return res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
    }

    const fileIds = Array.from(new Set(entries.map(entry => entry.file_id)));
    let files = [];

    if (fileIds.length) {
      let fileQuery = supabase
        .from('files')
        .select('id,filename,file_path,status,uploaded_at,file_type,file_size');
      fileQuery = fileQuery.in('id', fileIds);
      if (status) {
        fileQuery = fileQuery.eq('status', status);
      }
      const { data: fileRows, error: fileError } = await fileQuery;
      if (fileError) {
        console.error('[knowledge-entries] file lookup error:', fileError);
        return res.status(500).json({ error: fileError.message, details: fileError.details, hint: fileError.hint });
      }
      files = fileRows;
    }

    const filesMap = new Map(files.map(file => [file.id, file]));
    const formatted = entries.map(entry => {
      const theme = entry.theme_name?.[locale] || entry.theme_name?.['zh-TW'] || Object.values(entry.theme_name || {})[0] || '未命名主題';
      const summary = entry.summary?.[locale] || entry.summary?.['zh-TW'] || Object.values(entry.summary || {})[0] || '';
      const tags = (entry.tags || [])
        .map(tag => tag[locale] || tag['zh-TW'] || Object.values(tag || {})[0])
        .filter(Boolean);

      return {
        id: entry.id,
        file_id: entry.file_id,
        theme,
        summary,
        tags,
        metadata: entry.metadata || {},
        generated_at: entry.generated_at,
        file: filesMap.get(entry.file_id) || null
      };
    }).filter(entry => {
      if (!status) return true;
      return entry.file && entry.file.status === status;
    });

    res.json({ entries: formatted });
  } catch (error) {
    console.error('[knowledge-entries] failed:', error);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

router.get('/files', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = req.supabase;
    const status = (req.query.status || '').trim();

    let query = supabase
      .from('files')
      .select('id,filename,file_path,status,uploaded_at,file_type,file_size')
      .order('uploaded_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[knowledge-files] select error:', error);
      return res.status(500).json({ error: error.message, details: error.details, hint: error.hint });
    }

    res.json({ files: data });
  } catch (error) {
    console.error('[knowledge-files] failed:', error);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

module.exports = router;
