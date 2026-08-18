#!/usr/bin/env node
/**
 * Static file server for local preview and for the Playwright suite.
 *
 * The site itself has no build step and no server requirement — this exists so
 * that tests and `npm run serve` behave identically on every machine, without
 * depending on a Python installation being present.
 *
 * Usage: node tools/serve.js [--port 8000] [--root .]
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function parseArgs(argv) {
  const args = { port: 8000, root: REPO_ROOT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--port') args.port = Number(argv[i + 1]);
    if (argv[i] === '--root') args.root = resolve(argv[i + 1]);
  }
  return args;
}

/** Resolve a request path to a file inside root, or null if it escapes root. */
function resolveWithinRoot(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const candidate = resolve(join(root, normalize(decoded)));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

export function createStaticServer(root = REPO_ROOT) {
  return createServer(async (req, res) => {
    let filePath = resolveWithinRoot(root, req.url ?? '/');
    if (!filePath) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    try {
      let info = await stat(filePath);
      if (info.isDirectory()) {
        filePath = join(filePath, 'index.html');
        info = await stat(filePath);
      }
      res.writeHead(200, {
        'content-type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'content-length': info.size,
        'cache-control': 'no-store',
      });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const { port, root } = parseArgs(process.argv.slice(2));
  createStaticServer(root).listen(port, () => {
    process.stdout.write(`Cosmos served from ${root}\n  http://localhost:${port}/\n`);
  });
}
