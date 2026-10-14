import { useOutletContext } from "react-router-dom";

export function useBusinessContext() {
  const ctx = useOutletContext();
  if (!ctx || !ctx.business) {
    throw new Error("useBusinessContext must be used inside BusinessLayout.");
  }
  return ctx.business;
}