import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useMyRoles, AppRole } from "@/hooks/useMyRoles";
import BackendNotConfigured from "@/components/backend/BackendNotConfigured";

interface RequireAuthProps {
  children: React.ReactNode;
  enforceRole?: boolean;
  allowedRoles?: AppRole[];
}

export default function RequireAuth({
  children,
  enforceRole = true,
  allowedRoles,
}: RequireAuthProps) {
  const { session, isLoading } = useSession();
  const location = useLocation();
  const configured = isSupabaseConfigured();
  const { roles, isLoading: isRolesLoading } = useMyRoles(Boolean(configured && session));

  if (!configured) return <BackendNotConfigured title="Backend not configured" />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    // Check for master admin bypass
    const masterSession = localStorage.getItem("master_admin_session");
    if (masterSession) {
      try {
        const parsed = JSON.parse(masterSession);
        if (new Date(parsed.expires_at) > new Date()) {
          return <>{children}</>;
        }
      } catch (e) {
        // Invalid session
      }
    }
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (enforceRole) {
    if (isRolesLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      );
    }

    const hasAnyRole = roles.includes("admin") || roles.includes("student") || roles.includes("interviewer");
    if (!hasAnyRole) {
      return <Navigate to="/role-setup" replace />;
    }

    // Check if user has one of the allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(role => roles.includes(role));

      if (!hasAllowedRole) {
        // Redirect to the user's appropriate dashboard based on their actual role
        if (roles.includes("admin")) {
          return <Navigate to="/app/admin" replace />;
        } else if (roles.includes("interviewer")) {
          return <Navigate to="/app/interviewer" replace />;
        } else if (roles.includes("student")) {
          return <Navigate to="/app/student" replace />;
        }
        // Fallback
        return <Navigate to="/app" replace />;
      }
    }
  }

  return <>{children}</>;
}

