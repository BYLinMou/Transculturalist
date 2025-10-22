/**
 * 论坛 - AI优化和多语言 API
 * 文件: server/src/routes/modules/forum-ai.js
 */

const axios = require('axios');
const { queryOne, execute } = require('../../db/connection');

// 支持的语言
const SUPPORTED_LANGUAGES = {
  'zh': { name: '中文', label: 'Chinese' },
  'en': { name: 'English', label: 'English' },
  'ja': { name: '日本語', label: 'Japanese' },
  'ko': { name: '한국어', label: 'Korean' },
  'es': { name: 'Español', label: 'Spanish' },
  'fr': { name: 'Français', label: 'French' },
  'de': { name: 'Deutsch', label: 'German' }
};

// ==================== AI 优化 API ====================

/**
 * POST /api/forum/shares/ai-summarize
 * AI 优化标题和描述
 * 
 * 请求体:
 * {
 *   title: "用户输入的标题",
 *   description: "用户输入的描述",
 *   targetLanguages: ["zh", "en", "ja"],  // 目标语言数组
 *   action: "optimize" | "summarize" | "translate"
 * }
 * 
 * 响应:
 * {
 *   success: true,
 *   data: {
 *     title_i18n: { "zh": "优化的标题", "en": "Optimized Title", ... },
 *     description_i18n: { "zh": "优化的描述", "en": "Optimized Description", ... },
 *     suggestions: ["建议1", "建议2", ...]
 *   }
 * }
 */
async function aiSummarize(req, res) {
  try {
    const { title, description, targetLanguages = ['zh', 'en'], action = 'optimize' } = req.body;
    
    // 验证输入
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: '标题和描述不能为空'
      });
    }
    
    // 验证目标语言
    const validLanguages = targetLanguages.filter(lang => SUPPORTED_LANGUAGES[lang]);
    if (validLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未指定有效的目标语言'
      });
    }
    
    // 确保中文始终包含
    if (!validLanguages.includes('zh')) {
      validLanguages.unshift('zh');
    }
    
    try {
      // 调用AI服务进行优化
      const aiResult = await callAIService({
        title,
        description,
        targetLanguages: validLanguages,
        action
      });
      
      res.json({
        success: true,
        data: aiResult
      });
    } catch (aiError) {
      console.error('[Forum AI] AI service error:', aiError.message);
      
      // 如果AI服务不可用，返回原始内容及基本处理
      const fallbackResult = generateFallbackResult(title, description, validLanguages);
      
      res.json({
        success: true,
        data: fallbackResult,
        warning: 'AI服务暂不可用，返回基本优化结果'
      });
    }
  } catch (error) {
    console.error('[Forum AI] Error in aiSummarize:', error);
    res.status(500).json({
      success: false,
      message: '优化失败，请稍后重试'
    });
  }
}

/**
 * POST /api/forum/shares/ai-translate
 * AI 翻译分享内容
 * 
 * 请求体:
 * {
 *   shareId: 123,
 *   targetLanguages: ["en", "ja"]
 * }
 */
async function aiTranslate(req, res) {
  try {
    const { shareId, targetLanguages = ['zh', 'en'] } = req.body;
    const user_id = req.user?.id;
    
    if (!shareId) {
      return res.status(400).json({
        success: false,
        message: '分享ID不能为空'
      });
    }
    
    // 获取分享
    const share = await queryOne(
      'SELECT * FROM culture_shares WHERE id = ?',
      [shareId]
    );
    
    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在'
      });
    }
    
    // 权限检查
    if (share.user_id !== user_id && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '没有权限翻译此分享'
      });
    }
    
    // 验证目标语言
    const validLanguages = targetLanguages.filter(lang => SUPPORTED_LANGUAGES[lang]);
    if (validLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未指定有效的目标语言'
      });
    }
    
    try {
      // 解析现有的多语言内容
      let titleI18n = share.title_i18n ? JSON.parse(share.title_i18n) : { zh: share.title };
      let descriptionI18n = share.description_i18n ? JSON.parse(share.description_i18n) : { zh: share.description };
      let contentI18n = share.content_i18n ? JSON.parse(share.content_i18n) : { zh: share.content };
      
      // 为每个目标语言翻译
      for (let targetLang of validLanguages) {
        if (!titleI18n[targetLang]) {
          const translated = await callAIService({
            title: titleI18n['zh'],
            description: descriptionI18n['zh'],
            targetLanguages: [targetLang],
            action: 'translate'
          });
          
          titleI18n[targetLang] = translated.title_i18n[targetLang];
          descriptionI18n[targetLang] = translated.description_i18n[targetLang];
          
          if (share.content) {
            contentI18n[targetLang] = translated.content_i18n?.[targetLang] || '';
          }
        }
      }
      
      // 更新数据库
      await execute(`
        UPDATE culture_shares
        SET title_i18n = ?, description_i18n = ?, content_i18n = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        JSON.stringify(titleI18n),
        JSON.stringify(descriptionI18n),
        JSON.stringify(contentI18n),
        shareId
      ]);
      
      res.json({
        success: true,
        message: '翻译完成',
        data: {
          shareId,
          title_i18n: titleI18n,
          description_i18n: descriptionI18n,
          languages: Object.keys(titleI18n)
        }
      });
    } catch (aiError) {
      console.error('[Forum AI] Translation error:', aiError.message);
      res.status(500).json({
        success: false,
        message: '翻译失败，请稍后重试'
      });
    }
  } catch (error) {
    console.error('[Forum AI] Error in aiTranslate:', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
}

/**
 * GET /api/forum/supported-languages
 * 获取支持的语言列表
 */
async function getSupportedLanguages(req, res) {
  res.json({
    success: true,
    data: SUPPORTED_LANGUAGES
  });
}

// ==================== AI 服务调用 ====================

/**
 * 调用AI服务进行优化和翻译
 * 这是一个模板函数，需要根据实际的AI服务进行调整
 */
async function callAIService(options) {
  const { title, description, targetLanguages, action } = options;
  
  // 检查是否配置了AI服务
  const aiConfig = getAIConfig();
  
  if (!aiConfig.enabled) {
    console.warn('[Forum AI] AI service is not enabled');
    return generateFallbackResult(title, description, targetLanguages);
  }
  
  try {
    if (aiConfig.provider === 'azure') {
      return await callAzureOpenAI(title, description, targetLanguages, action, aiConfig);
    } else if (aiConfig.provider === 'openai') {
      return await callOpenAI(title, description, targetLanguages, action, aiConfig);
    } else {
      throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
    }
  } catch (error) {
    console.error('[Forum AI] AI service call failed:', error.message);
    // 降级处理：返回基本优化结果
    return generateFallbackResult(title, description, targetLanguages);
  }
}

/**
 * 调用 Azure OpenAI 服务
 */
async function callAzureOpenAI(title, description, targetLanguages, action, config) {
  const { endpoint, apiKey, deploymentName } = config;
  
  const prompt = buildPrompt(title, description, targetLanguages, action);
  
  try {
    const response = await axios.post(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`,
      {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文化内容编辑和翻译助手。请提供优化和多语言翻译服务。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return parseAIResponse(response.data.choices[0].message.content, targetLanguages);
  } catch (error) {
    console.error('[Forum AI] Azure OpenAI error:', error.message);
    throw error;
  }
}

/**
 * 调用 OpenAI 服务
 */
async function callOpenAI(title, description, targetLanguages, action, config) {
  const { apiKey, model } = config;
  
  const prompt = buildPrompt(title, description, targetLanguages, action);
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文化内容编辑和翻译助手。请提供优化和多语言翻译服务。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return parseAIResponse(response.data.choices[0].message.content, targetLanguages);
  } catch (error) {
    console.error('[Forum AI] OpenAI error:', error.message);
    throw error;
  }
}

/**
 * 构建 AI 提示词
 */
function buildPrompt(title, description, targetLanguages, action) {
  const langList = targetLanguages.map(lang => `${lang}: ${SUPPORTED_LANGUAGES[lang].label}`).join(', ');
  
  let actionDesc = '';
  switch (action) {
    case 'optimize':
      actionDesc = '改进标题和描述，使其更吸引人、更简洁、更准确，同时保留原意。';
      break;
    case 'summarize':
      actionDesc = '总结标题和描述，提供2-3句的简化版本。';
      break;
    case 'translate':
      actionDesc = '将标题和描述翻译成指定的语言。';
      break;
  }
  
  return `
请${actionDesc}

原始标题: ${title}
原始描述: ${description}

目标语言: ${langList}

请返回 JSON 格式的结果，包含以下结构:
{
  "title_i18n": {
    "zh": "中文标题",
    "en": "English Title",
    ...
  },
  "description_i18n": {
    "zh": "中文描述",
    "en": "English Description",
    ...
  },
  "suggestions": ["建议1", "建议2", "建议3"]
}

注意:
1. 确保每个语言的内容都符合该语言的表达习惯
2. 长度不要太长，标题不超过100字，描述不超过300字
3. 对于文化相关的内容，保持准确性
`;
}

/**
 * 解析 AI 响应
 */
function parseAIResponse(content, targetLanguages) {
  try {
    // 尝试从响应中提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // 验证结构
    if (!parsed.title_i18n || !parsed.description_i18n) {
      throw new Error('Invalid response structure');
    }
    
    // 确保所有目标语言都包含
    for (let lang of targetLanguages) {
      if (!parsed.title_i18n[lang]) {
        parsed.title_i18n[lang] = '';
      }
      if (!parsed.description_i18n[lang]) {
        parsed.description_i18n[lang] = '';
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('[Forum AI] Failed to parse AI response:', error.message);
    throw error;
  }
}

/**
 * 获取 AI 配置
 */
function getAIConfig() {
  let config = {};
  try {
    config = require('../../config');
  } catch (e) {
    console.warn('[Forum AI] No config.js found');
  }
  
  return {
    enabled: config.AI_ENABLED || process.env.AI_ENABLED === 'true',
    provider: config.AI_PROVIDER || process.env.AI_PROVIDER || 'openai',
    endpoint: config.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: config.AZURE_OPENAI_KEY || config.OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || process.env.OPENAI_API_KEY,
    deploymentName: config.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT,
    model: config.OPENAI_MODEL || process.env.OPENAI_MODEL
  };
}

/**
 * 生成备选结果（当AI服务不可用时）
 * 简单的文本处理，不依赖AI服务
 */
function generateFallbackResult(title, description, targetLanguages) {
  const result = {
    title_i18n: {},
    description_i18n: {},
    suggestions: [
      '此结果由基本优化生成，未调用AI服务',
      '建议启用AI服务以获得更好的优化效果'
    ]
  };
  
  for (let lang of targetLanguages) {
    if (lang === 'zh') {
      result.title_i18n[lang] = title;
      result.description_i18n[lang] = description;
    } else {
      // 简单处理：标记为未翻译
      result.title_i18n[lang] = `[${lang.toUpperCase()}] ${title}`;
      result.description_i18n[lang] = `[${lang.toUpperCase()}] ${description}`;
    }
  }
  
  return result;
}

// ==================== 导出 ====================

module.exports = {
  aiSummarize,
  aiTranslate,
  getSupportedLanguages
};

