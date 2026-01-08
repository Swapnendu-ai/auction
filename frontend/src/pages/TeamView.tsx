import { useEffect, useMemo, useState } from "react";
import { postBid } from "../api";
import { usePollingState } from "../hooks/usePollingState";
import type { TeamName } from "../types";
import { PlayerPhoto } from "../components/PlayerPhoto";
import { navigateToAuctioneer } from "../router";

const TEAMS: TeamName[] = ["Red", "Blue", "Green", "Yellow"];

function parseTeam(maybe?: string): TeamName | null {
  if (!maybe) return null;
  return (TEAMS as string[]).includes(maybe) ? (maybe as TeamName) : null;
}

export function TeamView(props: { teamParam?: string }) {
  const teamFromUrl = useMemo(() => parseTeam(props.teamParam), [props.teamParam]);
  const [team, setTeam] = useState<TeamName>(teamFromUrl ?? "Red");

  // If the URL contains a team, always reflect it immediately.
  useEffect(() => {
    if (teamFromUrl) setTeam(teamFromUrl);
  }, [teamFromUrl]);

  const { state, error, connection, refresh } = usePollingState(1000);
  const currentPlayer = state?.current_player ?? null;
  const myTeam = state?.teams?.[team];
  const totalPlayers =
    (state ? Object.values(state.teams).reduce((acc, t) => acc + (t.players?.length ?? 0), 0) : 0) +
    (state?.remaining_players?.length ?? 0) +
    (state?.current_player ? 1 : 0);
  const numTeams = TEAMS.length;
  const maxPerTeam = numTeams > 0 ? Math.floor(totalPlayers / numTeams) : 0;
  // Only treat as "roster full" once state is loaded and the cap is meaningful (> 0).
  const rosterFull =
    !!myTeam && maxPerTeam > 0 && (myTeam.players?.length ?? 0) >= maxPerTeam;
  const minBid = currentPlayer?.next_price ?? 0;
  const winningTeam = currentPlayer?.bids?.length
    ? currentPlayer.bids[currentPlayer.bids.length - 1].team
    : null;
  const isLeading = !!winningTeam && winningTeam === team;

  const [amount, setAmount] = useState<number>(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentPlayer) return;
    // If the player changed, reset the bid amount to the min bid.
    setAmount(minBid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer?.name]);

  useEffect(() => {
    // If roster is full, redirect teams to the Auctioneer view.
    if (rosterFull) {
      navigateToAuctioneer();
    }
  }, [rosterFull]);

  useEffect(() => {
    if (!currentPlayer) return;
    // As state is reloaded every second: if amount is lower than min bid, bump it up.
    // If amount is already >= min bid, keep the user's chosen amount.
    setAmount((prev) => (prev < minBid ? minBid : prev));
  }, [minBid, currentPlayer]);

  const canBid =
    !!currentPlayer &&
    !!myTeam &&
    !rosterFull &&
    !isLeading &&
    amount >= minBid &&
    amount <= myTeam.wallet &&
    !isSubmitting;

  async function onBid() {
    if (!currentPlayer) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await postBid(team, amount);
    } catch (e) {
      setActionError((e as Error).message ?? "bid_failed");
    } finally {
      setIsSubmitting(false);
      // Immediately re-fetch state whether bid succeeded or failed.
      await refresh();
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.title}>{team}</div>
          <div style={styles.pill(connection === "ok" ? "#1f9d55" : "#b7791f")}>
            {connection === "ok" ? "Connected" : error ? "Error" : "Loading"}
          </div>
        </div>

        <div style={styles.subRow}>
          <div style={styles.stat}>
            <div style={styles.k2}>Wallet</div>
            <div style={styles.v2}>{myTeam?.wallet ?? "—"}</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.k2}>Players</div>
            <div style={styles.v2}>{myTeam?.players?.length ?? "—"}</div>
          </div>
          {!teamFromUrl ? (
            <div style={styles.hint}>
              Set team in URL: <span style={styles.hintCode}>#/team?team=Red</span>
            </div>
          ) : null}
        </div>

        <div style={styles.playerBox}>
          <div style={styles.playerTitle}>Current Player</div>
          {!currentPlayer ? (
            <div style={styles.muted}>No current player.</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
                <PlayerPhoto src={currentPlayer.photo_path} alt={currentPlayer.name} size={140} />
                <div style={{ flex: 1 }}>
                  <div style={styles.playerName}>{currentPlayer.name}</div>
                  <div style={styles.muted}>{currentPlayer.info}</div>
                </div>
              </div>
              <div style={styles.metaRow}>
                <div>
                  <div style={styles.k}>Current</div>
                  <div style={styles.v}>{currentPlayer.current_price}</div>
                </div>
                <div>
                  <div style={styles.k}>Next (min)</div>
                  <div style={styles.v}>{currentPlayer.next_price}</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={styles.bidBox}>
          <div style={styles.amount}>{Number.isFinite(amount) ? amount : "—"}</div>
          <div style={styles.controls}>
            <button
              style={styles.btn}
              onClick={() =>
                setAmount((a) => Math.max(minBid, a - 1))
              }
              disabled={!currentPlayer || isSubmitting || isLeading || amount <= minBid}
            >
              −
            </button>
            <button
              style={styles.btn}
              onClick={() => setAmount((a) => Math.max(minBid, a + 1))}
              disabled={!currentPlayer || isSubmitting || isLeading}
            >
              +
            </button>
            <button style={styles.bidBtn} onClick={onBid} disabled={!canBid}>
              {isSubmitting ? "Bidding…" : isLeading ? "Leading" : "Bid"}
            </button>
          </div>

          {!currentPlayer ? null : (
            <div style={styles.helper}>
              {rosterFull
                ? `Roster full (${myTeam?.players?.length ?? 0}/${maxPerTeam}). Bidding disabled.`
                : `Min bid is ${minBid}. ${
                    isLeading ? "You are currently leading." : "Bid enabled when you can outbid."
                  }`}
            </div>
          )}
          {actionError ? <div style={styles.error}>{actionError}</div> : null}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties | any> = {
  wrap: { display: "flex", justifyContent: "center" },
  card: {
    width: "min(520px, 100%)",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 16,
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: 950, fontSize: 22, letterSpacing: 0.2 },
  pill: (bg: string) => ({
    background: bg,
    color: "white",
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
  }),
  subRow: {
    display: "flex",
    gap: 14,
    alignItems: "flex-end",
    marginTop: 12,
    flexWrap: "wrap",
  },
  stat: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: "10px 12px",
    minWidth: 120,
  },
  k2: { opacity: 0.7, fontSize: 12 },
  v2: { fontWeight: 950, fontSize: 18, marginTop: 2 },
  hint: { opacity: 0.75, fontSize: 12, marginLeft: "auto" },
  hintCode: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "2px 6px",
    borderRadius: 8,
  },
  playerBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  playerTitle: { fontWeight: 800, fontSize: 12, opacity: 0.8 },
  playerName: { fontWeight: 900, fontSize: 20, marginTop: 6 },
  muted: { opacity: 0.75, marginTop: 4, fontSize: 13 },
  metaRow: { display: "flex", gap: 20, marginTop: 10 },
  k: { opacity: 0.7, fontSize: 12 },
  v: { fontWeight: 900, fontSize: 22, marginTop: 2 },
  bidBox: { marginTop: 14 },
  amount: { fontSize: 44, fontWeight: 900, textAlign: "center", marginBottom: 10 },
  controls: { display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 },
  btn: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    padding: "12px 0",
    borderRadius: 14,
    fontSize: 20,
    cursor: "pointer",
  },
  bidBtn: {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "linear-gradient(135deg, rgba(79,70,229,0.9), rgba(99,102,241,0.9))",
    color: "white",
    padding: "12px 0",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
  helper: { opacity: 0.75, fontSize: 12, marginTop: 10, textAlign: "center" },
  error: {
    marginTop: 10,
    color: "#fecaca",
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.25)",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 12,
  },
};





