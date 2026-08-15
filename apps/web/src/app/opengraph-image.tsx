import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700 }}>Yume</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 36, color: "#a3a3a3", maxWidth: 900 }}>
          A persistent room for you and your friends
        </div>
      </div>
    ),
    { ...size }
  );
}
