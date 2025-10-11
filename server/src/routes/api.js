const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');

// AI generation endpoint using game configs
const { getGameConfig, renderTemplate, listGames } = require('../services/gameConfigService');

// ========== Configuration and Utilities ==========

// Helper function to load API configuration (including default model)
function loadApiConfig() {
  let config = {};
  try { 
    config = require('../../config'); 
  } catch (e) { 
    try {
      config = require('/app/server/config');
    } catch (e2) {
      console.error('Failed to load config from both paths:', e.message, e2.message);
      config = {}; 
    }
  }
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.OPENAI_API_KEY;
  const BASE_URL = process.env.BASE_URL || config.BASE_URL;
  const DEFAULT_MODEL = process.env.DEFAULT_MODEL || config.DEFAULT_MODEL;

  if (!OPENAI_API_KEY || !BASE_URL) {
    throw new Error('AI service not configured');
  }

  if (!DEFAULT_MODEL) {
    throw new Error('DEFAULT_MODEL not configured');
  }

  return { OPENAI_API_KEY, BASE_URL, DEFAULT_MODEL };
}

// Helper function to extract JSON from AI text response
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { 
    return JSON.parse(match[0]); 
  } catch (e) { 
    return null; 
  }
}

// Language instruction mapping for AI responses
const LANGUAGE_INSTRUCTIONS = {
  'en': 'Please respond in English.',
  'zh': '請用繁體中文回答。',
  'zh-Hans': '请用简体中文回答。',
  'ja': '日本語で回答してください。',
  'ko': '한국어로 답변해 주세요.'
};

// Language instruction mapping for roleplay chat (with character instruction)
const ROLEPLAY_LANGUAGE_INSTRUCTIONS = {
  'en': 'Please respond in English and stay in character.',
  'zh': '請用繁體中文回答並保持角色設定。',
  'zh-Hans': '请用简体中文回答并保持角色设定。',
  'ja': '日本語で回答し、キャラクターを維持してください。',
  'ko': '한국어로 답변하고 캐릭터를 유지하세요.'
};

// Get language instruction
function getLanguageInstruction(language, isRoleplay = false) {
  if (isRoleplay) {
    return ROLEPLAY_LANGUAGE_INSTRUCTIONS[language] || '請用繁體中文回答並保持角色設定。';
  }
  return LANGUAGE_INSTRUCTIONS[language] || '請用繁體中文回答。';
}

// Helper function to call OpenAI API
async function callOpenAI({ prompt, languageInstruction, maxTokens = 800, temperature = 0.7, timeout = 20000, expectJson = true }) {
  const { OPENAI_API_KEY, BASE_URL, DEFAULT_MODEL } = loadApiConfig();
  
  const systemContent = expectJson 
    ? `You are a helpful assistant that returns only JSON as requested. ${languageInstruction}`
    : languageInstruction;

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature
  };

  console.log('Calling OpenAI with model:', DEFAULT_MODEL);

  const response = await axios.post(`${BASE_URL}/chat/completions`, payload, {
    headers: { 
      Authorization: `Bearer ${OPENAI_API_KEY}`, 
      'Content-Type': 'application/json' 
    },
    timeout
  });

  const raw = response.data;
  // console.log('OpenAI response:', JSON.stringify(raw).slice(0, 2000)); // Log first 2000 chars
  let text = null;
  
  if (raw && raw.choices && raw.choices[0] && raw.choices[0].message) {
    text = raw.choices[0].message.content;
  } else if (raw && raw.choices && raw.choices[0] && raw.choices[0].text) {
    text = raw.choices[0].text;
  }

  if (expectJson) {
    const parsed = extractJsonFromText(text) || raw;
    if (!parsed) {
      throw new Error('Failed to parse JSON from AI response');
    }
    return parsed;
  }

  return text || '';
}

// ========== Routes ==========

// Example health
router.get('/health', (req, res) => res.json({ ok: true }));

// Version info endpoint
router.get('/version', (req, res) => {
  try {
    const packageInfo = require('../../../package.json');
    res.json({
      version: packageInfo.version,
      publishDate: packageInfo.publishDate,
      name: packageInfo.name,
      description: packageInfo.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load version info' });
  }
});


// Expose available games to frontend
router.get('/games', (req, res) => {
  try {
    const games = listGames();
    res.json({ success: true, games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/generate - Main AI generation endpoint
router.post('/ai/generate', async (req, res) => {
  try {
    const { gameId, theme, params = {}, language = 'zh' } = req.body || {};

    const cfg = getGameConfig(gameId);
    if (!cfg) {
      return res.status(400).json({ success: false, error: 'unknown gameId' });
    }

    // Merge params using cfg defaults
    const templateVars = { theme: theme || '文化' };
    if (cfg.params) {
      Object.keys(cfg.params).forEach(k => {
        templateVars[k] = (params[k] !== undefined) ? params[k] : cfg.params[k].default;
      });
    }

    const languageInstruction = getLanguageInstruction(language);
    templateVars.languageInstruction = languageInstruction;

    const prompt = renderTemplate(cfg.template, templateVars);

    const data = await callOpenAI({
      prompt,
      languageInstruction,
      maxTokens: cfg.max_tokens || 800,
      temperature: (cfg.temperature !== undefined) ? cfg.temperature : 0.7,
      timeout: cfg.timeout || 20000,
      expectJson: true
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('AI generation error:', err.message || err);
    return res.status(500).json({ 
      success: false, 
      error: 'AI service error: ' + (err.message || 'Unknown error') 
    });
  }
});

// POST /api/roleplay/character - Generate roleplay character
router.post('/roleplay/character', async (req, res) => {
  try {
    const { theme, language = 'zh' } = req.body || {};
    if (!theme) {
      return res.status(400).json({ success: false, error: 'theme required' });
    }

    const cfg = getGameConfig('roleplay');
    if (!cfg || !cfg.characterGenerationTemplate) {
      return res.status(500).json({ success: false, error: 'roleplay config not found' });
    }

    const languageInstruction = getLanguageInstruction(language);
    const prompt = renderTemplate(cfg.characterGenerationTemplate, { theme, languageInstruction });

    const data = await callOpenAI({
      prompt,
      languageInstruction,
      maxTokens: cfg.max_tokens || 800,
      temperature: cfg.temperature || 0.6,
      timeout: cfg.timeout || 20000,
      expectJson: true
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Roleplay character generation error:', err.message || err);
    return res.status(500).json({ 
      success: false, 
      error: 'AI service error: ' + (err.message || 'Unknown error') 
    });
  }
});

// POST /api/roleplay/chat - Continue roleplay conversation
router.post('/roleplay/chat', async (req, res) => {
  try {
    const { theme, character, userMessage, language = 'zh' } = req.body || {};
    if (!theme || !character || !userMessage) {
      return res.status(400).json({ 
        success: false, 
        error: 'theme, character, and userMessage required' 
      });
    }

    const cfg = getGameConfig('roleplay');
    if (!cfg || !cfg.conversationTemplate) {
      return res.status(500).json({ success: false, error: 'roleplay config not found' });
    }

    const languageInstruction = getLanguageInstruction(language, true);
    const prompt = renderTemplate(cfg.conversationTemplate, {
      theme,
      characterName: character.name || '角色',
      characterDescription: character.description || '',
      characterPersonality: character.personality || '',
      characterKnowledge: character.knowledge || '',
      userMessage,
      languageInstruction
    });

    const text = await callOpenAI({
      prompt,
      languageInstruction,
      maxTokens: cfg.max_tokens || 500,
      temperature: cfg.temperature || 0.6,
      timeout: cfg.timeout || 20000,
      expectJson: false
    });

    return res.json({ success: true, data: { response: text } });
  } catch (err) {
    console.error('Roleplay chat error:', err.message || err);
    return res.status(500).json({ 
      success: false, 
      error: 'AI service error: ' + (err.message || 'Unknown error') 
    });
  }
});

// POST /api/story/chapter - Generate story chapter
router.post('/story/chapter', async (req, res) => {
  try {
    const { theme, previousChoice, chapterNumber, language = 'zh' } = req.body || {};
    if (!theme) {
      return res.status(400).json({ success: false, error: 'theme required' });
    }

    const cfg = getGameConfig('story');
    if (!cfg) {
      return res.status(500).json({ success: false, error: 'story config not found' });
    }

    const languageInstruction = getLanguageInstruction(language);
    
    let template, templateVars;
    if (!previousChoice || chapterNumber === 1) {
      template = cfg.initialChapterTemplate;
      templateVars = { theme, languageInstruction };
    } else {
      template = cfg.continueChapterTemplate;
      templateVars = { theme, previousChoice, languageInstruction };
    }

    const prompt = renderTemplate(template, templateVars);

    const data = await callOpenAI({
      prompt,
      languageInstruction,
      maxTokens: cfg.max_tokens || 1000,
      temperature: cfg.temperature || 0.7,
      timeout: cfg.timeout || 30000,
      expectJson: true
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Story generation error:', err.message || err);
    return res.status(500).json({ 
      success: false, 
      error: 'AI service error: ' + (err.message || 'Unknown error') 
    });
  }
});

// File upload handler (stores to server/uploads)
router.post('/upload', upload.array('files', 10), (req, res) => {
  const files = req.files || [];
  const mapped = files.map(f => ({ 
    originalname: f.originalname, 
    path: f.path, 
    size: f.size 
  }));
  res.json({ success: true, files: mapped });
});

module.exports = router;
