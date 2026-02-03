import { Button } from "@/components/ui/button";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function Dashboard() {
  const supabase = getSupabaseClient();
  return (
    <main className="min-h-screen bg-background">
      <section className="container py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">You’re signed in. Next: roles + marketplace.</p>
        </header>

        <div className="mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!isSupabaseConfigured() || !supabase) return;
              void supabase.auth.signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
