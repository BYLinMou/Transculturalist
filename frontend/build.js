const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Read CSS
const cssPath = path.join(publicDir, 'assets', 'styles.css');
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

// Read app-content (ES module exporting a template string)
const appContentPath = path.join(publicDir, 'assets', 'app-content.js');
let appHtml = '';
if (fs.existsSync(appContentPath)) {
  const content = fs.readFileSync(appContentPath, 'utf8');
  // crude extraction of the template literal inside export default `...`
  const match = content.match(/export default `([\s\S]*)`;/);
  if (match) appHtml = match[1];
}

// Read app.js and strip ESM import of app-content and the mount assignment
const appJsPath = path.join(publicDir, 'assets', 'app.js');
let appJs = fs.existsSync(appJsPath) ? fs.readFileSync(appJsPath, 'utf8') : '';
// Remove `import gameHtml from './app-content.js';` since we inline the HTML
appJs = appJs.replace(/import\s+[^;]+from\s+['"]\.\/app-content\.js['"];?\s*/g, '');
// Remove mounting lines that reference gameHtml (we already injected the HTML)
appJs = appJs.replace(/const\s+mount\s*=\s*document\.getElementById\(['"]app['"]\);\s*mount\.innerHTML\s*=\s*gameHtml;\s*/g, '');

// Build a single index.html
const indexHtml = `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>文化探索遊戲平台</title>
    <link rel="stylesheet" href="/assets/styles.css">
  </head>
  <body class="gradient-bg min-h-screen text-white">
    <div id="app">載入中...</div>

    <script>
      // Landing page for demo: redirect to static demo culture selection
      if (location.pathname === '/' || location.pathname.endsWith('/index.html')) {
        // static files are served from the server root, so request /culture-selection.html
        window.location.href = '/culture-selection.html';
      }
    </script>
  </body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');
console.log('Built frontend to', path.join(distDir, 'index.html'));
