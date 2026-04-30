import { ImageResponse } from "next/og";

const FONT_SOURCES = [
  {
    name: "Syne",
    url: "https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ6OQly_aA.woff",
    weight: 800,
  },
  {
    name: "Geist",
    url: "https://fonts.gstatic.com/s/geist/v1/gyBhhwUxId8gMGYQMKR3pzfaWI_RnOI.woff",
    weight: 400,
  },
] as const;

type SocialImageFontWeight = (typeof FONT_SOURCES)[number]["weight"];

type SocialImageFont = {
  name: string;
  data: ArrayBuffer;
  style: "normal";
  weight: SocialImageFontWeight;
};

async function loadFont(
  name: string,
  url: string,
  weight: SocialImageFontWeight
): Promise<SocialImageFont | null> {
  try {
    const response = await fetch(new URL(url));

    if (!response.ok) {
      console.warn(`Failed to load ${name} font for social image`, {
        status: response.status,
        url,
      });
      return null;
    }

    return {
      name,
      data: await response.arrayBuffer(),
      style: "normal",
      weight,
    };
  } catch (error) {
    console.warn(`Failed to load ${name} font for social image`, {
      error,
      url,
    });
    return null;
  }
}

async function loadFonts(): Promise<SocialImageFont[]> {
  const fonts = await Promise.all(
    FONT_SOURCES.map(({ name, url, weight }) => loadFont(name, url, weight))
  );

  return fonts.filter((font): font is SocialImageFont => font !== null);
}

export async function createSocialImageResponse() {
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Instagram gradient glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -160,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(131,58,180,0.45) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -60,
            left: 180,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(253,29,29,0.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            right: -100,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(252,176,69,0.35) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Left: text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 72px",
            flex: 1,
            gap: 32,
            position: "relative",
          }}
        >
          {/* Logo mark + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 18,
                background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
                boxShadow: "0 0 40px rgba(131,58,180,0.5)",
              }}
            >
              {/* Film/scissors icon */}
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
            </div>
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 52,
                fontWeight: 800,
                color: "white",
                letterSpacing: "-1.5px",
                lineHeight: 1,
                display: "flex",
              }}
            >
              ig
              <span
                style={{
                  background: "linear-gradient(90deg, #c13584, #e1306c, #fd1d1d, #fcb045)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                edits
              </span>
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 58,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1.1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Turn long videos</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              into{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #c13584, #fd1d1d, #fcb045)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Reels-ready
              </span>
            </span>
            <span>shorts</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: "Geist",
              fontSize: 22,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "-0.3px",
              lineHeight: 1,
              display: "flex",
            }}
          >
            AI clip extraction · Word-synced captions · 9:16 vertical
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: 10 }}>
            {["Urdu / Hindi", "Auto Subtitles", "Open Source"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 18px",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontFamily: "Geist",
                  fontSize: 15,
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "-0.2px",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: phone mockup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 64px 40px 0",
            position: "relative",
          }}
        >
          {/* Phone shell */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 220,
              height: 440,
              borderRadius: 36,
              background: "#111",
              border: "2px solid rgba(255,255,255,0.12)",
              overflow: "hidden",
              boxShadow: "0 0 80px rgba(131,58,180,0.3), 0 40px 80px rgba(0,0,0,0.6)",
              position: "relative",
            }}
          >
            {/* Reels gradient background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #1a0a2e 0%, #0d0d0d 60%, #1a0505 100%)",
                display: "flex",
              }}
            />
            {/* Notch */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                width: 60,
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
              }}
            />
            {/* Reels label */}
            <div
              style={{
                position: "absolute",
                top: 36,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                fontFamily: "Geist",
                fontSize: 13,
                fontWeight: 400,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "1px",
              }}
            >
              Reels
            </div>
            {/* Subtitle caption block */}
            <div
              style={{
                position: "absolute",
                bottom: 80,
                left: 16,
                right: 52,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                }}
              >
                {["یہ", "ویڈیو", "AI", "نے", "بنائی"].map((word, i) => (
                  <span
                    key={i}
                    style={{
                      fontFamily: "Geist",
                      fontSize: 13,
                      fontWeight: 800,
                      color: i === 2 ? "#fcb045" : "white",
                      background: "rgba(0,0,0,0.5)",
                      padding: "2px 5px",
                      borderRadius: 4,
                      display: "flex",
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
            {/* Side action buttons */}
            <div
              style={{
                position: "absolute",
                right: 10,
                bottom: 100,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                alignItems: "center",
              }}
            >
              {/* Heart */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span style={{ fontFamily: "Geist", fontSize: 9, color: "rgba(255,255,255,0.8)", display: "flex" }}>24.5K</span>
              </div>
              {/* Comment */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span style={{ fontFamily: "Geist", fontSize: 9, color: "rgba(255,255,255,0.8)", display: "flex" }}>482</span>
              </div>
              {/* Share */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span style={{ fontFamily: "Geist", fontSize: 9, color: "rgba(255,255,255,0.8)", display: "flex" }}>Share</span>
              </div>
            </div>
            {/* Bottom bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 52,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                padding: "0 8px",
              }}
            >
              {["🏠", "🔍", "➕", "🎬", "👤"].map((icon, i) => (
                <div key={i} style={{ display: "flex", fontSize: 16, opacity: i === 3 ? 1 : 0.5 }}>
                  {icon}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instagram gradient top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
