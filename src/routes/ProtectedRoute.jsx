import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMyRoles, primaryHome } from "../services/roles";

export default function ProtectedRoute({ kind = "business", children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [roles, setRoles] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setChecking(false); setRoles(null); return; }
    let mounted = true;
    setChecking(true);
    getMyRoles()
      .then((r) => { if (mounted) setRoles(r); })
      .catch(() => { if (mounted) setRoles(null); })
      .finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, [loading, user]);

  if (loading || checking) {
    return <div className="container" style={{ padding: 32 }}>Loading…</div>;
  }

  if (!user) {
    const loginPath =
      kind === "admin" ? "/admin/login"
      : kind === "customer" ? "/customer/login"
      : "/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  const required =
    kind === "admin" ? roles?.is_admin
    : kind === "customer" ? roles?.is_customer
    : roles?.is_business_member;

  if (!required) {
    // Signed in, but wrong portal → send to their correct home.
    return <Navigate to={primaryHome(roles)} replace />;
  }

  return children;
}