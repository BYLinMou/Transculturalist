const express = require('express');
const router = express.Router();

// ========== Import all modules ==========
const general = require('./modules/general');
const auth = require('./modules/auth');
const ai = require('./modules/ai');
const user = require('./modules/user');
const game = require('./modules/game');
const { upload, uploadHandler } = require('./modules/upload');

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

// ========== Upload Routes ==========
router.post('/upload', upload, uploadHandler);

module.exports = router;
