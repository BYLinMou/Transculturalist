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
async function callOpenAI({ prompt, languageInstruction, maxTokens = 800, temperature = 0.7, timeout = 20000, expectJson = true, history = [] }) {
  const { OPENAI_API_KEY, BASE_URL, DEFAULT_MODEL } = loadApiConfig();
  
  const systemContent = expectJson 
    ? `You are a helpful assistant that returns only JSON as requested. ${languageInstruction}`
    : languageInstruction;

  const messages = [
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: prompt }
  ];

  // console.log('=== OpenAI Request Debug ===');
  // console.log('Model:', DEFAULT_MODEL);
  // console.log('History length:', history.length);
  // console.log('History messages:');
  // history.forEach((msg, index) => {
  //   console.log(`  [${index}] ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
  // });
  // console.log('Current prompt:', prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''));
  // console.log('===========================');

  const payload = {
    model: DEFAULT_MODEL,
    messages,
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

// Client configuration endpoint - returns safe configuration for frontend
router.get('/config', (req, res) => {
  try {
    const config = require('../../config');
    // Only return safe configuration values that frontend needs
    res.json({
      enableAuth: config.ENABLE_AUTH || false,
      port: config.PORT || 3030
    });
  } catch (err) {
    // If config fails to load, default to guest mode
    res.json({
      enableAuth: false,
      port: 3030
    });
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

    // Include maxHistory in response for frontend to use
    return res.json({ 
      success: true, 
      data,
      maxHistory: cfg.maxHistory || 5 // Default to 5 pairs (10 messages) if not configured
    });
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
    const { theme, character, userMessage, language = 'zh', history = [] } = req.body || {};
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

    // Limit history to maxHistory pairs (e.g., 5 pairs = 10 messages: 5 user + 5 assistant)
    const maxHistory = cfg.maxHistory || 5;
    const limitedHistory = history.slice(-maxHistory * 2); // multiply by 2 because each pair has 2 messages

    console.log(`Config maxHistory: ${maxHistory} pairs (${maxHistory * 2} total messages)`);
    console.log(`Limited history length: ${limitedHistory.length} messages`);
    limitedHistory.forEach((msg, index) => {
      console.log(`  Limited [${index}]: ${msg.role} - ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
    });

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
      expectJson: false,
      history: limitedHistory
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
    const { theme, previousChoice, chapterNumber, language = 'zh', history = [] } = req.body || {};
    if (!theme) {
      return res.status(400).json({ success: false, error: 'theme required' });
    }

    const cfg = getGameConfig('story');
    if (!cfg) {
      return res.status(500).json({ success: false, error: 'story config not found' });
    }

    // Limit history to maxHistory pairs (e.g., 5 pairs = 10 messages: 5 user + 5 assistant)
    const maxHistory = cfg.maxHistory || 5;
    const limitedHistory = history.slice(-maxHistory * 2); // multiply by 2 because each pair has 2 messages

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
      expectJson: true,
      history: limitedHistory
    });

    // Include maxHistory in response for frontend to use
    return res.json({ 
      success: true, 
      data,
      maxHistory: maxHistory // Return maxHistory so frontend knows the limit
    });
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

// ========== Authentication Routes ==========

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate password (minimum 6 characters)
function isValidPassword(password) {
  return password && password.length >= 6;
}

// POST /api/auth/register - User registration
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body || {};
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const timestamp = new Date().toISOString();

    // Validation
    if (!email || !password) {
      console.log(`[Auth] Register attempt with missing fields - Email: ${email ? 'provided' : 'missing'}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    if (!isValidEmail(email)) {
      console.log(`[Auth] Register attempt with invalid email format - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    if (!isValidPassword(password)) {
      console.log(`[Auth] Register attempt with weak password - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if email already exists
    try {
      const { queryOne, execute } = require('../db/connection');
      const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
      
      if (existingUser) {
        console.log(`[Auth] ⚠ Register attempt with duplicate email - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
        return res.status(409).json({ 
          success: false, 
          error: 'Email already registered' 
        });
      }

      // Hash password (in production, use bcrypt)
      const crypto = require('crypto');
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      
      // Insert new user
      const result = await execute(
        `INSERT INTO users (email, password_hash, username, created_at, updated_at, is_active, is_verified) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0)`,
        [email, passwordHash, username || 'User']
      );

      console.log(`[Auth] ✓ User registered successfully - Email: ${email}, Username: ${username || 'User'}, UserID: ${result.lastID}, IP: ${clientIp}, Time: ${timestamp}`);

      return res.status(201).json({ 
        success: true, 
        message: 'User registered successfully',
        user: {
          id: result.lastID,
          email: email,
          username: username || 'User'
        }
      });
    } catch (dbError) {
      console.error(`[Auth] ✗ Database error during registration - Email: ${email}, Error: ${dbError.message}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during registration' 
      });
    }
  } catch (err) {
    console.error('[Auth] ✗ Unexpected error during registration:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/auth/login - User login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const timestamp = new Date().toISOString();

    // Validation
    if (!email || !password) {
      console.log(`[Auth] Login attempt with missing fields - Email: ${email ? 'provided' : 'missing'}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    try {
      const { queryOne, execute } = require('../db/connection');
      
      // Hash password
      const crypto = require('crypto');
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      // Find user
      const user = await queryOne(
        'SELECT id, email, username, is_active FROM users WHERE email = ? AND password_hash = ?',
        [email, passwordHash]
      );

      if (!user) {
        console.log(`[Auth] ⚠ Failed login attempt - Email: ${email}, IP: ${clientIp}, Time: ${timestamp}`);
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }

      if (!user.is_active) {
        console.log(`[Auth] ⚠ Login attempt with inactive account - Email: ${email}, UserID: ${user.id}, IP: ${clientIp}, Time: ${timestamp}`);
        return res.status(403).json({ 
          success: false, 
          error: 'Account is inactive' 
        });
      }

      // Update last login
      await execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      console.log(`[Auth] ✓ User logged in - Email: ${email}, Username: ${user.username}, UserID: ${user.id}, IP: ${clientIp}, Time: ${timestamp}`);

      return res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    } catch (dbError) {
      console.error(`[Auth] ✗ Database error during login - Email: ${email}, Error: ${dbError.message}, IP: ${clientIp}, Time: ${timestamp}`);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during login' 
      });
    }
  } catch (err) {
    console.error('[Auth] ✗ Unexpected error during login:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;
