require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const apiRouter = require('./routes/api');                    // 你原来的公开 API
const { requireAuth } = require('./auth/require-auth-middleware');
const currentUserRoute = require('./routes/current-user-route');
let profileInitRoute;
try { profileInitRoute = require('./routes/profile-init-route'); } catch (_) { /* 可选 */ }

const PORT = process.env.PORT || 3030;

// 全局中间件
app.use(cors());
app.use(express.json());

// 静态文件（保持你原有行为）
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// 公开 API（保持你原有行为）
app.use('/api', apiRouter);

// 受保护 API：需要携带 Authorization: Bearer <token>
app.use('/api/auth', requireAuth, currentUserRoute);
if (profileInitRoute) app.use('/api/auth', requireAuth, profileInitRoute);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
