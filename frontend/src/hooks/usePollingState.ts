import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchState } from "../api";
import type { State } from "../types";

export function usePollingState(intervalMs = 1000) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const lastEventIdRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const ac = new AbortController();
    try {
      const s = await fetchState(ac.signal);
      lastEventIdRef.current = s.event_id;
      setState(s);
      setError(null);
      setIsLoading(false);
    } catch (e) {
      if ((e as any)?.name === "AbortError") return;
      setError((e as Error).message ?? "unknown_error");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    async function tick() {
      try {
        const s = await fetchState(ac.signal);
        if (!mounted) return;
        lastEventIdRef.current = s.event_id;
        setState(s);
        setError(null);
        setIsLoading(false);
      } catch (e) {
        if (!mounted) return;
        if ((e as any)?.name === "AbortError") return;
        setError((e as Error).message ?? "unknown_error");
        setIsLoading(false);
      }
    }

    tick();
    const id = window.setInterval(tick, intervalMs);

    return () => {
      mounted = false;
      ac.abort();
      window.clearInterval(id);
    };
  }, [intervalMs]);

  const connection = useMemo(() => {
    if (isLoading) return "loading";
    if (error) return "error";
    return "ok";
  }, [error, isLoading]);

  return { state, error, isLoading, connection, lastEventId: lastEventIdRef.current, refresh };
}





