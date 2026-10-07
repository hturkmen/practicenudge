// Runs the app on http://localhost:3100 against the LOCAL demo Supabase.
// Values set here win over .env.local, so production keys are never used and no email can be sent.
//
// A small proxy sits on the public port. It sends /supabase-demo/* to the local Supabase and everything else to
// Next.js, so the browser only ever talks to one address (some browsers, like the in-app preview pane, may not
// reach other local ports) and no CORS is involved.
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { assertSafeTarget, readDemoEnvFile, resolveTarget } from "./local-env.mjs";

const env = { ...readDemoEnvFile(), ...process.env };
const target = resolveTarget(env);
try {
  assertSafeTarget(target.url, env, { allowRemote: false });
} catch (error) {
  console.error(`\nStopped: ${error.message}\n`);
  process.exit(1);
}
if (!target.anonKey || !target.serviceKey) {
  console.error("\nStopped: could not read the demo keys. Is `supabase start` running?\n");
  process.exit(1);
}

const port = Number(env.DEMO_PORT || 3100);
const nextPort = port + 1;
const api = new URL(target.url);
const PREFIX = "/supabase-demo";
const publicApiUrl = `http://localhost:${port}${PREFIX}`;
console.log(`Demo app: http://localhost:${port}  (database ${target.url} through ${publicApiUrl}, email sending off)`);

const forward = (req, res, host, hostPort, path) => {
  const upstream = http.request({ host, port: hostPort, path, method: req.method, headers: { ...req.headers, host: `${host}:${hostPort}` } }, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Demo upstream is not ready yet, try again in a moment.");
  });
  req.pipe(upstream);
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith(PREFIX + "/") || req.url === PREFIX) forward(req, res, api.hostname, Number(api.port) || 80, req.url.slice(PREFIX.length) || "/");
  else forward(req, res, "127.0.0.1", nextPort, req.url);
});
// Hot reload uses a WebSocket, pass those through to Next.js.
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(nextPort, "127.0.0.1", () => {
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n\r\n");
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});
server.listen(port);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(nextPort)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: publicApiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: target.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: target.serviceKey,
    NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
    APP_URL: `http://localhost:${port}`,
    // Defined but empty: Next does not replace them from .env.local, so nothing real can be reached.
    RESEND_API_KEY: "",
    RESEND_WEBHOOK_SECRET: "",
    LEAD_NOTIFICATION_EMAIL: "",
    SUPER_ADMIN_EMAIL: "",
    ADMIN_SIGNUP_WEBHOOK_SECRET: "",
    OUTREACH_MODE: "off",
    OUTREACH_TOKEN_SECRET: "demo-only-not-a-secret",
    CRON_SECRET: "demo-only-not-a-secret",
  },
});
const stop = (code) => {
  server.close();
  process.exit(code ?? 0);
};
child.on("exit", stop);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
