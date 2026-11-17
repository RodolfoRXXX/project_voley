"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const WebSocket = require(path.join(process.env.APPDATA, "npm", "node_modules", "firebase-tools", "node_modules", "ws"));
const frontendRoot = path.resolve(__dirname, "..");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "sportexa-iux-07-browser-"));
const viewportWidth = Number(process.env.IUX_VIEWPORT_WIDTH || 390);
const viewportHeight = Number(process.env.IUX_VIEWPORT_HEIGHT || (viewportWidth === 360 ? 800 : viewportWidth === 390 ? 844 : 900));
const port = 33207 + (viewportWidth % 100);
const debuggingPort = 39307 + (viewportWidth % 100);
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const requestJson = (url, method = "GET") => new Promise((resolve, reject) => {
  const request = http.request(url, { method }, (response) => {
    let body = "";
    response.on("data", (chunk) => { body += chunk; });
    response.on("end", () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  });
  request.on("error", reject);
  request.end();
});
const waitHttp = async (url, timeout = 60000) => {
  const started = Date.now();
  while (true) {
    try {
      await new Promise((resolve, reject) => http.get(url, (response) => { response.resume(); resolve(); }).on("error", reject));
      return;
    } catch (error) {
      if (Date.now() - started > timeout) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
};
const connect = (url) => new Promise((resolve, reject) => {
  const socket = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  socket.on("open", () => resolve({
    call(method, params = {}) {
      return new Promise((resolveCall, rejectCall) => {
        const callId = ++id;
        pending.set(callId, { resolve: resolveCall, reject: rejectCall });
        socket.send(JSON.stringify({ id: callId, method, params }));
      });
    },
    close() { socket.close(); },
  }));
  socket.on("message", (data) => {
    const message = JSON.parse(String(data));
    const promise = pending.get(message.id);
    if (!promise) return;
    pending.delete(message.id);
    if (message.error) promise.reject(new Error(JSON.stringify(message.error)));
    else promise.resolve(message.result);
  });
  socket.on("error", reject);
});

let server;
let browser;
(async () => {
  try {
    fs.cpSync(frontendRoot, workspace, {
      recursive: true,
      filter(source) {
        const relative = path.relative(frontendRoot, source);
        return !relative.startsWith("node_modules") && !relative.startsWith(".next");
      },
    });
    fs.rmSync(path.join(workspace, "node_modules"), { recursive: true, force: true });
    fs.symlinkSync(path.join(frontendRoot, "node_modules"), path.join(workspace, "node_modules"), "junction");
    fs.copyFileSync(path.join(frontendRoot, "src", "app", "page.tsx"), path.join(workspace, "src", "components", "Iux07HomeUnderTest.tsx"));
    fs.rmSync(path.join(workspace, "src", "app"), { recursive: true, force: true });
    fs.mkdirSync(path.join(workspace, "src", "app"), { recursive: true });
    fs.copyFileSync(path.join(frontendRoot, "test", "iux-07-browser-fixture", "layout.tsx"), path.join(workspace, "src", "app", "layout.tsx"));
    const fixturePage = fs.readFileSync(path.join(frontendRoot, "test", "iux-07-browser-fixture", "page.tsx"), "utf8")
      .replace("@/app/page", "@/components/Iux07HomeUnderTest");
    fs.writeFileSync(path.join(workspace, "src", "app", "page.tsx"), fixturePage);
    fs.copyFileSync(path.join(frontendRoot, "src", "app", "globals.css"), path.join(workspace, "src", "app", "globals.css"));
    fs.copyFileSync(path.join(frontendRoot, "test", "iux-07-browser-fixture", "useAuth.ts"), path.join(workspace, "src", "hooks", "useAuth.ts"));

    server = spawn(process.execPath, [path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next"), "dev", "--webpack", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: workspace,
      shell: false,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "ignore",
    });
    await waitHttp(`http://127.0.0.1:${port}`);
    browser = spawn(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-background-networking",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${path.join(workspace, "chrome-profile")}`,
      "about:blank",
    ], { cwd: workspace, shell: false, stdio: "ignore" });
    await waitHttp(`http://127.0.0.1:${debuggingPort}/json/version`, 30000);
    const target = await requestJson(`http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}`)}`, "PUT");
    const cdp = await connect(target.webSocketDebuggerUrl);
    await cdp.call("Emulation.setDeviceMetricsOverride", { width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1, mobile: viewportWidth < 768 });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const evaluation = await cdp.call("Runtime.evaluate", {
      expression: `(${async ({ width }) => {
        const waitFor = async (predicate) => {
          const started = performance.now();
          while (!predicate()) {
            if (performance.now() - started > 5000) throw new Error("browser assertion timeout");
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
        };
        const forbidden = ["/tournaments", "/profile/tournaments", "/admin/tournaments"];
        const allLinks = () => [...document.querySelectorAll("a")];
        const visibleText = () => document.body.innerText;
        const assertions = {
          agreedTitle: document.querySelector("h1")?.textContent?.trim() === "Gestioná tu grupo deportivo",
          agreedCopy: visibleText().includes("Creá tu grupo, organizá a sus integrantes y llevá el seguimiento de las cuotas y los pagos. Si querés sumarte a un grupo, podés explorar los publicados y solicitar el ingreso."),
          authenticatedCta: allLinks().some((link) => link.textContent?.trim() === "Ir a Mis grupos" && link.getAttribute("href") === "/dashboard/groups"),
          retiredHomeBlocks: !visibleText().includes("Torneos vigentes") && !visibleText().includes("Próximos partidos"),
          noTournamentLinks: !allLinks().some((link) => forbidden.some((href) => link.getAttribute("href")?.startsWith(href))),
          noHorizontalOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
        };
        if (width >= 768) {
          const sidebar = document.querySelector("aside");
          assertions.desktopSidebarVisible = sidebar && getComputedStyle(sidebar).display !== "none";
          const sidebarText = sidebar?.textContent || "";
          assertions.desktopInventory = sidebarText.includes("Mis grupos") && sidebarText.includes("Explorar grupos") && sidebarText.includes("Mi perfil") && !sidebarText.includes("Torneos") && !sidebarText.includes("Mi gestión");
          const profileButton = [...(sidebar?.querySelectorAll("button") || [])].find((button) => button.textContent?.includes("Mi perfil"));
          profileButton?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const profileLinks = [...(sidebar?.querySelectorAll("a") || [])].filter((link) => ["/profile/info", "/profile/person", "/dashboard/obligations"].includes(link.getAttribute("href") || ""));
          assertions.desktopProfileNavigation = profileLinks.length === 3;
          const accountButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Cuenta administradora");
          assertions.adminAccountButton = Boolean(accountButton);
          for (let attempt = 0; accountButton && accountButton.getAttribute("aria-expanded") !== "true" && attempt < 20; attempt += 1) {
            accountButton.click();
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const accountMenuLinks = allLinks().filter((link) => link.closest("nav") && link.getAttribute("href") === "/dashboard");
          assertions.adminAccountMenu = accountButton?.getAttribute("aria-expanded") === "true" && accountMenuLinks.length >= 1 && !allLinks().some((link) => forbidden.some((href) => link.getAttribute("href")?.startsWith(href)));
        } else {
          const menuButton = document.querySelector('button[aria-label="Abrir menú"]');
          menuButton?.click();
          await waitFor(() => visibleText().includes("Explorar grupos"));
          assertions.mobileAdminInventory = visibleText().includes("Mis grupos") && visibleText().includes("Explorar grupos") && visibleText().includes("Mi perfil") && !visibleText().includes("Torneos") && !visibleText().includes("Mi gestión");
          const profileButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Mi perfil"));
          profileButton?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          const profileLinks = allLinks().filter((link) => ["/profile/info", "/profile/person", "/dashboard/obligations"].includes(link.getAttribute("href") || ""));
          assertions.mobileProfileNavigation = profileLinks.length === 3;
          const explore = allLinks().find((link) => link.textContent?.trim() === "Explorar grupos");
          assertions.canonicalExploreRoute = explore?.getAttribute("href") === "/dashboard/groups/explore";
          explore?.addEventListener("click", (event) => event.preventDefault(), { once: true });
          explore?.click();
          await new Promise((resolve) => setTimeout(resolve, 150));
          assertions.mobileMenuClosed = !visibleText().includes("Mis obligaciones");
        }
        return { passed: Object.values(assertions).every(Boolean), assertions, viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth } };
      }})(${JSON.stringify({ width: viewportWidth })})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluation.exceptionDetails || evaluation.result?.subtype === "error") {
      throw new Error(evaluation.exceptionDetails?.exception?.description || evaluation.result?.description || "Chrome evaluation failed");
    }
    const evidence = evaluation.result.value;
    process.stdout.write(`IUX_07_BROWSER_EVIDENCE=${JSON.stringify(evidence)}\n`);
    if (!evidence?.passed) process.exitCode = 1;
    await cdp.call("Browser.close").catch(() => {});
    cdp.close();
  } finally {
    if (browser?.exitCode === null) browser.kill();
    if (server?.exitCode === null) server.kill();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try { fs.rmSync(workspace, { recursive: true, force: true }); break; }
      catch (error) {
        if (attempt === 19) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
