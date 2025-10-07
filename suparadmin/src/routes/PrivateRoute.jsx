import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PrivateRoute = ({ children, roles = [], userTypes = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleVal = user.role;                         // legacy "admin"
  const typeVal = user.userType || user.type || roleVal; // real role for routing

  const wantRole = Array.isArray(roles) && roles.length > 0;
  const wantType = Array.isArray(userTypes) && userTypes.length > 0;

  // If constraints provided, allow if ANY matches (don’t fail early on role mismatch)
  if (wantRole || wantType) {
    const roleOk = wantRole ? roles.includes(roleVal) : false;
    const typeOk = wantType ? userTypes.includes(typeVal) : false;
    if (!(roleOk || typeOk)) return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;
