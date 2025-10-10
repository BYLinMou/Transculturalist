const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');

// Example health
router.get('/health', (req, res) => res.json({ ok: true }));

// AI generation endpoint using game configs
const { getGameConfig, renderTemplate } = require('../services/gameConfigService');
const { listGames } = require('../services/gameConfigService');

// Helper function to load API configuration
function loadApiConfig() {
  let config = {};
  try { config = require('../../config'); } catch (e) { 
    console.error('Failed to load config:', e.message);
    config = {}; 
  }
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || config.OPENAI_API_KEY;
  const BASE_URL = process.env.BASE_URL || config.BASE_URL;

  if (!OPENAI_API_KEY || !BASE_URL) {
    throw new Error('AI service not configured');
  }

  return { OPENAI_API_KEY, BASE_URL };
}

// Language instruction mapping for AI responses
const LANGUAGE_INSTRUCTIONS = {
  'en': 'Please respond in English.',
  'zh': '請用繁體中文回答。'
};

// Language instruction mapping for roleplay chat (with character instruction)
const ROLEPLAY_LANGUAGE_INSTRUCTIONS = {
  'en': 'Please respond in English and stay in character.',
  'zh': '請用繁體中文回答並保持角色設定。'
};

// Default language instruction for unsupported languages
const DEFAULT_LANGUAGE_INSTRUCTION = '請用繁體中文回答。';
const DEFAULT_ROLEPLAY_LANGUAGE_INSTRUCTION = '請用繁體中文回答並保持角色設定。';

// POST /api/ai/generate
// Accepts model override from request body, query string, or header.
// Priority: body.model > query.model > header 'x-model' or 'x-openai-model'
router.post('/ai/generate', async (req, res) => {
  const { gameId, theme, params = {}, language = 'zh' } = req.body || {};
  const requestedModelFromBody = (req.body && req.body.model) || null;
  const requestedModelFromQuery = (req.query && req.query.model) || null;
  const requestedModelFromHeader = req.get('x-model') || req.get('x-openai-model') || null;
  const requestedModel = requestedModelFromBody || requestedModelFromQuery || requestedModelFromHeader || null;

  const cfg = getGameConfig(gameId);
  if (!cfg) return res.status(400).json({ success: false, error: 'unknown gameId' });

  // Merge params using cfg defaults
  const templateVars = {};
  if (cfg.params) {
    Object.keys(cfg.params).forEach(k => {
      templateVars[k] = (params[k] !== undefined) ? params[k] : cfg.params[k].default;
    });
  }
  templateVars.theme = theme || '文化';

  // Determine language instruction for AI
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || DEFAULT_LANGUAGE_INSTRUCTION;

  templateVars.languageInstruction = languageInstruction;

  const prompt = renderTemplate(cfg.template, templateVars);

  // Load API key and base url (config or env)
  const { OPENAI_API_KEY, BASE_URL } = loadApiConfig();

  // Determine model: request override > cfg.model > DEFAULT_MODEL env/config > fallback
  const modelToUse = requestedModel || cfg.model || process.env.DEFAULT_MODEL || (require('../../config').DEFAULT_MODEL || null) || 'gpt-4o-mini';

  try {
    const payload = {
      model: modelToUse,
      messages: [
        { role: 'system', content: `You are a helpful assistant that returns only JSON as requested. ${languageInstruction}` },
        { role: 'user', content: prompt }
      ],
      max_tokens: cfg.max_tokens || 800,
      temperature: (cfg.temperature !== undefined) ? cfg.temperature : 0.7
    };

    const response = await axios.post(`${BASE_URL}/chat/completions`, payload, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: cfg.timeout || 20000
    });

    // Attempt to extract JSON from model output
    const raw = response.data;
    // Prefer text content from chat response if available
    let text = null;
    if (raw && raw.choices && raw.choices[0] && raw.choices[0].message) {
      text = raw.choices[0].message.content;
    } else if (raw && raw.choices && raw.choices[0] && raw.choices[0].text) {
      text = raw.choices[0].text;
    }

    function extractJsonFromText(t) {
      if (!t || typeof t !== 'string') return null;
      const m = t.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch (e) { return null; }
    }

    const parsed = extractJsonFromText(text) || raw;

    if (!parsed) {
      console.error('Failed to parse JSON from AI response');
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }

    return res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('AI proxy error:', err.message || err);
    return res.status(500).json({ success: false, error: 'AI service error: ' + (err.message || 'Unknown error') });
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

// POST /api/roleplay/character - Generate roleplay character
router.post('/roleplay/character', async (req, res) => {
  const { theme, language = 'zh' } = req.body || {};
  if (!theme) return res.status(400).json({ success: false, error: 'theme required' });

  const cfg = getGameConfig('roleplay');
  if (!cfg || !cfg.characterGenerationTemplate) {
    return res.status(500).json({ success: false, error: 'roleplay config not found' });
  }

  // Determine language instruction for AI
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || DEFAULT_LANGUAGE_INSTRUCTION;

  const prompt = renderTemplate(cfg.characterGenerationTemplate, { theme, languageInstruction });

  const { OPENAI_API_KEY, BASE_URL } = loadApiConfig();

  try {
    const modelToUse = req.body.model || cfg.model || process.env.DEFAULT_MODEL || 'gpt-4o-mini';
    const payload = {
      model: modelToUse,
      messages: [
        { role: 'system', content: `You are a helpful assistant that returns only JSON as requested. ${languageInstruction}` },
        { role: 'user', content: prompt }
      ],
      max_tokens: cfg.max_tokens || 800,
      temperature: cfg.temperature || 0.6
    };

    const response = await axios.post(`${BASE_URL}/chat/completions`, payload, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: cfg.timeout || 20000
    });

    const raw = response.data;
    let text = null;
    if (raw && raw.choices && raw.choices[0] && raw.choices[0].message) {
      text = raw.choices[0].message.content;
    }

    function extractJsonFromText(t) {
      if (!t || typeof t !== 'string') return null;
      const m = t.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch (e) { return null; }
    }

    const parsed = extractJsonFromText(text) || raw;
    
    if (!parsed) {
      console.error('Failed to parse character JSON from AI response');
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }
    
    return res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Roleplay character generation error:', err.message || err);
    return res.status(500).json({ success: false, error: 'AI service error: ' + (err.message || 'Unknown error') });
  }
});

// POST /api/roleplay/chat - Continue roleplay conversation
router.post('/roleplay/chat', async (req, res) => {
  const { theme, character, userMessage, language = 'zh' } = req.body || {};
  if (!theme || !character || !userMessage) {
    return res.status(400).json({ success: false, error: 'theme, character, and userMessage required' });
  }

  const cfg = getGameConfig('roleplay');
  if (!cfg || !cfg.conversationTemplate) {
    return res.status(500).json({ success: false, error: 'roleplay config not found' });
  }

  // Determine language instruction for AI
  const languageInstruction = ROLEPLAY_LANGUAGE_INSTRUCTIONS[language] || DEFAULT_ROLEPLAY_LANGUAGE_INSTRUCTION;

  const prompt = renderTemplate(cfg.conversationTemplate, {
    theme,
    characterName: character.name || '角色',
    characterDescription: character.description || '',
    characterPersonality: character.personality || '',
    characterKnowledge: character.knowledge || '',
    userMessage,
    languageInstruction
  });

  const { OPENAI_API_KEY, BASE_URL } = loadApiConfig();

  try {
    const modelToUse = req.body.model || cfg.model || process.env.DEFAULT_MODEL || 'gpt-4o-mini';
    const payload = {
      model: modelToUse,
      messages: [
        { role: 'system', content: languageInstruction },
        { role: 'user', content: prompt }
      ],
      max_tokens: cfg.max_tokens || 500,
      temperature: cfg.temperature || 0.6
    };

    const response = await axios.post(`${BASE_URL}/chat/completions`, payload, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: cfg.timeout || 20000
    });

    const raw = response.data;
    let text = '';
    if (raw && raw.choices && raw.choices[0] && raw.choices[0].message) {
      text = raw.choices[0].message.content;
    }

    return res.json({ success: true, data: { response: text } });
  } catch (err) {
    console.error('Roleplay chat error:', err.message || err);
    return res.status(500).json({ success: false, error: 'AI service error: ' + (err.message || 'Unknown error') });
  }
});

// POST /api/story/chapter - Generate story chapter
router.post('/story/chapter', async (req, res) => {
  const { theme, previousChoice, chapterNumber, language = 'zh' } = req.body || {};
  if (!theme) return res.status(400).json({ success: false, error: 'theme required' });

  const cfg = getGameConfig('story');
  if (!cfg) {
    return res.status(500).json({ success: false, error: 'story config not found' });
  }

  // Determine language instruction for AI
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || DEFAULT_LANGUAGE_INSTRUCTION;

  let template, templateVars;
  if (!previousChoice || chapterNumber === 1) {
    template = cfg.initialChapterTemplate;
    templateVars = { theme, languageInstruction };
  } else {
    template = cfg.continueChapterTemplate;
    templateVars = { theme, previousChoice, languageInstruction };
  }

  const prompt = renderTemplate(template, templateVars);

  const { OPENAI_API_KEY, BASE_URL } = loadApiConfig();

  try {
    const modelToUse = req.body.model || cfg.model || process.env.DEFAULT_MODEL || 'gpt-4o-mini';
    const payload = {
      model: modelToUse,
      messages: [
        { role: 'system', content: `You are a helpful assistant that returns only JSON as requested. ${languageInstruction}` },
        { role: 'user', content: prompt }
      ],
      max_tokens: cfg.max_tokens || 1000,
      temperature: cfg.temperature || 0.7
    };

    const response = await axios.post(`${BASE_URL}/chat/completions`, payload, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: cfg.timeout || 30000
    });

    const raw = response.data;
    let text = null;
    if (raw && raw.choices && raw.choices[0] && raw.choices[0].message) {
      text = raw.choices[0].message.content;
    }

    function extractJsonFromText(t) {
      if (!t || typeof t !== 'string') return null;
      const m = t.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch (e) { return null; }
    }

    const parsed = extractJsonFromText(text) || raw;
    
    if (!parsed) {
      console.error('Failed to parse story JSON from AI response');
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }
    
    return res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Story generation error:', err.message || err);
    return res.status(500).json({ success: false, error: 'AI service error: ' + (err.message || 'Unknown error') });
  }
});

// File upload handler (stores to server/uploads)
router.post('/upload', upload.array('files', 10), (req, res) => {
  const files = req.files || [];
  const mapped = files.map(f => ({ originalname: f.originalname, path: f.path, size: f.size }));
  res.json({ success: true, files: mapped });
});

module.exports = router;
