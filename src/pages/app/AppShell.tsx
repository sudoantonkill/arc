import { Button } from "@/components/ui/button";
import { useMyRoles } from "@/hooks/useMyRoles";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Link, Outlet, useLocation } from "react-router-dom";

function NavItem({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      className={
        isActive
          ? "text-sm font-medium text-foreground"
          : "text-sm text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

export default function AppShell() {
  const location = useLocation();
  const configured = isSupabaseConfigured();
  const supabase = getSupabaseClient();
  const { roles, isLoading } = useMyRoles(Boolean(configured));

  // Show loading state while roles are being fetched to prevent flickering
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  // Debug: log roles
  console.log("[AppShell] User roles:", roles);

  // Determine the user's PRIMARY role (first one in array, ordered by created_at)
  const primaryRole = roles[0] || null;
  const isAdmin = primaryRole === "admin";

  console.log("[AppShell] Primary role:", primaryRole);

  // Show only the user's primary role tab (exactly one tab for non-admins)
  const showStudentTab = primaryRole === "student";
  const showInterviewerTab = primaryRole === "interviewer";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            MockInterview
          </Link>

          <nav className="flex items-center gap-6" aria-label="App">
            {/* Show only the user's primary role tab */}
            {showStudentTab && !showInterviewerTab && (
              <NavItem
                to="/app/student"
                label="Student"
                isActive={location.pathname.startsWith("/app/student")}
              />
            )}
            {showInterviewerTab && !showStudentTab && (
              <NavItem
                to="/app/interviewer"
                label="Interviewer"
                isActive={location.pathname.startsWith("/app/interviewer")}
              />
            )}
            {/* Admins see all tabs */}
            {isAdmin && (
              <>
                <NavItem
                  to="/app/student"
                  label="Student"
                  isActive={location.pathname.startsWith("/app/student")}
                />
                <NavItem
                  to="/app/interviewer"
                  label="Interviewer"
                  isActive={location.pathname.startsWith("/app/interviewer")}
                />
                <NavItem to="/app/admin" label="Admin" isActive={location.pathname.startsWith("/app/admin")} />
              </>
            )}
          </nav>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (!isSupabaseConfigured() || !supabase) return;
              void supabase.auth.signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
