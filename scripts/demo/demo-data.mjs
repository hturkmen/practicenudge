// Fictional demo data for PracticeNudge: one UK accounting practice with 42 clients, their document
// requests, uploads, reminders and activity. Nothing here is real. Every address ends in ".test"
// (reserved, can never receive mail) and phone numbers come from Ofcom's drama range 07700 900xxx.
//
// buildDemoData() is pure and deterministic: the same firm id and "now" always give the same rows, and
// every date is relative to "now", so the demo looks current whenever it is seeded.

import { createHash } from "node:crypto";

export const DEMO_FIRM = {
  name: "Alder & Wren Accountants",
  email: "hello@alderandwren.test",
  phone: "+44 20 7946 0321",
  plan: "pro",
};
export const DEMO_EMAIL_DOMAIN = "alderandwren.test";
export const CLIENT_EMAIL_DOMAIN = "demo-clients.test";

export const DEMO_USERS = [
  { email: "hannah.pemberton@alderandwren.test", fullName: "Hannah Pemberton", role: "owner" },
  { email: "daniel.okafor@alderandwren.test", fullName: "Daniel Okafor", role: "admin" },
  { email: "priya.nair@alderandwren.test", fullName: "Priya Nair", role: "member" },
];

// name, type, MTD threshold, one-line note (trade and software). The last three have a non-active status.
const CLIENTS = [
  ["Sarah Williams", "sole_trader", "30k", "Hairdresser, rents a chair. Uses FreeAgent."],
  ["Ahmed Khan", "sole_trader", "30k", "Private hire driver. Spreadsheet records."],
  ["Roy Baxter", "sole_trader", "50k", "Plumber. Paper receipts, needs prompting."],
  ["James Patel", "sole_trader", "50k", "IT contractor. Uses Xero."],
  ["Fatima Noor", "sole_trader", "30k", "Online gift shop. Uses QuickBooks."],
  ["Callum Reid", "sole_trader", "50k", "Electrician. Uses Xero."],
  ["Megan Hughes", "sole_trader", "20k", "Personal trainer. Uses FreeAgent."],
  ["Tomasz Kowalski", "sole_trader", "50k", "Builder. Photos of receipts by text."],
  ["Olivia Bennett", "sole_trader", "20k", "Freelance graphic designer. Uses Xero."],
  ["Marcus Thompson", "sole_trader", "30k", "Landscaper. Uses QuickBooks."],
  ["Aisha Rahman", "sole_trader", null, "Private tutor. Spreadsheet records."],
  ["Liam O'Connor", "sole_trader", "30k", "Carpenter. Uses FreeAgent."],
  ["Chloe Davies", "sole_trader", "20k", "Wedding photographer. Uses Xero."],
  ["Dev Mehta", "sole_trader", "50k", "Management consultant. Uses Xero."],
  ["Emily Clarke", "sole_trader", null, "Dog groomer. Spreadsheet records."],
  ["Jack Sutton", "sole_trader", "30k", "Mobile mechanic. Uses QuickBooks."],
  ["Zainab Ali", "sole_trader", "20k", "Bakery market stall. Uses FreeAgent."],
  ["Harry Fletcher", "sole_trader", null, "Window cleaner. Paper records."],
  ["Natalia Wiśniewska", "sole_trader", "20k", "Domestic cleaning. Uses QuickBooks."],
  ["Ben Armstrong", "sole_trader", "30k", "Delivery driver. Uses Xero."],
  ["Margaret Ellison", "landlord", "30k", "Four buy-to-let flats. Letting agent statements."],
  ["Rajesh Gupta", "landlord", "50k", "Six properties across two towns. Uses Xero."],
  ["Susan Whitaker", "landlord", "20k", "Two terraced houses. Self-managed."],
  ["Paul Hargreaves", "landlord", "30k", "Three flats, one HMO. Letting agent."],
  ["Fiona Mackenzie", "landlord", "20k", "Holiday let and one long let."],
  ["Tariq Hussain", "landlord", "50k", "Seven properties. Uses QuickBooks."],
  ["Janet Pickering", "landlord", null, "Rents out her late mother's house."],
  ["Oluwaseun Adeyemi", "landlord", "30k", "Three properties. Letting agent."],
  ["Graham Lowe", "landlord", "20k", "Two flats. Self-managed."],
  ["Catherine Doyle", "landlord", "30k", "Four properties, joint with her husband."],
  ["Sunita Sharma", "landlord", "50k", "Five properties. Uses Xero."],
  ["Peter Holloway", "landlord", "20k", "Two flats above a shop."],
  ["Bright Path Tutoring Ltd", "limited_company", null, "Director: Aisha Rahman's sister. Year-end 31 March."],
  ["Northfield Joinery Ltd", "limited_company", null, "Two directors, four staff. Year-end 30 April."],
  ["Greenleaf Gardens Ltd", "limited_company", null, "Seasonal staff. Year-end 31 January."],
  ["Kiln & Co Ceramics Ltd", "limited_company", null, "Sells online and at fairs. Year-end 30 June."],
  ["Pixel Harbour Studio Ltd", "limited_company", null, "Small design agency. Year-end 31 December."],
  ["Redway Courier Services Ltd", "limited_company", null, "Six self-employed drivers. Year-end 31 March."],
  ["Reid & Malik Catering", "partnership", null, "Two partners. Event catering."],
  ["Foster & Daughters Farm Shop", "partnership", null, "Family partnership. Seasonal income."],
  ["Park & Lindqvist Design", "partnership", null, "Interior design, two partners."],
  ["Ashby Dental Partnership", "partnership", null, "Three partners, one associate."],
];
// Overridden below: the final three clients are not active.
const NON_ACTIVE = { "Redway Courier Services Ltd": "inactive", "Foster & Daughters Farm Shop": "archived", "Ashby Dental Partnership": "on_hold" };

const ITEM_SETS = {
  sole_trader: [
    ["Bank statements", "All business bank statements for the quarter", true, "bank-statements"],
    ["Sales invoices", "Invoices issued during the quarter", true, "sales-invoices"],
    ["Purchase receipts", "Receipts and supplier invoices", true, "purchase-receipts"],
    ["Mileage log", "Business mileage for the quarter", false, "mileage-log"],
    ["Home office calculation", "Only if you work from home", false, "home-office"],
  ],
  landlord: [
    ["Rental income summary", "Rent received for each property", true, "rental-income"],
    ["Letting agent statements", "Monthly statements from your agent", true, "agent-statements"],
    ["Mortgage interest statement", "Interest paid in the quarter", true, "mortgage-interest"],
    ["Repairs and maintenance invoices", "Invoices for work on the properties", false, "repairs"],
    ["Insurance and service charges", "Landlord insurance and service charge bills", false, "insurance"],
  ],
  limited_company: [
    ["Bank statements", "Company bank statements for the period", true, "bank-statements"],
    ["Sales and purchase invoices", "All invoices for the period", true, "invoices"],
    ["Director's loan account", "Movements on the director's loan account", true, "directors-loan"],
    ["Payroll summary", "PAYE and pension summaries", false, "payroll"],
    ["Dividend vouchers", "Dividends declared in the period", false, "dividends"],
  ],
  partnership: [
    ["Partnership bank statements", "Bank statements for the period", true, "bank-statements"],
    ["Sales invoices", "Invoices issued during the period", true, "sales-invoices"],
    ["Purchase invoices", "Supplier invoices for the period", true, "purchase-invoices"],
    ["Partner drawings summary", "Drawings taken by each partner", true, "drawings"],
  ],
};

const CUSTOM_TEMPLATES = [
  {
    name: "Sole trader quarterly pack",
    description: "Our standard quarterly checklist for sole traders",
    category: "mtd_itsa",
    items: ITEM_SETS.sole_trader.map(([label, description, required]) => ({ label, description, required })),
  },
  {
    name: "Landlord quarterly pack",
    description: "Quarterly checklist for clients with rental income",
    category: "mtd_itsa",
    items: ITEM_SETS.landlord.map(([label, description, required]) => ({ label, description, required })),
  },
];

// How the 39 active clients are spread across request situations. The totals are chosen so the
// dashboard shows a believable week: some overdue, a few due soon, most in progress or done.
const SCENARIOS = [
  ["overdue", 6],
  ["dueSoon", 8],
  ["inProgress", 8],
  ["pending", 7],
  ["completed", 9],
  ["cancelled", 1],
];

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function uuidFrom(seed) {
  const h = createHash("sha1").update(seed).digest("hex");
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const dateOnly = (ms) => new Date(ms).toISOString().slice(0, 10);

// The next MTD quarterly deadline after "now", and the one before it, as titles ("Q2 (Jul–Sep) 2026/27").
const QUARTERS = [
  { month: 1, day: 7, label: "Q3 (Oct–Dec)" },
  { month: 4, day: 7, label: "Q4 (Jan–Mar)" },
  { month: 7, day: 7, label: "Q1 (Apr–Jun)" },
  { month: 10, day: 7, label: "Q2 (Jul–Sep)" },
];
function quarterTitles(now) {
  const dues = [];
  for (let y = now.getUTCFullYear() - 1; y <= now.getUTCFullYear() + 1; y++) {
    for (const q of QUARTERS) {
      const taxYearStart = q.month >= 7 ? y : y - 1;
      dues.push({ at: Date.UTC(y, q.month, q.day, 23, 59, 59), title: `MTD update ${q.label} ${taxYearStart}/${String(taxYearStart + 1).slice(2)}` });
    }
  }
  dues.sort((a, b) => a.at - b.at);
  const nextIndex = dues.findIndex((d) => d.at > now.getTime());
  return { current: dues[nextIndex].title, previous: dues[nextIndex - 1].title };
}

export function buildDemoData({ firmId, ownerUserId, userIds = {}, notificationTypeId = null, now = new Date(), fileUrl = null }) {
  if (!firmId) throw new Error("firmId is required");
  const rng = mulberry32(20261007);
  const nowMs = now.getTime();
  const id = (...parts) => uuidFrom([firmId, ...parts].join("|"));
  const between = (a, b) => a + rng() * (b - a);
  const int = (a, b) => Math.floor(between(a, b + 1));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const iso = (ms) => new Date(ms).toISOString();
  const titles = quarterTitles(now);

  // ---- clients ----------------------------------------------------------------------------------------
  const clients = CLIENTS.map(([name, type, threshold, notes], i) => {
    const createdAt = nowMs - int(25, 150) * DAY - int(0, 20) * HOUR;
    const isCompany = type === "limited_company" || type === "partnership";
    const emailConsent = rng() < 0.85 ? "accepted" : rng() < 0.67 ? "pending" : "rejected";
    return {
      id: id("client", i),
      firm_id: firmId,
      name,
      email: isCompany ? `accounts@${slug(name).replace(/\.(ltd|partnership)$/, "")}.test` : `${slug(name)}@${CLIENT_EMAIL_DOMAIN}`,
      phone: `+44 7700 900${String(100 + i * 7).padStart(3, "0")}`,
      client_type: type,
      mtd_threshold: threshold,
      tax_reference: `9${String(10_000_000 + i * 7_919).padStart(9, "0")}`,
      notes,
      status: NON_ACTIVE[name] ?? "active",
      gdpr_consent: emailConsent === "accepted",
      gdpr_consent_token: id("gdpr-token", i),
      gdpr_consented_at: emailConsent === "accepted" ? iso(createdAt + DAY) : null,
      created_at: iso(createdAt),
      _emailConsent: emailConsent,
    };
  });

  const consents = clients.flatMap((c, i) => {
    const smsRoll = rng();
    const sms = smsRoll < 0.4 ? "accepted" : smsRoll < 0.8 ? "pending" : "rejected";
    return [
      { id: id("consent", i, "email"), client_id: c.id, channel: "email", status: c._emailConsent, consent_token: id("consent-token", i, "email"), created_at: c.created_at, updated_at: c.created_at },
      { id: id("consent", i, "sms"), client_id: c.id, channel: "sms", status: sms, consent_token: id("consent-token", i, "sms"), created_at: c.created_at, updated_at: c.created_at },
    ];
  });
  const smsAccepted = new Set(consents.filter((x) => x.channel === "sms" && x.status === "accepted").map((x) => x.client_id));
  for (const c of clients) delete c._emailConsent;

  // ---- who gets which situation ---------------------------------------------------------------------------
  const activeClients = clients.filter((c) => c.status === "active");
  const order = activeClients.map((c, i) => [rng(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  const plan = [];
  let cursor = 0;
  for (const [scenario, count] of SCENARIOS) {
    for (let n = 0; n < count && cursor < order.length; n++) plan.push([scenario, order[cursor++]]);
  }
  while (cursor < order.length) plan.push(["pending", order[cursor++]]);
  const onHoldClient = clients.find((c) => c.status === "on_hold");
  if (onHoldClient) plan.push(["on_hold", onHoldClient]);
  // Earlier, finished work for some clients, so a client's page has history.
  for (const c of order.filter(() => rng() < 0.5)) plan.push(["history", c]);

  const requests = [];
  const items = [];
  const reminderLogs = [];
  const notificationLogs = [];
  const activity = [];
  let requestSeq = 0;

  for (const c of clients) {
    activity.push({ client_id: c.id, request_id: null, action: "client_created", details: {}, at: Date.parse(c.created_at) });
  }

  for (const [scenario, client] of plan) {
    const seq = requestSeq++;
    const requestId = id("request", seq);
    const set = ITEM_SETS[client.client_type];
    const isHistory = scenario === "history";
    const completedAgo = scenario === "completed" ? int(1, 24) : isHistory ? int(80, 110) : null;
    const ageDays =
      scenario === "overdue" ? int(32, 48) :
      scenario === "dueSoon" ? int(14, 24) :
      scenario === "inProgress" ? int(10, 20) :
      scenario === "pending" ? int(1, 4) :
      scenario === "completed" ? completedAgo + int(8, 18) :
      isHistory ? completedAgo + int(10, 20) :
      scenario === "on_hold" ? 21 : 16;
    const createdAt = nowMs - ageDays * DAY - int(0, 8) * HOUR;
    const deadlineMs =
      scenario === "overdue" ? nowMs - int(1, 12) * DAY :
      scenario === "dueSoon" ? nowMs + int(1, 6) * DAY :
      scenario === "inProgress" ? nowMs + int(8, 25) * DAY :
      scenario === "pending" ? nowMs + int(20, 34) * DAY :
      scenario === "completed" ? nowMs - completedAgo * DAY + int(1, 4) * DAY :
      isHistory ? nowMs - completedAgo * DAY + int(1, 4) * DAY :
      scenario === "on_hold" ? nowMs + int(10, 20) * DAY : nowMs + int(5, 15) * DAY;
    const completedAt = completedAgo ? nowMs - completedAgo * DAY - int(0, 6) * HOUR : null;
    const title = client.client_type === "limited_company" ? "Year-end accounts documents" : isHistory ? titles.previous : titles.current;

    // Item states
    const itemRows = set.map(([label, description, required, stem], order) => ({ label, description, required, stem, order }));
    const required = itemRows.filter((r) => r.required);
    const doneCount =
      scenario === "overdue" ? int(1, 2) :
      scenario === "dueSoon" ? Math.max(1, required.length - int(1, 2)) :
      scenario === "inProgress" ? int(1, required.length - 1) :
      scenario === "on_hold" ? 1 : 0;
    let requiredSeen = 0;
    const requestItems = itemRows.map((row) => {
      let status = "pending";
      if (scenario === "completed" || isHistory) status = "approved";
      else if (row.required && requiredSeen < doneCount) {
        status = rng() < 0.6 ? "approved" : "uploaded";
        if (scenario === "overdue" && requiredSeen === 0 && rng() < 0.4) status = "rejected";
      }
      if (row.required) requiredSeen++;
      if (status === "pending" && !row.required && (scenario === "inProgress" || scenario === "dueSoon") && rng() < 0.35) status = "uploaded";
      const recentSince = Math.max(createdAt + DAY, nowMs - 6 * DAY);
      const uploadedMs =
        status === "pending" ? null :
        completedAt ? between(createdAt + DAY, completedAt - 2 * HOUR) :
        between(scenario === "overdue" ? createdAt + DAY : recentSince, nowMs - HOUR);
      const reviewedMs = status === "approved" || status === "rejected" ? Math.min(uploadedMs + int(2, 30) * HOUR, completedAt ?? nowMs - 30 * 60_000) : null;
      const fileName = uploadedMs ? `${row.stem}-${dateOnly(uploadedMs).slice(5)}.pdf` : null;
      return {
        id: id("item", seq, row.order),
        request_id: requestId,
        label: row.label,
        description: row.description,
        required: row.required,
        status,
        file_url: fileName ? fileUrl : null,
        file_name: fileName,
        uploaded_at: uploadedMs ? iso(uploadedMs) : null,
        reviewed_at: reviewedMs ? iso(reviewedMs) : null,
        sort_order: row.order,
        created_at: iso(createdAt),
      };
    });
    items.push(...requestItems);

    // Status the request would really have
    const anyDone = requestItems.some((it) => it.status !== "pending");
    const status =
      scenario === "completed" || isHistory ? "completed" :
      scenario === "overdue" ? "overdue" :
      scenario === "on_hold" ? "on_hold" :
      scenario === "cancelled" ? "cancelled" :
      anyDone ? "in_progress" : "pending";

    // Reminders
    const reminderCount =
      scenario === "overdue" ? int(2, 3) :
      scenario === "dueSoon" ? int(0, 1) :
      scenario === "inProgress" ? int(1, 1) :
      scenario === "completed" ? int(0, 2) :
      isHistory ? int(1, 2) : 0;
    const reminderTimes = [];
    for (let n = 0; n < reminderCount; n++) {
      const end = completedAt ?? nowMs - 2 * HOUR;
      const start = createdAt + 3 * DAY;
      const slot = (end - start) / reminderCount;
      reminderTimes.push(start + slot * n + rng() * slot * 0.8);
    }
    reminderTimes.sort((a, b) => a - b);
    reminderTimes.forEach((at, n) => {
      const channel = smsAccepted.has(client.id) && rng() < 0.3 ? "sms" : "email";
      const roll = rng();
      const delivery = roll < 0.82 ? "delivered" : roll < 0.93 ? "sent" : "failed";
      const overdueNow = scenario === "overdue" && n === reminderTimes.length - 1;
      const preview = overdueNow ? `OVERDUE: documents needed for ${title}` : `Reminder: documents needed for ${title}`;
      reminderLogs.push({
        id: id("reminder", seq, n),
        request_id: requestId,
        client_id: client.id,
        channel,
        status: delivery === "failed" ? (rng() < 0.5 ? "failed" : "bounced") : delivery,
        message_preview: preview,
        sent_at: iso(at),
      });
      notificationLogs.push({
        id: id("notification", seq, n),
        firm_id: firmId,
        client_id: client.id,
        notification_type_id: notificationTypeId,
        triggered_by: ownerUserId,
        channel,
        recipient_address: channel === "sms" ? client.phone : client.email,
        subject: channel === "sms" ? null : preview,
        content_preview: preview,
        full_content: null,
        status: delivery,
        failure_reason: delivery === "failed" ? "Mailbox unavailable" : null,
        metadata: { request_id: requestId, is_overdue: overdueNow },
        sent_at: iso(at),
        delivered_at: delivery === "delivered" ? iso(at + 40_000) : null,
        created_at: iso(at),
      });
      activity.push({ client_id: client.id, request_id: requestId, action: "reminder_sent", details: { channel, is_overdue: overdueNow }, at });
    });

    requests.push({
      id: requestId,
      firm_id: firmId,
      client_id: client.id,
      title,
      template_id: null,
      deadline: dateOnly(deadlineMs),
      status,
      magic_token: id("magic", seq).replace(/-/g, ""),
      reminder_count: reminderCount,
      last_reminder_at: reminderTimes.length ? iso(reminderTimes[reminderTimes.length - 1]) : null,
      completed_at: completedAt ? iso(completedAt) : null,
      created_at: iso(createdAt),
    });

    activity.push({ client_id: client.id, request_id: requestId, action: "request_created", details: { title }, at: createdAt });
    for (const it of requestItems) {
      if (it.uploaded_at) activity.push({ client_id: client.id, request_id: requestId, action: "document_uploaded", details: { item_label: it.label, file_name: it.file_name }, at: Date.parse(it.uploaded_at) });
      if (it.status === "approved") activity.push({ client_id: client.id, request_id: requestId, action: "item_approved", details: { item_label: it.label }, at: Date.parse(it.reviewed_at) });
      if (it.status === "rejected") activity.push({ client_id: client.id, request_id: requestId, action: "item_rejected", details: { item_label: it.label }, at: Date.parse(it.reviewed_at) });
    }
    if (completedAt) activity.push({ client_id: client.id, request_id: requestId, action: "request_completed", details: {}, at: completedAt });
  }

  const activityLogs = activity
    .sort((a, b) => a.at - b.at)
    .map((a, n) => ({ id: id("activity", n), firm_id: firmId, client_id: a.client_id, request_id: a.request_id, action: a.action, details: a.details, created_at: iso(a.at) }));

  const templates = CUSTOM_TEMPLATES.map((t, n) => ({ id: id("template", n), firm_id: firmId, name: t.name, description: t.description, category: t.category, items: t.items, is_system: false, created_at: iso(nowMs - 60 * DAY) }));

  return { clients, consents, requests, items, reminderLogs, notificationLogs, activityLogs, templates };
}

export function summarise(data) {
  const count = (rows, key) => rows.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {});
  return {
    clients: data.clients.length,
    requests: data.requests.length,
    requestStatus: count(data.requests, "status"),
    items: data.items.length,
    itemStatus: count(data.items, "status"),
    reminders: data.reminderLogs.length,
    activity: data.activityLogs.length,
    templates: data.templates.length,
  };
}

/** A tiny valid one-page PDF, so the "view file" links in the demo open something. */
export function demoPdf() {
  const text = "DEMO DOCUMENT - sample file for the PracticeNudge demo. Not a real record.";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 11 Tf 24 110 Td (${text}) Tj ET`;
  objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, n) => {
    offsets.push(pdf.length);
    pdf += `${n + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
