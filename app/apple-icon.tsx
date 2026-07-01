import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0A84FF 0%, #0062CC 100%)",
        borderRadius: 40,
        width: 180,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={100} height={100} viewBox="0 0 24 24" fill="none">
        <path d="M13 3L5 13.5H11.5L10 21L19 10.5H12.5L13 3Z" fill="white" strokeLinejoin="round" />
      </svg>
    </div>,
    { ...size }
  );
}
