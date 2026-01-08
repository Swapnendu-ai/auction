import { postSkip } from "../api";
import { usePollingState } from "../hooks/usePollingState";
import type { Player, Team } from "../types";
import { PlayerPhoto } from "../components/PlayerPhoto";
import { useState } from "react";
import { RoleBadges } from "../components/RoleBadges";

function lastBid(player: Player | null) {
  if (!player || player.bids.length === 0) return null;
  return player.bids[player.bids.length - 1];
}

export function AuctioneerView() {
  const { state, error, connection, refresh } = usePollingState(1000);
  const [skipErr, setSkipErr] = useState<string | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);

  const player = state?.current_player ?? null;
  const lb = player ? lastBid(player) : null;

  async function onSkip() {
    setIsSkipping(true);
    setSkipErr(null);
    try {
      await postSkip();
    } catch (e) {
      setSkipErr((e as Error).message ?? "skip_failed");
    } finally {
      setIsSkipping(false);
      await refresh();
    }
  }

  return (
    <div style={styles.grid}>
      <div style={styles.left}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>Current Player</div>
            <div style={styles.badge(connection === "ok" ? "#1f9d55" : "#b7791f")}>
              {connection === "ok" ? "Connected" : error ? "Error" : "Loading"}
            </div>
          </div>

          {!player ? (
            <div style={styles.empty}>No current player.</div>
          ) : (
            <div style={styles.playerCard}>
              <PlayerPhoto src={player.photo_path} alt={player.name} size={720} />
              <div style={styles.playerMeta}>
                <div style={styles.playerName}>{player.name}</div>
                <RoleBadges player={player} />
                <div style={styles.smallRow}>
                  <span style={styles.k}>Base</span>
                  <span style={styles.v}>{player.base_price}</span>
                  <span style={{ width: 12 }} />
                  <span style={styles.k}>Remaining in queue</span>
                  <span style={styles.v}>{state?.remaining_players?.length ?? 0}</span>
                </div>
                <div style={styles.actionsRow}>
                  <button style={styles.skipBtn} onClick={onSkip} disabled={isSkipping}>
                    {isSkipping ? "Skipping…" : "Skip"}
                  </button>
                  {skipErr ? <div style={styles.skipErr}>{skipErr}</div> : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>Bid</div>
          </div>

          {!player ? (
            <div style={styles.empty}>—</div>
          ) : (
            <div style={styles.bidBox}>
              <div style={styles.priceRow}>
                <div>
                  <div style={styles.k}>Current price</div>
                  <div style={styles.big}>{player.current_price}</div>
                </div>
                <div>
                  <div style={styles.k}>Next price (min)</div>
                  <div style={styles.big}>{player.next_price}</div>
                </div>
                <div>
                  <div style={styles.k}>Last bid</div>
                  <div style={styles.big}>
                    {lb ? `${lb.amount} (${lb.team})` : "—"}
                  </div>
                </div>
              </div>
              <div style={styles.mutedSmall}>event_id: {state?.event_id ?? 0}</div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.teamsGrid}>
          {state
            ? (Object.values(state.teams) as Team[]).map((t) => (
                <div key={t.name} style={styles.teamCol}>
                  <div style={styles.teamHeader}>
                    <div style={styles.teamName}>{t.name}</div>
                    <div style={styles.wallet}>Wallet: {t.wallet}</div>
                  </div>
                  <div style={styles.teamPlayers}>
                    {t.players.length === 0 ? (
                      <div style={styles.empty}>No players yet.</div>
                    ) : (
                      t.players.map((p) => (
                        <div key={`${t.name}-${p.name}`} style={styles.teamPlayerRow}>
                          <div style={styles.teamPlayerName}>{p.name}</div>
                          <div style={styles.teamPlayerPrice}>
                            {p.bids.length ? p.bids[p.bids.length - 1].amount : p.base_price}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties | any> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    alignItems: "start",
  },
  left: { display: "grid", gap: 16 },
  right: {},
  panel: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
  },
  panelHeader: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  panelTitle: { fontWeight: 800 },
  caption: { fontSize: 12, opacity: 0.7 },
  empty: { opacity: 0.7, padding: "12px 0" },
  badge: (bg: string) => ({
    background: bg,
    color: "white",
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
  }),
  playerCard: { display: "flex", gap: 16, paddingTop: 12, alignItems: "center" },
  playerMeta: { display: "flex", flexDirection: "column", gap: 6 },
  playerName: { fontSize: 34, fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.05 },
  playerInfo: { opacity: 0.85, lineHeight: 1.4, fontSize: 15, maxWidth: 520 },
  smallRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  k: { opacity: 0.65, fontSize: 12 },
  v: { fontWeight: 700 },
  actionsRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" },
  skipBtn: {
    border: "1px solid rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.16)",
    color: "#fecaca",
    padding: "10px 14px",
    borderRadius: 14,
    fontWeight: 950,
    cursor: "pointer",
  },
  skipErr: {
    color: "#fecaca",
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.25)",
    padding: "8px 10px",
    borderRadius: 12,
    fontSize: 12,
  },
  bidBox: { paddingTop: 10 },
  priceRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  big: { fontSize: 26, fontWeight: 900, marginTop: 4 },
  mutedSmall: { opacity: 0.6, fontSize: 12, marginTop: 10 },
  teamsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  teamCol: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 360,
    display: "flex",
    flexDirection: "column",
  },
  teamHeader: {
    padding: 12,
    background: "rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  teamName: { fontWeight: 950, fontSize: 18, letterSpacing: 0.2 },
  wallet: { opacity: 0.9, fontSize: 14, marginTop: 6, fontWeight: 800 },
  teamPlayers: { padding: 10, display: "flex", flexDirection: "column", gap: 8, flex: 1 },
  teamPlayerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 12,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  teamPlayerName: { fontWeight: 850, fontSize: 15 },
  teamPlayerPrice: { opacity: 0.92, fontWeight: 950, fontSize: 15 },
};





