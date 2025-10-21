const axios = require('axios');
const { getLanguageInstruction } = require('./constants');

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

module.exports = {
  loadApiConfig,
  extractJsonFromText,
  callOpenAI,
  getLanguageInstruction
};
