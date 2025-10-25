const { getGameConfig, renderTemplate } = require('../../services/gameConfigService');
const { callOpenAI, getLanguageInstruction } = require('../../shared/ai-helpers');

// POST /api/ai/generate - Main AI generation endpoint
exports.generate = async (req, res) => {
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
};

// POST /api/roleplay/character - Generate roleplay character
exports.roleplayCharacter = async (req, res) => {
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
};

// POST /api/roleplay/chat - Continue roleplay conversation
exports.roleplayChat = async (req, res) => {
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
};

// POST /api/story/chapter - Generate story chapter
exports.storyChapter = async (req, res) => {
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
};
