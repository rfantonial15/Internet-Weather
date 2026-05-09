import { useEffect } from "react";
import { socket } from "@/realtime/socket";
import { ingest } from "@/realtime/eventMapper";
import { useUIStore } from "@/state/useUIStore";
import { useNarrationStore } from "@/state/useNarrationStore";
import { startSimulatedFeed, stopSimulatedFeed } from "@/realtime/simulatedFeed";

/**
 * Boot the realtime connection once at app start. Falls back to a local
 * simulated feed if the server cannot be reached — the app is never empty.
 */
export function useRealtime() {
  const setConnected = useUIStore((s) => s.setConnected);

  useEffect(() => {
    const offMsg = socket.on((msg) => {
      if (msg.type === "event") {
        stopSimulatedFeed();
        ingest(msg.event);
      } else if (msg.type === "narration") {
        useNarrationStore.getState().push(msg.narration);
      }
    });
    const offConn = socket.onConnect((c) => {
      setConnected(c);
      if (!c) startSimulatedFeed();
      else stopSimulatedFeed();
    });

    socket.connect();
    // Always seed something immediately so the planet isn't empty on first paint.
    startSimulatedFeed();

    return () => {
      offMsg();
      offConn();
      stopSimulatedFeed();
      socket.close();
    };
  }, [setConnected]);
}
