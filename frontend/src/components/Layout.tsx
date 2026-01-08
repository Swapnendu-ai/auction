import type { ReactNode } from "react";
import { navigateToAuctioneer, navigateToTeam } from "../router";
import { useEffect, useMemo, useState } from "react";
import { usePollingState } from "../hooks/usePollingState";

function getLastBidTimestampMs(state: any): number | null {
  const bids = state?.current_player?.bids;
  if (!Array.isArray(bids) || bids.length === 0) return null;
  const ts = bids[bids.length - 1]?.timestamp;
  if (!ts) return null;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function Layout(props: { title: string; children: ReactNode }) {
  const { state } = usePollingState(1000);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsSinceLastBid = useMemo(() => {
    const t = getLastBidTimestampMs(state);
    if (t === null) return null;
    return Math.max(0, Math.floor((nowMs - t) / 1000));
  }, [state, nowMs]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandTitle}>Auction</div>
          <div style={styles.brandSubtitle}>{props.title}</div>
        </div>

        <div style={styles.centerTimer}>
          {secondsSinceLastBid === null ? "—" : `${secondsSinceLastBid}s`}
        </div>

        <div style={styles.nav}>
          <button style={styles.navBtn} onClick={() => navigateToAuctioneer()}>
            Auctioneer
          </button>
          <button style={styles.navBtn} onClick={() => navigateToTeam()}>
            Team
          </button>
        </div>
      </div>
      <div style={styles.body}>{props.children}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1020",
    color: "#e8ecff",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(16, 22, 44, 0.9)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    backdropFilter: "blur(8px)",
  },
  brand: { display: "flex", flexDirection: "column", gap: 2 },
  brandTitle: { fontWeight: 800, letterSpacing: 0.2 },
  brandSubtitle: { opacity: 0.7, fontSize: 12 },
  nav: { display: "flex", gap: 8 },
  navBtn: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#e8ecff",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
  },
  centerTimer: {
    flex: 1,
    textAlign: "center",
    color: "#ef4444",
    fontWeight: 950,
    fontSize: 28,
    letterSpacing: 0.3,
    // Avoid intercepting clicks on the nav (some mobile browsers can treat wide flex items as overlays).
    pointerEvents: "none",
  },
  body: { padding: 16 },
};





