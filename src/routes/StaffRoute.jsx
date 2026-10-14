import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

export default function StaffRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setChecking(false); setAllowed(false); return; }

    let mounted = true;
    supabase.rpc("my_staff_row").then(({ data, error }) => {
      if (!mounted) return;
      const row = Array.isArray(data) ? data[0] : data;
      setAllowed(!error && !!row);
      setChecking(false);
    });
    return () => { mounted = false; };
  }, [loading, user]);

  if (loading || checking) {
    return <div className="container" style={{ padding: 32 }}>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }
  if (!allowed) {
    return <Navigate to="/staff/login" replace />;
  }
  return children;
}