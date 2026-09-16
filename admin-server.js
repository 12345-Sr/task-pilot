const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const ADMIN_DIR = path.join(__dirname, 'admin');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.env': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  if (reqPath === '/' || reqPath === '/admin' || reqPath === '/admin/') {
    reqPath = '/index.html';
  } else if (reqPath.startsWith('/admin/')) {
    reqPath = reqPath.slice(6);
  }

  let filePath = path.join(ADMIN_DIR, reqPath);

  // Safety check against directory traversal
  if (!filePath.startsWith(ADMIN_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ADMIN_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[ADMIN PANEL] Live on port ${PORT}`);
  console.log(`[ADMIN PANEL] Serving from: ${ADMIN_DIR}`);
  console.log(`[ADMIN PANEL] Target Backend API: https://api-task-pilot.deificglobal.tech/api`);
});
