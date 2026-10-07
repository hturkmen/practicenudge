// Seeds the fictional demo practice into a DEMO Supabase. Never run it against production.
//
//   node scripts/demo/seed-demo.mjs --dry-run         builds the data and prints a summary, touches nothing
//   node scripts/demo/seed-demo.mjs --confirm-demo    seeds the local (or explicitly allowed demo) Supabase
//
// Safety, in order: the target must be local (or an explicitly named demo project), must differ from the
// production URL if one is set, and must hold no accounts or firms that are not demo ones. Without a
// --confirm-demo flag nothing is written. Only the demo firm's own rows are ever deleted.
import { createClient } from "@supabase/supabase-js";
import { buildDemoData, demoPdf, DEMO_EMAIL_DOMAIN, DEMO_FIRM, DEMO_USERS, summarise, uuidFrom } from "./demo-data.mjs";
import { assertSafeTarget, readDemoEnvFile, resolveTarget } from "./local-env.mjs";

const args = new Set(process.argv.slice(2));
const die = (message) => {
  console.error(`\nStopped: ${message}\n`);
  process.exit(1);
};
const must = async (label, promise) => {
  const { data, error } = await promise;
  if (error) die(`${label}: ${error.message}`);
  return data;
};
const strip = ({ _x, ...row }) => row;

if (args.has("--dry-run")) {
  const data = buildDemoData({ firmId: uuidFrom("dry-run"), ownerUserId: uuidFrom("dry-run-owner"), notificationTypeId: uuidFrom("dry-run-type") });
  console.log("Dry run (nothing written):");
  console.log(JSON.stringify(summarise(data), null, 2));
  process.exit(0);
}

if (!args.has("--confirm-demo")) die("add --confirm-demo to seed the demo environment (or --dry-run to preview).");

const env = { ...readDemoEnvFile(), ...process.env };
const target = resolveTarget(env);
try {
  assertSafeTarget(target.url, env);
} catch (error) {
  die(error.message);
}
if (!target.serviceKey) die("no service role key for the demo Supabase.");
const password = env.DEMO_USER_PASSWORD;
if (!password || password.length < 12) die("set DEMO_USER_PASSWORD (at least 12 characters) in your shell or in .env.demo.local.");

const supabase = createClient(target.url, target.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const isDemoAddress = (email) => typeof email === "string" && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);

// 1. The target must hold nothing but demo accounts.
const { data: userPage, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) die(`cannot list users: ${usersError.message}`);
const foreignUser = userPage.users.find((u) => !isDemoAddress(u.email));
if (foreignUser) die("this Supabase already has accounts that are not demo accounts. It looks like a real environment, so nothing was written.");
const firmRows = await must("read firms", supabase.from("firms").select("id,email"));
if (firmRows.some((f) => !isDemoAddress(f.email))) die("this Supabase already has firms that are not demo firms. Nothing was written.");

// 2. Demo users. The sign-up trigger creates a firm for each, so keep the owner's and merge the rest into it.
// Marks the dashboard email-preferences question as answered so it does not cover the demo screens. It records no consent.
const answeredAt = new Date().toISOString();
const userIds = {};
for (const user of DEMO_USERS) {
  const existing = userPage.users.find((u) => u.email?.toLowerCase() === user.email);
  if (existing) {
    await must(`update ${user.email}`, supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { firm_name: DEMO_FIRM.name, full_name: user.fullName, marketing_prompt_answered_at: answeredAt } }));
    userIds[user.email] = existing.id;
  } else {
    const created = await must(
      `create ${user.email}`,
      supabase.auth.admin.createUser({ email: user.email, password, email_confirm: true, user_metadata: { firm_name: DEMO_FIRM.name, full_name: user.fullName, marketing_prompt_answered_at: answeredAt } }),
    );
    userIds[user.email] = created.user.id;
  }
}
const owner = DEMO_USERS.find((u) => u.role === "owner");
const ownerId = userIds[owner.email];
const ownerLink = await must("find the demo firm", supabase.from("firm_users").select("firm_id").eq("user_id", ownerId).limit(1));
if (!ownerLink.length) die("the owner has no firm. Is the sign-up trigger (migration 003) applied?");
const firmId = ownerLink[0].firm_id;

await must("update firm", supabase.from("firms").update({ name: DEMO_FIRM.name, email: DEMO_FIRM.email, phone: DEMO_FIRM.phone, plan: DEMO_FIRM.plan }).eq("id", firmId));
for (const user of DEMO_USERS.filter((u) => u.role !== "owner")) {
  const links = await must("read member firms", supabase.from("firm_users").select("firm_id").eq("user_id", userIds[user.email]));
  const strays = links.map((l) => l.firm_id).filter((id) => id !== firmId);
  if (strays.length) await must("remove stray firms", supabase.from("firms").delete().in("id", strays));
  await must("link member", supabase.from("firm_users").upsert({ firm_id: firmId, user_id: userIds[user.email], role: user.role }, { onConflict: "firm_id,user_id" }));
}

// 3. A sample file the "view file" links can open.
let fileUrl = null;
const bucket = await supabase.storage.createBucket("documents", { public: true });
if (bucket.error && !/already exists/i.test(bucket.error.message)) console.warn(`  storage bucket: ${bucket.error.message} (file links will be empty)`);
else {
  const upload = await supabase.storage.from("documents").upload(`${firmId}/demo/sample-document.pdf`, demoPdf(), { contentType: "application/pdf", upsert: true });
  if (upload.error) console.warn(`  sample file: ${upload.error.message} (file links will be empty)`);
  else fileUrl = supabase.storage.from("documents").getPublicUrl(`${firmId}/demo/sample-document.pdf`).data.publicUrl;
}

// 4. Replace the demo firm's own data.
const typeRows = await must("read notification types", supabase.from("notification_types").select("id").eq("name", "document_reminder").limit(1));
const notificationTypeId = typeRows[0]?.id ?? null;
if (!notificationTypeId) console.warn("  notification type 'document_reminder' not found, skipping notification logs");

for (const table of ["notification_logs", "activity_logs", "document_requests", "clients"]) {
  await must(`clear ${table}`, supabase.from(table).delete().eq("firm_id", firmId));
}
await must("clear templates", supabase.from("templates").delete().eq("firm_id", firmId).eq("is_system", false));

const data = buildDemoData({ firmId, ownerUserId: ownerId, notificationTypeId, fileUrl });
const insert = async (table, rows) => {
  for (let i = 0; i < rows.length; i += 200) await must(`insert ${table}`, supabase.from(table).insert(rows.slice(i, i + 200).map(strip)));
  console.log(`  ${table}: ${rows.length}`);
};
console.log("Seeding:");
await insert("clients", data.clients);
await insert("client_consents", data.consents);
await insert("templates", data.templates);
await insert("document_requests", data.requests);
await insert("request_items", data.items);
await insert("reminder_logs", data.reminderLogs);
if (notificationTypeId) await insert("notification_logs", data.notificationLogs);
await insert("activity_logs", data.activityLogs);

console.log("\nDone.", JSON.stringify(summarise(data)));
console.log(`Sign in as ${owner.email} with the password you set in DEMO_USER_PASSWORD.`);
console.log("Team: " + DEMO_USERS.filter((u) => u.role !== "owner").map((u) => `${u.fullName} (${u.role})`).join(", "));
