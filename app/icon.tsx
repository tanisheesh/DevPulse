import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0A84FF 0%, #0062CC 100%)",
        borderRadius: 8,
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(10,132,255,0.5)",
      }}
    >
      {/* Lightning bolt */}
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <path
          d="M13 3L5 13.5H11.5L10 21L19 10.5H12.5L13 3Z"
          fill="white"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    { ...size }
  );
}
