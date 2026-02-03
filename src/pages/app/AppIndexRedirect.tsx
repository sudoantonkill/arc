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

  // Route based on role
  if (roles.includes("admin")) {
    return <Navigate to="/app/admin" replace />;
  }

  if (roles.includes("interviewer")) {
    return <Navigate to="/app/interviewer" replace />;
  }

  if (roles.includes("student")) {
    return <Navigate to="/app/student" replace />;
  }

  // No role - go to sign-up
  return <Navigate to="/sign-up" replace />;
}
