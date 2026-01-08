import { useEffect, useMemo, useState } from "react";

export type Route =
  | { name: "auctioneer" }
  | { name: "team"; team?: string };

function parseHash(hash: string): Route {
  // Supported:
  //  - #/auctioneer
  //  - #/team?team=Red
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, query] = h.split("?");
  const p = path?.replace(/^\/+/, "") || "auctioneer";
  const params = new URLSearchParams(query ?? "");

  if (p === "team") {
    // Default to Red if not provided so `#/team` works.
    return { name: "team", team: params.get("team") ?? "Red" };
  }
  return { name: "auctioneer" };
}

export function useHashRoute(): Route {
  const [hash, setHash] = useState<string>(() => window.location.hash || "#/auctioneer");

  useEffect(() => {
    function onHashChange() {
      setHash(window.location.hash || "#/auctioneer");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return useMemo(() => parseHash(hash), [hash]);
}

export function navigateToAuctioneer() {
  window.location.hash = "#/auctioneer";
}

export function navigateToTeam(team?: string) {
  const qp = `?team=${encodeURIComponent(team ?? "Red")}`;
  window.location.hash = `#/team${qp}`;
}







