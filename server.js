// A server that exists purely so the browser will allow the microphone.
//
// Chrome permits speech recognition over https or on localhost, but a page
// opened by double-clicking the file (file://) is never let near a
// microphone. Hence this file: serve a couple of folders and get out of the
// way.
//
//   node server.js   →   http://localhost:8080
//
// No dependencies, deliberately. Installing npm packages to hand out static
// files is something you end up explaining to yourself a year later, while
// staring at 200 MB of node_modules.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Serve what is listed, not whatever happens to sit next to the server. A
// good habit: today it is a toy on your own machine, tomorrow someone runs
// the same thing on a network with private files in the same folder.
const DIRS = ['/assets/', '/tools/'];
const FILES = ['/', '/index.html', '/favicon.ico'];

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? '/index.html' : url;

  const allowed = FILES.includes(url) || DIRS.some((d) => url.startsWith(d));
  if (!allowed) return end(res, 404, 'not found');

  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep)) return end(res, 403, 'forbidden');

  fs.readFile(file, (err, body) => {
    if (err) return end(res, 404, 'not found');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      // No caching: edit a file, reload the page, see the change.
      'Cache-Control': 'no-store'
    });
    res.end(body);
  });
}).listen(PORT, () => {
  console.log(`Bip is waiting: http://localhost:${PORT}`);
  console.log('The microphone only works in Chrome or Edge.');
});

function end(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}
