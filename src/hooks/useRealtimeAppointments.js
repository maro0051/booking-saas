import { useEffect, useId } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Subscribes to realtime changes on appointments for a business.
 * Each hook instance creates its own channel so multiple components can
 * subscribe to the same business without clashing.
 *
 * onEvent(kind) is called with 'INSERT' | 'UPDATE' | 'DELETE'.
 */
export function useRealtimeAppointments(businessId, onEvent) {
  const instanceId = useId();
  // useId returns something like ":r1:" — strip the colons for a valid
  // realtime topic name (only alphanumerics, dashes, and underscores).
  const suffix = String(instanceId).replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    if (!businessId) return;

    const topic = `appointments:${businessId}:${suffix}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          try { onEvent?.(payload.eventType, payload); } catch {}
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [businessId, suffix]);
}