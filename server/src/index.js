const path = require('path');
const express = require('express');
const app = express();
const apiRouter = require('./routes/api');

const PORT = process.env.PORT || 3030;

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// JSON body parsing
app.use(express.json());

// API
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
