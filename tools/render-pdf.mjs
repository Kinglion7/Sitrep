#!/usr/bin/env node
/* Render a draft to a Letter PDF (and optional per-page PNGs) with headless
 * Chrome or Edge, no print dialog.
 *
 *   node tools/render-pdf.mjs drafts/<issue>.json [out.pdf] [--png <dir>]
 *
 * Starts a throwaway static server for the repo, opens editor/?draft=…&zoom=1,
 * waits for fonts and the first render, then asks Chrome for the PDF via the
 * DevTools protocol. Needs Node 20+ and Chrome or Edge installed.
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".enc": "application/octet-stream", ".svg": "image/svg+xml",
};

/** Serve ROOT on 127.0.0.1:<random>. Returns { url, close }. */
export function serve(root = ROOT) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = resolve(root, "." + p);
    if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404); res.end("not found"); return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(readFileSync(file));
  });
  return new Promise((res) => {
    server.listen(0, "127.0.0.1", () => res({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }));
  });
}

function findBrowser() {
  const c = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const found = c.find((p) => existsSync(p));
  if (!found) throw new Error("Chrome/Edge not found; set CHROME_PATH");
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) this.events.push(m);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception || {}));
    return r.result.value;
  }
  async waitFor(expr, timeout = 30000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await this.eval(expr)) return true;
      await sleep(150);
    }
    throw new Error("timeout waiting for " + expr);
  }
}

/** Launch headless Chrome, run fn(cdp), always clean up. */
export async function withBrowser(fn, { width = 1700, height = 1200 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = join(tmpdir(), "wolfpack-chrome-" + port);
  const chrome = spawn(findBrowser(), [
    "--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check",
    "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${height}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  try {
    let targets = null;
    for (let i = 0; i < 60 && !targets; i++) {
      await sleep(250);
      try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch (_) { /* not up yet */ }
    }
    if (!targets) throw new Error("Chrome did not start");
    const page = targets.find((t) => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new CDP(ws);
    cdp.viewport = { width, height };
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    return await fn(cdp);
  } finally {
    chrome.kill();
  }
}

export async function pdfOf(cdp) {
  const r = await cdp.send("Page.printToPDF", {
    printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  });
  return Buffer.from(r.data, "base64");
}

export async function pagePngs(cdp) {
  // Clips far below the viewport come back empty, so grow the viewport to the
  // whole document for the capture, then put it back.
  const { width, height } = cdp.viewport || { width: 1700, height: 1200 };
  // The editor scrolls inside #previewPane, so size the viewport to the pane's content, not just the document.
  const docH = await cdp.eval("(function(){ const pane = document.getElementById('previewPane'); return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, pane ? pane.scrollHeight + 120 : 0); })()");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: Math.min(docH + 50, 16000), deviceScaleFactor: 1, mobile: false });
  await sleep(200);
  const rects = await cdp.eval(`Array.from(document.querySelectorAll('.wp-page-wrap')).map(e => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })`);
  const out = [];
  for (const r of rects) {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
    out.push(Buffer.from(shot.data, "base64"));
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const draft = args[0];
  if (!draft) { console.error("usage: node tools/render-pdf.mjs drafts/<issue>.json [out.pdf] [--png <dir>]"); process.exit(1); }
  const pngIdx = args.indexOf("--png");
  const pngDir = pngIdx >= 0 ? args[pngIdx + 1] : null;
  const positional = args.filter((a, i) => a !== "--png" && i !== pngIdx + 1);
  const out = positional[1] || draft.replace(/\.json$/i, "") + ".pdf";

  const draftAbs = resolve(draft);
  if (!draftAbs.startsWith(ROOT)) throw new Error("draft must live inside the repo folder (drafts/ is fine)");
  const rel = draftAbs.slice(ROOT.length).replace(/\\/g, "/");
  const srv = await serve();
  try {
    await withBrowser(async (cdp) => {
      await cdp.send("Page.navigate", { url: `${srv.url}/editor/?draft=..${rel}&zoom=1` });
      await cdp.waitFor("window.__wpReady === true && document.fonts.status === 'loaded'");
      await sleep(400);
      const problems = await cdp.eval(`Array.from(document.querySelectorAll('#status li')).map(li => li.textContent)`);
      for (const p of problems) console.warn("layout: " + p);
      writeFileSync(out, await pdfOf(cdp));
      console.log("wrote " + out);
      if (pngDir) {
        mkdirSync(pngDir, { recursive: true });
        const pngs = await pagePngs(cdp);
        pngs.forEach((b, i) => writeFileSync(join(pngDir, `page-${i + 1}.png`), b));
        console.log(`wrote ${pngs.length} PNGs to ${pngDir}`);
      }
    }, { width: 1700, height: 1200 });
  } finally {
    srv.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
