import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { User, LogOut } from "lucide-react";

export default function MarketingHeader() {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();
  const supabase = getSupabaseClient();

  const handleSignOut = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-border">
            <span className="text-sm font-semibold tracking-tight">MI</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">ArcInterview</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#how-it-works">
            How it works
          </a>
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#pricing">
            Pricing
          </a>
          <a className="text-sm text-muted-foreground hover:text-foreground" href="#faq">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : session ? (
            /* Logged in: show profile circle and dashboard link */
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app">Dashboard</Link>
              </Button>
              <Link
                to="/app"
                className="flex items-center justify-center h-9 w-9 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                title={session.user.email || "Profile"}
              >
                <User className="h-4 w-4" />
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            /* Logged out: show sign in and sign up buttons */
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

