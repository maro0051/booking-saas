import { useCallback, useEffect, useState } from "react";
import { getPlanLimits } from "../services/planLimits";
import { useRealtimeAppointments } from "./useRealtimeAppointments";

/**
 * Loads the current business's plan limits and refresh them on any
 * appointment change (so the appointment quota stays fresh).
 */
export function usePlanLimits(businessId) {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    try {
      const l = await getPlanLimits(businessId);
      setLimits(l);
    } catch {
      // Non-fatal — UI just won't show the limits widget
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  useRealtimeAppointments(businessId, () => refresh());

  return { limits, loading, refresh };
}