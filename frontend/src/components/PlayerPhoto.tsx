import { API_BASE } from "../api";

export function PlayerPhoto(props: { src: string; alt: string; size?: number }) {
  const src = props.src?.trim();
  if (!src) return null;

  const url = src.startsWith("http://") || src.startsWith("https://") ? src : `${API_BASE}${src}`;
  // Default remains small for list usage; call-sites can bump size.
  const size = props.size ?? 84;

  return (
    <img
      src={url}
      alt={props.alt}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: Math.max(14, Math.round(size / 5)),
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        maxWidth: "100%",
      }}
      onError={(e) => {
        // Hide broken images (e.g., file missing on backend).
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}


