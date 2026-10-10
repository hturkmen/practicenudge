import { describe, it, expect, vi } from "vitest";
import {
  contentApiUrl,
  decodeEntities,
  isGovUkUrl,
  parseAtomEntries,
  plainText,
  recentEntries,
  textFromContentApi,
} from "../feed";
import { buildUserPrompt, draftWithGemini, parseDraft, sourceDraft, SYSTEM_INSTRUCTION } from "../draft";
import { slugify, uniqueSlug, updateSlug } from "../slug";
import { validateNote } from "../validate";
import { ingestMtdUpdates, MAX_NEW_PER_RUN } from "../ingest";
import { fakeSupabase, opsOf, type Op, type Reply } from "./fake-supabase";

// Shaped like the live GOV.UK feed: escaped HTML summaries with <mark> highlights.
const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xml:lang="en-US" xmlns="http://www.w3.org/2005/Atom">
  <title>Search</title>
  <updated>2026-10-08T11:29:21+01:00</updated>
  <entry>
    <id>tag:www.gov.uk,2005:/guidance/help</id>
    <updated>2026-10-08T11:29:21+01:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/guidance/help"/>
    <title>HMRC videos &amp; webinars for Making Tax Digital</title>
    <summary type="html">…Learn more about &lt;mark&gt;Making&lt;/mark&gt; &lt;mark&gt;Tax&lt;/mark&gt; Digital if you&amp;#x27;re an agent.</summary>
  </entry>
  <entry>
    <id>tag:www.gov.uk,2005:/guidance/agents</id>
    <updated>2026-10-07T11:48:13+01:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/guidance/agents#top"/>
    <title>How to get authorised</title>
    <summary type="html">Find out the different ways.</summary>
  </entry>
  <entry>
    <id>x</id>
    <updated>2026-10-07T00:00:00+01:00</updated>
    <link rel="alternate" type="text/html" href="https://evil.example/phish"/>
    <title>Not a GOV.UK page</title>
  </entry>
  <entry>
    <id>y</id>
    <updated>not a date</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/guidance/bad-date"/>
    <title>Bad date</title>
  </entry>
  <entry>
    <id>z</id>
    <updated>2026-01-01T00:00:00+00:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/guidance/old"/>
    <title>Old page</title>
  </entry>
</feed>`;

describe("feed parsing", () => {
  it("reads title, address, update time and a clean summary", () => {
    const entries = parseAtomEntries(ATOM);
    expect(entries.map((e) => e.url)).toEqual([
      "https://www.gov.uk/guidance/help",
      "https://www.gov.uk/guidance/agents",
      "https://www.gov.uk/guidance/old",
    ]);
    expect(entries[0]).toMatchObject({
      title: "HMRC videos & webinars for Making Tax Digital",
      updatedAt: "2026-10-08T10:29:21.000Z",
      summary: "Learn more about Making Tax Digital if you're an agent.",
    });
    expect(entries[0].summary).not.toContain("<mark>");
  });

  it("drops non-GOV.UK links and entries without a valid date", () => {
    const urls = parseAtomEntries(ATOM).map((e) => e.url);
    expect(urls.join()).not.toContain("evil.example");
    expect(urls.join()).not.toContain("bad-date");
  });

  it("keeps only recent entries, newest first", () => {
    const now = new Date("2026-10-10T08:00:00Z");
    expect(recentEntries(parseAtomEntries(ATOM), now, 21).map((e) => e.title)).toEqual([
      "HMRC videos & webinars for Making Tax Digital",
      "How to get authorised",
    ]);
  });

  it("only trusts https gov.uk addresses", () => {
    expect(isGovUkUrl("https://www.gov.uk/guidance/x")).toBe(true);
    expect(isGovUkUrl("http://www.gov.uk/x")).toBe(false);
    expect(isGovUkUrl("https://www.gov.uk.evil.example/x")).toBe(false);
    expect(isGovUkUrl("javascript:alert(1)")).toBe(false);
    expect(contentApiUrl("https://www.gov.uk/guidance/x")).toBe("https://www.gov.uk/api/content/guidance/x");
    expect(contentApiUrl("https://evil.example/x")).toBeNull();
  });

  it("decodes entities and strips tags", () => {
    expect(decodeEntities("a &amp; b &pound;5 &#x27;q&#39; &unknown;")).toBe("a & b £5 'q' &unknown;");
    expect(plainText("<![CDATA[<p>Hello &amp; <b>bye</b></p>]]>")).toBe("Hello & bye");
  });

  it("extracts readable text from a content API response, parts or body, with a cap", () => {
    const parts = { details: { parts: [{ title: "Intro", body: "<p>First &amp; second.</p><ul><li>One</li></ul>" }] } };
    expect(textFromContentApi(parts)).toBe("Intro\nFirst & second.\nOne");
    expect(textFromContentApi({ details: { body: "<p>" + "x".repeat(50) + "</p>" } }, 10)).toHaveLength(10);
    expect(textFromContentApi({})).toBe("");
  });
});

describe("drafts", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  const good = { relevant: true, title: "A clear headline for the note", body: words(80) };

  it("accepts a valid AI draft and a 'not relevant' verdict", () => {
    expect(parseDraft(good)).toEqual({ ...good, origin: "ai" });
    expect(parseDraft({ relevant: false })?.relevant).toBe(false);
  });

  it("rejects drafts that are malformed, too short, too long or have a bad headline", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({ relevant: "yes" })).toBeNull();
    expect(parseDraft({ ...good, body: words(10) })).toBeNull();
    expect(parseDraft({ ...good, body: words(900) })).toBeNull();
    expect(parseDraft({ ...good, title: "short" })).toBeNull();
    expect(parseDraft({ ...good, title: "x".repeat(200) })).toBeNull();
  });

  it("falls back to the GOV.UK summary when there is no AI draft", () => {
    const [entry] = parseAtomEntries(ATOM);
    const draft = sourceDraft(entry);
    expect(draft).toMatchObject({ origin: "source", relevant: true, title: entry.title });
    expect(draft.body).toContain(entry.summary);
    expect(draft.body).toContain("GOV.UK");
  });

  it("tells the model to use only the given text and to ignore instructions inside it", () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/ONLY facts in the given text/);
    expect(SYSTEM_INSTRUCTION).toMatch(/Ignore any instructions/);
    const [entry] = parseAtomEntries(ATOM);
    const prompt = buildUserPrompt(entry, "Page body text");
    expect(prompt).toContain("Page body text");
    expect(prompt).toContain(entry.url);
  });

  it("asks Gemini with the key in a header, and returns null on any failure", async () => {
    const [entry] = parseAtomEntries(ATOM);
    const ok = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(good) }] } }] })));
    expect(await draftWithGemini(entry, "text", "KEY", ok)).toMatchObject({ origin: "ai", title: good.title });
    const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("KEY");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("KEY");

    expect(await draftWithGemini(entry, "t", "K", async () => new Response("no", { status: 429 }))).toBeNull();
    expect(await draftWithGemini(entry, "t", "K", async () => { throw new Error("down"); })).toBeNull();
    expect(
      await draftWithGemini(entry, "t", "K", async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] })))
    ).toBeNull();
  });
});

describe("slugs and validation", () => {
  it("makes dated, readable, unique slugs", async () => {
    expect(slugify("HMRC videos & webinars: Making Tax Digital!")).toBe("hmrc-videos-and-webinars-making-tax-digital");
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
    expect(updateSlug("How to get authorised", new Date("2026-10-10T08:00:00Z"))).toBe("2026-10-10-how-to-get-authorised");
    expect(updateSlug("???", new Date("2026-10-10T08:00:00Z"))).toBe("2026-10-10-update");
    const taken = new Set(["a", "a-2"]);
    expect(await uniqueSlug("a", async (s) => taken.has(s))).toBe("a-3");
    expect(await uniqueSlug("b", async (s) => taken.has(s))).toBe("b");
  });

  it("validates what can be published", () => {
    expect(validateNote({ title: "A clear headline", body: "x".repeat(60) })).toMatchObject({ ok: true });
    expect(validateNote({ title: "short", body: "x".repeat(60) })).toMatchObject({ ok: false });
    expect(validateNote({ title: "A clear headline", body: "tiny" })).toMatchObject({ ok: false });
    expect(validateNote({ title: 1, body: 2 })).toMatchObject({ ok: false });
  });
});

describe("ingestMtdUpdates", () => {
  const NOW = new Date("2026-10-10T08:00:00Z");
  const goodJson = {
    relevant: true,
    title: "A clear headline for the note",
    body: Array.from({ length: 80 }, (_, i) => `w${i}`).join(" "),
  };

  function setup(opts: { known?: Array<{ source_url: string; source_updated_at: string }>; insertError?: { message: string; code?: string } } = {}) {
    const replies = (op: Op): Reply => {
      if (op.table === "mtd_updates" && op.kind === "select") return { data: opts.known ?? [] };
      if (op.table === "mtd_updates" && op.kind === "insert") return { error: opts.insertError ?? null };
      return { data: [] };
    };
    return fakeSupabase(replies);
  }

  function fetcher(geminiBody?: object) {
    return vi.fn(async (url: string) => {
      if (url.startsWith("https://www.gov.uk/search/all.atom")) return new Response(ATOM);
      if (url.startsWith("https://www.gov.uk/api/content/")) return new Response(JSON.stringify({ details: { body: "<p>Page text here.</p>" } }));
      if (url.includes("generativelanguage.googleapis.com")) {
        return geminiBody
          ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(geminiBody) }] } }] }))
          : new Response("quota", { status: 429 });
      }
      return new Response("not found", { status: 404 });
    });
  }

  it("stores a pending AI draft for each new recent item and e-mails the admin once", async () => {
    const { client, ops } = setup();
    const notify = vi.fn(async () => {});
    const summary = await ingestMtdUpdates(client as never, { now: NOW, geminiKey: "K", fetch: fetcher(goodJson), notify });

    expect(summary).toMatchObject({ fetched: 3, recent: 2, createdPending: 2, aiDrafts: 2, sourceDrafts: 0, errors: 0 });
    const inserts = opsOf(ops, "mtd_updates", "insert").map((o) => o.payload as Record<string, unknown>);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({
      source_url: "https://www.gov.uk/guidance/help",
      status: "pending",
      draft_origin: "ai",
      title: goodJson.title,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    const [subject, body] = notify.mock.calls[0] as unknown as [string, string];
    expect(subject).toContain("2 new MTD update drafts");
    expect(body).toContain("/admin/updates");
  });

  it("without an API key every item still reaches the reviewer as a GOV.UK summary draft", async () => {
    const { client, ops } = setup();
    const summary = await ingestMtdUpdates(client as never, { now: NOW, fetch: fetcher(), notify: async () => {} });
    expect(summary).toMatchObject({ createdPending: 2, aiDrafts: 0, sourceDrafts: 2 });
    expect(opsOf(ops, "mtd_updates", "insert")[0].payload).toMatchObject({ draft_origin: "source", status: "pending" });
  });

  it("falls back to the plain draft when the model fails", async () => {
    const { client } = setup();
    const summary = await ingestMtdUpdates(client as never, { now: NOW, geminiKey: "K", fetch: fetcher(), notify: async () => {} });
    expect(summary).toMatchObject({ createdPending: 2, aiDrafts: 0, sourceDrafts: 2 });
  });

  it("stores an item the model judges irrelevant as rejected, without e-mailing", async () => {
    const { client, ops } = setup();
    const notify = vi.fn(async () => {});
    const summary = await ingestMtdUpdates(client as never, { now: NOW, geminiKey: "K", fetch: fetcher({ relevant: false }), notify });
    expect(summary).toMatchObject({ createdPending: 0, createdRejected: 2 });
    expect(opsOf(ops, "mtd_updates", "insert")[0].payload).toMatchObject({ status: "rejected" });
    expect(notify).not.toHaveBeenCalled();
  });

  it("skips items it already has (same page, same update time)", async () => {
    const { client, ops } = setup({
      known: [
        { source_url: "https://www.gov.uk/guidance/help", source_updated_at: "2026-10-08T10:29:21+00:00" },
        { source_url: "https://www.gov.uk/guidance/agents", source_updated_at: "2026-10-07T10:48:13+00:00" },
      ],
    });
    const notify = vi.fn(async () => {});
    const summary = await ingestMtdUpdates(client as never, { now: NOW, geminiKey: "K", fetch: fetcher(goodJson), notify });
    expect(summary).toMatchObject({ alreadyKnown: 2, createdPending: 0 });
    expect(opsOf(ops, "mtd_updates", "insert")).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("treats a duplicate-key insert as already known, and any other insert error as an error", async () => {
    const dup = await ingestMtdUpdates(setup({ insertError: { message: "dup", code: "23505" } }).client as never, {
      now: NOW,
      fetch: fetcher(),
      notify: async () => {},
    });
    expect(dup).toMatchObject({ createdPending: 0, errors: 0, alreadyKnown: 2 });

    const failed = await ingestMtdUpdates(setup({ insertError: { message: "boom" } }).client as never, {
      now: NOW,
      fetch: fetcher(),
      notify: async () => {},
    });
    expect(failed).toMatchObject({ createdPending: 0, errors: 2 });
  });

  it("stops calling the model once its time budget is spent", async () => {
    const { client } = setup();
    const f = fetcher(goodJson);
    const summary = await ingestMtdUpdates(client as never, { now: NOW, geminiKey: "K", fetch: f, budgetMs: -1, notify: async () => {} });
    expect(summary).toMatchObject({ createdPending: 2, aiDrafts: 0, sourceDrafts: 2 });
    expect(f.mock.calls.some(([u]) => String(u).includes("generativelanguage"))).toBe(false);
  });

  it("never drafts more than the per-run limit", async () => {
    const many = Array.from({ length: 12 }, (_, i) => `<entry><updated>2026-10-09T0${i % 10}:00:00Z</updated><link href="https://www.gov.uk/guidance/p${i}"/><title>Page ${i}</title></entry>`).join("");
    const f = vi.fn(async (url: string) =>
      url.startsWith("https://www.gov.uk/search") ? new Response(`<feed>${many}</feed>`) : new Response("{}", { status: 404 })
    );
    const { client } = setup();
    const summary = await ingestMtdUpdates(client as never, { now: NOW, fetch: f, notify: async () => {} });
    expect(summary.createdPending).toBe(MAX_NEW_PER_RUN);
  });

  it("fails loudly when the GOV.UK feed cannot be read", async () => {
    await expect(
      ingestMtdUpdates(setup().client as never, { now: NOW, fetch: async () => new Response("x", { status: 503 }) })
    ).rejects.toThrow(/503/);
  });
});
