// webServer do Playwright: serve o BUILD do app AngularJS legado (gulp → ./build).
// Zero dependências de terceiros (http/fs nativos). Não toca src/js/**.
//
// O app é hashbang-routed (sem html5Mode): todas as rotas vivem em /#/...,
// então o servidor só precisa entregar arquivos estáticos — sem fallback SPA.
//
// A API RealWorld é interceptada no browser (page.route) pelos fixtures do
// Playwright; este servidor NÃO serve /api. Ver fixtures/test-fixtures.mjs.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = normalize(join(HERE, '..', '..', '..', 'build'));
const PORT = Number(process.env.E2E_PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const MISSING_BUILD = `<!doctype html><meta charset=utf-8><title>build ausente</title>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>Build do app ausente</h1>
<p>O E2E precisa do bundle do app legado. Gere-o antes de rodar o Playwright:</p>
<pre>npm install\nnpx gulp        # ou: npm run build (se configurado)</pre>
<p>Saída esperada: <code>build/index.html</code> + <code>build/main.js</code>.</p>
</body>`;

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    // bloqueia path traversal
    const target = normalize(join(BUILD_DIR, rel));
    if (!target.startsWith(BUILD_DIR)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const info = await stat(target);
      if (info.isDirectory()) { res.writeHead(403).end('forbidden'); return; }
    } catch {
      // index ausente → mensagem de build; outros → 404
      if (rel === '/index.html') { res.writeHead(503, { 'content-type': MIME['.html'] }).end(MISSING_BUILD); return; }
      res.writeHead(404).end('not found');
      return;
    }
    const data = await readFile(target);
    res.writeHead(200, { 'content-type': MIME[extname(target)] || 'application/octet-stream' }).end(data);
  } catch (err) {
    res.writeHead(500).end(String(err && err.message ? err.message : err));
  }
});

server.listen(PORT, () => {
  process.stdout.write(`[e2e] static app server on http://127.0.0.1:${PORT} (build: ${BUILD_DIR})\n`);
});
