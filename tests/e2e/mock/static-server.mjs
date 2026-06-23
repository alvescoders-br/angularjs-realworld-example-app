// webServer do Playwright: serve o build do app Angular 21 migrado (`app/dist/.../browser`).
// Zero dependências de terceiros (http/fs nativos). Não toca `src/js/**`.
//
// O app usa History API/path routing, então rotas sem extensão devem cair em
// `index.html` (SPA fallback). A API RealWorld continua interceptada no browser
// (`page.route`) pelos fixtures do Playwright; este servidor NÃO serve `/api`.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = normalize(
  join(HERE, '..', '..', '..', 'app', 'dist', 'conduit-angular-21', 'browser')
);
const INDEX_FILE = join(BUILD_DIR, 'index.html');
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
<h1>Build do app Angular ausente</h1>
<p>O E2E da S4 precisa do bundle do app migrado. Gere-o antes de rodar o Playwright:</p>
<pre>npm run build --prefix app</pre>
<p>Saída esperada: <code>app/dist/conduit-angular-21/browser/index.html</code>.</p>
</body>`;

async function tryReadFile(target) {
  const info = await stat(target);
  if (info.isDirectory()) {
    throw new Error('directory');
  }

  return readFile(target);
}

async function readResponse(relPath) {
  const safeTarget = normalize(join(BUILD_DIR, relPath));
  if (!safeTarget.startsWith(BUILD_DIR)) {
    return { status: 403, body: Buffer.from('forbidden') };
  }

  try {
    const data = await tryReadFile(safeTarget);
    return {
      status: 200,
      contentType: MIME[extname(safeTarget)] || 'application/octet-stream',
      body: data,
    };
  } catch {
    if (extname(relPath) === '') {
      try {
        const data = await readFile(INDEX_FILE);
        return {
          status: 200,
          contentType: MIME['.html'],
          body: data,
        };
      } catch {
        return {
          status: 503,
          contentType: MIME['.html'],
          body: Buffer.from(MISSING_BUILD),
        };
      }
    }

    if (relPath === '/index.html') {
      return {
        status: 503,
        contentType: MIME['.html'],
        body: Buffer.from(MISSING_BUILD),
      };
    }

    return { status: 404, body: Buffer.from('not found') };
  }
}

const server = createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (rel === '/' || rel === '') {
      rel = '/index.html';
    }

    const response = await readResponse(rel);
    const headers = response.contentType
      ? { 'content-type': response.contentType }
      : undefined;

    res.writeHead(response.status, headers).end(response.body);
  } catch (err) {
    res.writeHead(500).end(String(err && err.message ? err.message : err));
  }
});

server.listen(PORT, () => {
  process.stdout.write(`[e2e] static app server on http://127.0.0.1:${PORT} (build: ${BUILD_DIR})\n`);
});
