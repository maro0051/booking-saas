import ProtectedRoute from "./ProtectedRoute";

export default function AdminRoute({ children }) {
  return <ProtectedRoute kind="admin">{children}</ProtectedRoute>;
}