const config = require('./config-loader');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const apiRouter = require('./routes/api');                    // Your original public API
const { requireAuth } = require('./auth/require-auth-middleware');
const currentUserRoute = require('./routes/current-user-route');
let profileInitRoute;
try { profileInitRoute = require('./routes/profile-init-route'); } catch (_) { /* Optional */ }
const knowledgeRoute = require('./routes/knowledge-route');

const PORT = config.PORT;

// Global middleware
app.use(cors());
app.use(express.json());

// Static files (keep your original behavior)
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Public API (keep your original behavior)
app.use('/api', apiRouter);

// Protected API: Requires Authorization: Bearer <token>
app.use('/api/auth', requireAuth, currentUserRoute);
if (profileInitRoute) app.use('/api/auth', requireAuth, profileInitRoute);
app.use('/api/knowledge', requireAuth, knowledgeRoute);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
