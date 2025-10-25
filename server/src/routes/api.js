const express = require('express');
const router = express.Router();

// ========== Import all modules ==========
const general = require('./modules/general');
const auth = require('./modules/auth');
const ai = require('./modules/ai');
const user = require('./modules/user');
const game = require('./modules/game');
const { upload, uploadHandler } = require('./modules/upload');
const forum = require('./modules/forum');
const forumAi = require('./modules/forum-ai');

// ========== General Routes ==========
router.get('/health', general.health);
router.get('/version', general.version);
router.get('/config', general.config);
router.get('/games', general.games);

// ========== Authentication Routes ==========
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

// ========== AI Routes ==========
router.post('/ai/generate', ai.generate);
router.post('/roleplay/character', ai.roleplayCharacter);
router.post('/roleplay/chat', ai.roleplayChat);
router.post('/story/chapter', ai.storyChapter);

// ========== User Routes ==========
router.get('/user/settings', user.getSettings);
router.post('/user/settings', user.saveSettings);
router.get('/user/stats', user.getStats);
router.get('/user/profile', user.getProfile);
router.post('/user/profile', user.updateProfile);

// ========== Game Routes ==========
router.get('/game/leaderboard', game.getLeaderboard);
router.post('/game/score', game.saveScore);
router.post('/statistics/playtime', game.savePlatimeSync);
router.post('/statistics/game-result', game.saveGameResult);

// ========== Upload Routes ==========
router.post('/upload', upload, uploadHandler);

// ========== Forum Routes ==========
// 标签管理
router.get('/forum/tags', forum.getTags);
router.post('/forum/tags', forum.createTag);
router.delete('/forum/tags/:tagId', forum.deleteTag);

// 论坛数据获取（前端专用）
router.get('/forum/gettaglist', forum.getTags);  // 获取所有有分享的标签
router.get('/forum/getcardinfo', forum.getShares);  // 获取卡片信息，支持按标签过滤

// 分享管理
router.get('/forum/shares', forum.getShares);
router.get('/forum/shares/:shareId', forum.getShareDetail);
router.post('/forum/shares', upload, forum.createShare);
router.put('/forum/shares/:shareId', upload, forum.updateShare);
router.delete('/forum/shares/:shareId', forum.deleteShare);

// 交互
router.post('/forum/shares/:shareId/like', forum.toggleLike);

// ========== Forum AI Routes ==========
router.post('/forum/ai-summarize', forumAi.aiSummarize);
router.post('/forum/ai-translate', forumAi.aiTranslate);
router.get('/forum/supported-languages', forumAi.getSupportedLanguages);

module.exports = router;
