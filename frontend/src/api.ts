import type { State, TeamName } from "./types";

// If VITE_API_BASE is set (e.g. production), use it.
// Otherwise, in dev we use the Vite proxy at /api so this works over tunnels on phones.
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? "";

function apiUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : `/api${path}`;
}

export async function fetchState(signal?: AbortSignal): Promise<State> {
  const res = await fetch(apiUrl("/state"), { signal });
  if (!res.ok) {
    throw new Error(`state_http_${res.status}`);
  }
  return (await res.json()) as State;
}

export async function postBid(team: TeamName, amount: number): Promise<State> {
  const res = await fetch(apiUrl("/bid"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team, amount }),
  });
  if (!res.ok) {
    let detail = `bid_http_${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as State;
}

export async function postSkip(): Promise<State> {
  const res = await fetch(apiUrl("/skip"), { method: "POST" });
  if (!res.ok) {
    let detail = `skip_http_${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as State;
}





