// Where the demo environment lives, and the checks that keep demo tooling away from production.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "host.docker.internal"]);

function parseEnvLines(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return out;
}

/** Values from .env.demo.local (git-ignored). Never reads .env.local. */
export function readDemoEnvFile(cwd = process.cwd()) {
  const file = path.join(cwd, ".env.demo.local");
  return fs.existsSync(file) ? parseEnvLines(fs.readFileSync(file, "utf8")) : {};
}

function readLocalSupabaseStatus() {
  try {
    const text = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" });
    return parseEnvLines(text);
  } catch {
    return {};
  }
}

/** URL and keys of the demo Supabase: explicit DEMO_* values first, then the local `supabase start` stack. */
export function resolveTarget(env) {
  const status = env.DEMO_SUPABASE_URL && env.DEMO_SUPABASE_SERVICE_ROLE_KEY ? {} : readLocalSupabaseStatus();
  return {
    url: env.DEMO_SUPABASE_URL || status.API_URL || "",
    serviceKey: env.DEMO_SUPABASE_SERVICE_ROLE_KEY || status.SERVICE_ROLE_KEY || status.SECRET_KEY || "",
    anonKey: env.DEMO_SUPABASE_ANON_KEY || status.ANON_KEY || status.PUBLISHABLE_KEY || "",
  };
}

const normalise = (url) => url.trim().replace(/\/+$/, "").toLowerCase();

/**
 * Refuses anything that is not clearly a demo target. A local stack is always accepted. A hosted project is
 * accepted only when DEMO_ALLOW_REMOTE=yes and DEMO_PROJECT_REF names the project in the URL.
 */
export function assertSafeTarget(url, env, { allowRemote = true } = {}) {
  if (!url) throw new Error("No demo Supabase found. Start the local one (supabase start) or set DEMO_SUPABASE_URL.");
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Not a valid URL: ${url}`);
  }
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "PRODUCTION_SUPABASE_URL"]) {
    const other = process.env[name];
    if (other && normalise(other) === normalise(url)) throw new Error(`${url} is the same as ${name}. Refusing to touch it.`);
  }
  if (LOCAL_HOSTS.has(host)) return { local: true };
  if (!allowRemote) throw new Error("This tool only works against the local demo Supabase.");
  const ref = env.DEMO_PROJECT_REF;
  if (env.DEMO_ALLOW_REMOTE === "yes" && ref && host === `${ref}.supabase.co`) return { local: false };
  throw new Error(
    `${host} is not a local address. To use a separate hosted demo project set DEMO_ALLOW_REMOTE=yes and DEMO_PROJECT_REF=<its ref>. Never point this at production.`,
  );
}
