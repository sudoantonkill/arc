import { useMyRoles } from "@/hooks/useMyRoles";
import { Navigate } from "react-router-dom";

export default function AppIndexRedirect() {
  const { roles, isLoading } = useMyRoles(true);

  if (isLoading) {
    return (
      <main className="min-h-[60vh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  console.log("[AppIndexRedirect] User roles:", roles);

  // If user has no role, redirect to sign-up
  if (roles.length === 0) {
    console.log("[AppIndexRedirect] No roles, redirecting to sign-up");
    return <Navigate to="/sign-up" replace />;
  }

  const primaryRole = roles[0];
  console.log("[AppIndexRedirect] Primary role:", primaryRole);

  // Route based on primary role
  if (primaryRole === "admin") {
    return <Navigate to="/app/admin" replace />;
  }

  if (primaryRole === "interviewer") {
    return <Navigate to="/app/interviewer" replace />;
  }

  if (primaryRole === "student") {
    return <Navigate to="/app/student" replace />;
  }

  // Fallback to sign-up if somehow no valid role
  console.log("[AppIndexRedirect] Unknown role, redirecting to sign-up");
  return <Navigate to="/sign-up" replace />;
}
