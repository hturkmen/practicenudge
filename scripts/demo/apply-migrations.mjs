// Applies supabase/migrations/*.sql, in file-name order, to the LOCAL demo database running in Docker.
// The Supabase CLI refuses this folder (two files share the numbers 008 and 014), so the files are piped
// straight into the local Postgres container. It only ever talks to a local container.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "supabase", "migrations");
const shell = process.platform === "win32";

const containers = execFileSync("docker", ["ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"], { encoding: "utf8", shell })
  .split(/\r?\n/)
  .filter(Boolean);
if (containers.length !== 1) {
  console.error(`\nStopped: expected exactly one local Supabase database container, found ${containers.length}. Run \`supabase start\` first.\n`);
  process.exit(1);
}
const container = containers[0];

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
console.log(`Applying ${files.length} migrations to ${container}`);
for (const file of files) {
  // Migration 005 grants super-admin to a real production account. That must never reach a demo database.
  const original = fs.readFileSync(path.join(dir, file), "utf8");
  const sql = original.replace(/^INSERT INTO super_admins[^;]*;/gim, "-- (skipped for the demo: production super admin)");
  if (sql !== original) console.log("  note: skipped the production super-admin insert in " + file);
  const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], {
    input: sql,
    encoding: "utf8",
    shell,
  });
  if (result.status !== 0) {
    console.error(`\nFailed on ${file}:\n${result.stderr || result.stdout}`);
    process.exit(1);
  }
  console.log(`  ok  ${file}`);
}
// Demo-only fix for the recursive firm_users policy (see the file for the reason).
const patch = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], {
  input: fs.readFileSync(path.join(process.cwd(), "scripts", "demo", "demo-patches.sql")),
  encoding: "utf8",
  shell,
});
if (patch.status !== 0) {
  console.error(`\nFailed on demo-patches.sql:\n${patch.stderr || patch.stdout}`);
  process.exit(1);
}
console.log("  ok  demo-patches.sql (demo only)");

console.log("\nDone. Next: node scripts/demo/seed-demo.mjs --confirm-demo");
