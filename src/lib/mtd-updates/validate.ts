import { TITLE_MAX, TITLE_MIN } from "./draft";

export const BODY_MIN_CHARS = 40;
export const BODY_MAX_CHARS = 4000;

export type NoteInput = { title: unknown; body: unknown };

/** What a reviewer may publish: a clear title and a body long enough to say something. */
export function validateNote(input: NoteInput): { ok: true; title: string; body: string } | { ok: false; error: string } {
  if (typeof input.title !== "string" || typeof input.body !== "string") {
    return { ok: false, error: "Title and body are required." };
  }
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { ok: false, error: `The title must be ${TITLE_MIN} to ${TITLE_MAX} characters.` };
  }
  if (body.length < BODY_MIN_CHARS || body.length > BODY_MAX_CHARS) {
    return { ok: false, error: `The text must be ${BODY_MIN_CHARS} to ${BODY_MAX_CHARS} characters.` };
  }
  return { ok: true, title, body };
}

export type UpdateAction = "publish" | "save" | "reject" | "unpublish" | "ingest";

export function isUpdateAction(value: unknown): value is UpdateAction {
  return value === "publish" || value === "save" || value === "reject" || value === "unpublish" || value === "ingest";
}
