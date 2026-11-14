import { useEffect } from "react";
import { socket } from "@/realtime/socket";
import { ingest } from "@/realtime/eventMapper";
import { useUIStore } from "@/state/useUIStore";
import { useNarrationStore } from "@/state/useNarrationStore";
import { startSimulatedFeed, stopSimulatedFeed } from "@/realtime/simulatedFeed";
import { startLocalNarration, stopLocalNarration } from "@/realtime/localNarration";

/**
 * Boots the realtime connection once at app start.
 *
 *   connected     server events + server narration
 *   disconnected  local simulated feed + local template narrator
 *
 * The local pair starts immediately so the planet is alive on first paint,
 * and hands over as soon as the server's first event arrives.
 */
export function useRealtime() {
  const setConnected = useUIStore((s) => s.setConnected);

  useEffect(() => {
    const goLocal = () => {
      startSimulatedFeed();
      startLocalNarration();
    };
    const goServer = () => {
      stopSimulatedFeed();
      stopLocalNarration();
    };

    const offMsg = socket.on((msg) => {
      if (msg.type === "event") {
        goServer();
        ingest(msg.event);
      } else if (msg.type === "narration") {
        const n = msg.narration;
        if (n && typeof n.id === "string" && typeof n.text === "string") {
          useNarrationStore.getState().push({ ...n, text: n.text.slice(0, 240) });
        }
      }
    });
    const offConn = socket.onConnect((c) => {
      setConnected(c);
      if (!c) goLocal();
    });

    goLocal();
    // Deferred one tick: React StrictMode mounts, unmounts and remounts
    // synchronously in development, and this keeps that from opening (and
    // immediately abandoning) a socket.
    const connectTimer = window.setTimeout(() => socket.connect(), 0);

    return () => {
      window.clearTimeout(connectTimer);
      offMsg();
      offConn();
      goServer();
      socket.close();
    };
  }, [setConnected]);
}
