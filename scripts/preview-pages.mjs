import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const root = resolve('docs');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
createServer(async (req, res) => {
 try {
  const url = new URL(req.url, 'http://localhost');
  const prefix = '/hr-change-game/';
  if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
  const path = resolve(root, relative);
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  const content = await readFile(path);
  const ext = path.slice(path.lastIndexOf('.'));
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); res.end(content);
 } catch { res.writeHead(404).end(); }
}).listen(3012, '127.0.0.1', () => console.log('Pages preview: http://127.0.0.1:3012/hr-change-game/'));
