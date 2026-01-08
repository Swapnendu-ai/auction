import type { Player } from "../types";

function Badge(props: { label: string; ok: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${props.ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.28)"}`,
        background: props.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.10)",
        color: props.ok ? "#bbf7d0" : "#fecaca",
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: 0.2,
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{props.ok ? "✓" : "✗"}</span>
      <span>{props.label}</span>
    </div>
  );
}

export function RoleBadges(props: { player: Player }) {
  const p = props.player;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      <Badge label="Bat" ok={!!p.can_bat} />
      <Badge label="Bowl" ok={!!p.can_bowl} />
      <Badge label="WK" ok={!!p.can_wicket_keep} />
      <Badge label="Field" ok={!!p.can_field} />
    </div>
  );
}


