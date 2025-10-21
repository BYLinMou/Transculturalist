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

module.exports = {
  LANGUAGE_INSTRUCTIONS,
  ROLEPLAY_LANGUAGE_INSTRUCTIONS,
  getLanguageInstruction
};
