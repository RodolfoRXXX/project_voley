"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const WebSocket = require(path.join(process.env.APPDATA, "npm", "node_modules", "firebase-tools", "node_modules", "ws"));

const frontendRoot = path.resolve(__dirname, "..");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "sportexa-iux-09-layout-"));
const evidenceRoot = path.join(os.tmpdir(), "sportexa-iux-09-layout-evidence");
const width = Number(process.env.IUX_VIEWPORT_WIDTH || 390);
const height = width === 360 ? 800 : width === 390 ? 844 : 900;
const port = 33400 + (width % 100);
const debuggingPort = 39500 + (width % 100);
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitHttp = async (url, timeout = 60000) => { const started = Date.now(); while (true) { try { await new Promise((resolve, reject) => http.get(url, (response) => { response.resume(); resolve(); }).on("error", reject)); return; } catch (error) { if (Date.now() - started > timeout) throw error; await wait(200); } } };
const requestJson = (url, method = "GET") => new Promise((resolve, reject) => { const request = http.request(url, { method }, (response) => { let body = ""; response.on("data", (chunk) => { body += chunk; }); response.on("end", () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } }); }); request.on("error", reject); request.end(); });
const connect = (url) => new Promise((resolve, reject) => { const socket = new WebSocket(url); const pending = new Map(); let id = 0; socket.on("open", () => resolve({ call(method, params = {}) { return new Promise((resolveCall, rejectCall) => { const callId = ++id; pending.set(callId, { resolve: resolveCall, reject: rejectCall }); socket.send(JSON.stringify({ id: callId, method, params })); }); }, close() { socket.close(); } })); socket.on("message", (data) => { const message = JSON.parse(String(data)); const entry = pending.get(message.id); if (!entry) return; pending.delete(message.id); if (message.error) entry.reject(new Error(JSON.stringify(message.error))); else entry.resolve(message.result); }); socket.on("error", reject); });

let server;
let browser;
(async () => {
  try {
    fs.cpSync(frontendRoot, workspace, { recursive: true, filter(source) { const relative = path.relative(frontendRoot, source); return !relative.startsWith("node_modules") && !relative.startsWith(".next"); } });
    fs.rmSync(path.join(workspace, "node_modules"), { recursive: true, force: true });
    fs.symlinkSync(path.join(frontendRoot, "node_modules"), path.join(workspace, "node_modules"), "junction");
    fs.rmSync(path.join(workspace, "src", "app"), { recursive: true, force: true });
    fs.mkdirSync(path.join(workspace, "src", "app"), { recursive: true });
    for (const file of ["layout.tsx", "page.tsx"]) fs.copyFileSync(path.join(frontendRoot, "test", "iux-09-layout-browser-fixture", file), path.join(workspace, "src", "app", file));
    fs.copyFileSync(path.join(frontendRoot, "src", "app", "globals.css"), path.join(workspace, "src", "app", "globals.css"));
    fs.copyFileSync(path.join(frontendRoot, "test", "iux-07-browser-fixture", "useAuth.ts"), path.join(workspace, "src", "hooks", "useAuth.ts"));
    server = spawn(process.execPath, [path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next"), "dev", "--webpack", "-H", "127.0.0.1", "-p", String(port)], { cwd: workspace, shell: false, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: "ignore" });
    await waitHttp(`http://127.0.0.1:${port}`);
    browser = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-first-run", "--disable-background-networking", `--remote-debugging-port=${debuggingPort}`, `--user-data-dir=${path.join(workspace, "chrome-profile")}`, "about:blank"], { cwd: workspace, shell: false, stdio: "ignore" });
    await waitHttp(`http://127.0.0.1:${debuggingPort}/json/version`, 30000);
    const target = await requestJson(`http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}`)}`, "PUT");
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await wait(1200);
    const evaluation = await cdp.call("Runtime.evaluate", { expression: `(() => { const views = [...document.querySelectorAll('[data-view]')].map((view) => { const title = view.querySelector('h1'); const back = [...view.querySelectorAll('a')].find((link) => link.textContent.trim() === '← Volver'); const style = title ? getComputedStyle(title) : null; return { id: view.dataset.view, titleX: title?.getBoundingClientRect().x, fontSize: style?.fontSize, fontWeight: style?.fontWeight, backX: back?.getBoundingClientRect().x }; }); const profile = views.filter((view) => ['summary','person','obligations'].includes(view.id)); const titleXs = views.map((view) => view.titleX); const profileStyles = new Set(profile.map((view) => view.fontSize + '/' + view.fontWeight)); const returnViews = views.filter((view) => ['person','obligations'].includes(view.id)); const assertions = { sixViews: views.length === 6, alignedTitles: Math.max(...titleXs) - Math.min(...titleXs) < 1, normalizedProfileTitles: profileStyles.size === 1, alignedProfileReturns: returnViews[0].backX === returnViews[1].backX, noHorizontalOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth }; return { passed: Object.values(assertions).every(Boolean), assertions, views, viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth } }; })()`, returnByValue: true });
    if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.exception?.description || "browser evaluation failed");
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const screenshot = await cdp.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    const screenshotPath = path.join(evidenceRoot, `layout-${width}x${height}.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
    const evidence = { ...evaluation.result.value, screenshotPath };
    process.stdout.write(`IUX_09_LAYOUT_EVIDENCE=${JSON.stringify(evidence)}\n`);
    if (!evidence.passed) process.exitCode = 1;
    await cdp.call("Browser.close").catch(() => {});
    cdp.close();
  } finally {
    if (browser?.exitCode === null) browser.kill();
    if (server?.exitCode === null) server.kill();
    for (let attempt = 0; attempt < 20; attempt += 1) { try { fs.rmSync(workspace, { recursive: true, force: true }); break; } catch (error) { if (attempt === 19) throw error; await wait(250); } }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
