# Demo environment

A fictional UK practice, **Alder & Wren Accountants**, with 42 clients, their document requests, uploads, reminders and
activity, running on a **local** Supabase in Docker. It never touches production: the tools refuse any target that is not
local, that equals the production URL, or that already holds a real account.

Everything is invented. Every email ends in `.test` (reserved, cannot receive mail), phone numbers come from Ofcom's
drama range (07700 900xxx) and no email can be sent from the demo app.

## Sign-ins (all use the password you choose)

| Person | Email | Role |
|---|---|---|
| Hannah Pemberton | hannah.pemberton@alderandwren.test | owner |
| Daniel Okafor | daniel.okafor@alderandwren.test | admin |
| Priya Nair | priya.nair@alderandwren.test | member |

## First run (Docker Desktop must be running)

```powershell
cd C:\Users\Halil.Turkmen\Hermes-workspace\PracticeNudge

# 1. Choose the demo password (at least 12 characters). The file is git-ignored.
Copy-Item .env.demo.example .env.demo.local     # then put your password after DEMO_USER_PASSWORD=

# 2. Local Supabase (first start downloads a few GB of images)
supabase init                                   # once, creates supabase/config.toml
supabase start

# 3. Create the tables, then the demo data
node scripts/demo/apply-migrations.mjs
node scripts/demo/seed-demo.mjs --confirm-demo

# 4. Run the app on http://localhost:3100 against the demo database
node scripts/demo/dev-demo.mjs
```

Run step 3's seed again at any time to refresh the demo: it replaces only the demo firm's own rows, and every date moves
to "now", so the screens always look current.

## Preview without a database

```powershell
node scripts/demo/seed-demo.mjs --dry-run       # builds the data and prints a summary, writes nothing
```

## Stop and remove

```powershell
supabase stop --no-backup                       # stops the containers and deletes the demo database
```

## Safety rules built in

- Writes only happen with `--confirm-demo`.
- The target must be a local address. A separate hosted demo project needs `DEMO_ALLOW_REMOTE=yes` and `DEMO_PROJECT_REF`.
- It stops if the target equals `NEXT_PUBLIC_SUPABASE_URL` or `PRODUCTION_SUPABASE_URL` in the shell.
- It stops if the target already has any account or firm that is not a demo one, so a real environment is never changed.
- `dev-demo.mjs` empties the email and webhook secrets, so reminders cannot be sent and production keys are never used.
