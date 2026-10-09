import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

type Card = {
  /** Small line above the title, e.g. who the page is for or the post's category. */
  eyebrow: string;
  title: string;
  /** Line under the title. */
  footer: string;
};

/**
 * The share image used for link previews (LinkedIn, WhatsApp, Slack...): the brand, one line that says what the
 * page is, and where it lives. Dark card, teal accent, nothing that needs a font file.
 */
export function ogCard({ eyebrow, title, footer }: Card) {
  // Long titles shrink so they never run off the card.
  const titleSize = title.length > 90 ? 52 : title.length > 60 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0B1220 0%, #0E2326 100%)",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
          <span>Practice</span>
          <span style={{ color: "#2DD4BF" }}>Nudge</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              color: "#2DD4BF",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 22,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, maxWidth: 1050 }}>
            {title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28, color: "#94A3B8" }}>
          <span>{footer}</span>
          <div style={{ display: "flex", width: 120, height: 8, borderRadius: 4, background: "#2DD4BF" }} />
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}