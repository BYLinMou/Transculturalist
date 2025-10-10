// 複製此檔為 config.js 並填入你的 API keys (不要把 config.js 加到 git)
module.exports = {
  // Your API key here
  // e.g. OPENAI_API_KEY: 'sk-xxxxxx',
  OPENAI_API_KEY: '',
  // BASE_URL 範例：
  // 如果你使用 OpenAI 官方 API，填入 'https://api.openai.com/v1'
  // 若使用其他代理或 self-hosted，請填入對應的 base URL（不包含路徑）
  // 請在BASE_URL 後面加上 /v1
  // BASE_URL: 'https://api.openai.com/v1',
  BASE_URL: '',
  // Optional: default model to use when a request doesn't provide one.
  // Example: DEFAULT_MODEL: 'gpt-4o-mini'
  DEFAULT_MODEL: '',
  // 其他設定（S3, DB 連線）
};
