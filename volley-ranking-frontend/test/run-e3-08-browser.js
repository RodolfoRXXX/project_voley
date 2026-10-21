"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const WebSocket = require(path.join(process.env.APPDATA, "npm", "node_modules", "firebase-tools", "node_modules", "ws"));

const frontendRoot = path.resolve(__dirname, "..");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "sportexa-e3-08-browser-"));
const port = 33108;
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debuggingPort = 39222;

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const probe = () => {
      http.get(`http://127.0.0.1:${port}`, (response) => {
        response.resume();
        resolve();
      }).on("error", () => {
        if (Date.now() - started > 60000) reject(new Error("Next test server did not start"));
        else setTimeout(probe, 250);
      });
    };
    probe();
  });
}

function requestJson(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on("error", reject); request.end();
  });
}

async function waitForDevtools() {
  const started = Date.now();
  while (true) {
    try { return await requestJson(`http://127.0.0.1:${debuggingPort}/json/version`); }
    catch (error) {
      if (Date.now() - started > 30000) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map(); let id = 0;
    socket.on("open", () => resolve({
      call(method, params = {}) {
        return new Promise((resolveCall, rejectCall) => {
          const callId = ++id; pending.set(callId, { resolve: resolveCall, reject: rejectCall });
          socket.send(JSON.stringify({ id: callId, method, params }));
        });
      }, close() { socket.close(); },
    }));
    socket.on("message", (data) => {
      const message = JSON.parse(String(data));
      if (!message.id || !pending.has(message.id)) return;
      const promise = pending.get(message.id); pending.delete(message.id);
      if (message.error) promise.reject(new Error(JSON.stringify(message.error)));
      else promise.resolve(message.result);
    });
    socket.on("error", reject);
  });
}

let server;
let browser;
(async () => {
  try {
    fs.cpSync(frontendRoot, workspace, { recursive: true, filter(source) {
      const relative = path.relative(frontendRoot, source);
      return !relative.startsWith("node_modules") && !relative.startsWith(".next")
        && !relative.startsWith("test\\e3-08-browser-fixture");
    } });
    fs.rmSync(path.join(workspace, "node_modules"), { recursive: true, force: true });
    fs.symlinkSync(path.join(frontendRoot, "node_modules"), path.join(workspace, "node_modules"), "junction");
    fs.rmSync(path.join(workspace, "src", "app"), { recursive: true, force: true });
    fs.mkdirSync(path.join(workspace, "src", "app", "api", "e3-browser-data"), { recursive: true });
    fs.copyFileSync(path.join(frontendRoot, "test", "e3-08-browser-fixture", "layout.tsx"), path.join(workspace, "src", "app", "layout.tsx"));
    fs.copyFileSync(path.join(frontendRoot, "test", "e3-08-browser-fixture", "page.tsx"), path.join(workspace, "src", "app", "page.tsx"));
    fs.copyFileSync(path.join(frontendRoot, "src", "app", "globals.css"), path.join(workspace, "src", "app", "globals.css"));
    fs.copyFileSync(path.join(frontendRoot, "test", "e3-08-browser-fixture", "api", "route.ts"), path.join(workspace, "src", "app", "api", "e3-browser-data", "route.ts"));
    server = spawn(process.execPath, [path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next"),
      "dev", "--webpack", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: workspace, shell: false, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_FIREBASE_API_KEY: "synthetic-e3-08", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-sportexa-e3-08-browser" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForServer();
    const profile = path.join(workspace, "chrome-profile");
    browser = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-first-run",
      "--disable-background-networking", "--enable-precise-memory-info",
      `--remote-debugging-port=${debuggingPort}`, `--user-data-dir=${profile}`, "about:blank"],
    { cwd: workspace, shell: false, stdio: "ignore" });
    await waitForDevtools();
    const target = await requestJson(`http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}`)}`, "PUT");
    const cdp = await connectCdp(target.webSocketDebuggerUrl);
    let resultText = "PENDING";
    const started = Date.now();
    while (resultText === "PENDING") {
      if (Date.now() - started > 30000) throw new Error("Browser result timed out");
      const evaluation = await cdp.call("Runtime.evaluate", { expression:
        "document.querySelector('#e3-browser-results')?.textContent || 'PENDING'", returnByValue: true });
      resultText = evaluation.result.value;
      if (resultText === "PENDING") await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const heap = await cdp.call("Runtime.getHeapUsage");
    const evidence = JSON.parse(resultText);
    evidence.measurements.cdpHeapUsedBytes = heap.usedSize;
    evidence.measurements.cdpHeapTotalBytes = heap.totalSize;
    process.stdout.write(`E3_08_BROWSER_EVIDENCE=${JSON.stringify(evidence)}\n`);
    if (!evidence.passed) process.exitCode = 1;
    await cdp.call("Browser.close").catch(() => {});
    cdp.close();
  } finally {
    if (browser && browser.exitCode === null) {
      browser.kill();
      await Promise.race([new Promise((resolve) => browser.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000))]);
    }
    if (server && server.exitCode === null) {
      server.kill();
      await Promise.race([new Promise((resolve) => server.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000))]);
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try { fs.rmSync(workspace, { recursive: true, force: true }); break; }
      catch (error) { if (attempt === 19) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250)); }
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
