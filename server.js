// Сервер только для того, чтобы браузер пустил к микрофону.
//
// Chrome разрешает распознавание речи по https или с localhost, а страницу,
// открытую двойным щелчком (file://), к микрофону не подпускает. Отсюда и
// этот файл: раздать три папки и уйти.
//
//   node server.js   →   http://localhost:8080
//
// Зависимостей нет намеренно: ставить npm-пакеты ради отдачи статики — это
// потом объяснять себе через год, зачем в проекте node_modules на 200 МБ.
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

// Отдаём перечисленное, а не всё, что лежит рядом. Привычка полезная:
// сегодня это игрушка на своей машине, а завтра тот же сервер поднимут
// в сети, и рядом окажется что-нибудь личное.
const DIRS = ['/assets/', '/tools/'];
const FILES = ['/', '/index.html', '/favicon.ico'];

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? '/index.html' : url;

  const allowed = FILES.includes(url) || DIRS.some((d) => url.startsWith(d));
  if (!allowed) return end(res, 404, 'не найдено');

  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep)) return end(res, 403, 'нельзя');

  fs.readFile(file, (err, body) => {
    if (err) return end(res, 404, 'не найдено');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      // Кэш выключен: правишь файл — обновляешь страницу и сразу видишь.
      'Cache-Control': 'no-store'
    });
    res.end(body);
  });
}).listen(PORT, () => {
  console.log(`Бип ждёт: http://localhost:${PORT}`);
  console.log('Микрофон работает только в Chrome или Edge.');
});

function end(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}
