#!/usr/bin/env node
/**
 * Local preview server that behaves like GitHub Pages (no dependencies):
 * clean URLs, trailing-slash redirects for folders, and 404.html for missing pages.
 *
 *   node scripts/serve.mjs                       serve dist/ at http://localhost:4173/
 *   node scripts/serve.mjs --watch               rebuild when content/ or src/ changes
 *   node scripts/serve.mjs --base /portfolio/    serve under a project-site path
 *   node scripts/serve.mjs --port 8080 --dir dist
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

/** Serve under the same path as the public site (e.g. /portfolio/ for a project site). */
function defaultBase() {
  if (process.env.BASE_PATH) return process.env.BASE_PATH;
  try {
    const site = JSON.parse(readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));
    if (site.launch?.siteUrl) return new URL(site.launch.siteUrl).pathname;
  } catch {
    // Fall back to the root path.
  }
  return '/';
}

function parseArgs(argv) {
  const args = { port: Number(process.env.PORT) || 4173, dir: 'dist', base: defaultBase(), watch: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--watch') args.watch = true;
    else if (arg === '--port') args.port = Number(argv[(i += 1)]);
    else if (arg === '--dir') args.dir = argv[(i += 1)];
    else if (arg === '--base') args.base = argv[(i += 1)];
    else throw new Error(`Unknown option: ${arg}`);
  }
  const trimmed = args.base.replace(/^\/+|\/+$/g, '');
  args.base = trimmed ? `/${trimmed}/` : '/';
  return args;
}

const args = parseArgs(process.argv.slice(2));
const distDir = path.resolve(ROOT, args.dir);

function send(res, status, file, headers = {}) {
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
    ...headers,
  });
  createReadStream(file).pipe(res);
}

function notFound(res) {
  const page = path.join(distDir, '404.html');
  if (existsSync(page)) send(res, 404, page);
  else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return notFound(res);
  }

  if (pathname === '/' && args.base !== '/') {
    res.writeHead(302, { Location: args.base });
    return res.end();
  }
  if (!`${pathname}/`.startsWith(args.base)) return notFound(res);

  const relative = pathname.slice(args.base.length - 1);
  const file = path.join(distDir, relative);
  if (!file.startsWith(distDir)) return notFound(res);

  if (existsSync(file) && statSync(file).isDirectory()) {
    // Like GitHub Pages: /work/globalid → 301 → /work/globalid/
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${pathname}/${url.search}` });
      return res.end();
    }
    const index = path.join(file, 'index.html');
    return existsSync(index) ? send(res, 200, index) : notFound(res);
  }
  if (existsSync(file)) return send(res, 200, file);
  if (existsSync(`${file}.html`)) return send(res, 200, `${file}.html`);
  return notFound(res);
});

/** Runs the build in a fresh process, so changes to templates are picked up too. */
function rebuild() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), '--out', args.dir, '--base-path', args.base], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    child.stdout.on('data', () => {});
    child.on('close', (code) => {
      if (code === 0) console.log(`Rebuilt at ${new Date().toLocaleTimeString()}`);
      else console.error('Build failed (see the message above). Fix the problem and save again.');
      resolve(code);
    });
  });
}

if (args.watch) {
  await rebuild();
  let timer;
  for (const dir of ['content', 'src']) {
    watch(path.join(ROOT, dir), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(rebuild, 150);
    });
  }
} else if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error(`No build found in ${args.dir}/. Run "npm run build" first, or use --watch.`);
  process.exit(1);
}

server.listen(args.port, () => {
  console.log(`Previewing ${args.dir}/ at http://localhost:${args.port}${args.base}`);
  if (args.watch) console.log('Watching content/ and src/ for changes. Refresh the browser after each rebuild.');
  console.log('Press Ctrl+C to stop.');
});
