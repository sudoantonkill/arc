import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearSupabaseConfig, getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";

function maskUrl(url?: string) {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "(invalid url)";
  }
}

function maskKey(key?: string) {
  if (!key) return "—";
  if (key.length <= 16) return "(present)";
  return `${key.slice(0, 8)}…${key.slice(-6)}`;
}

export default function BackendStatus() {
  const cfg = getSupabaseConfig();
  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-2xl py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Backend status</h1>
          <p className="text-muted-foreground">
            This page shows what the app can actually read at runtime (Env vs LocalStorage).
          </p>
        </header>

        <Card className="mt-6 p-6">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Configured</dt>
              <dd className="font-mono">{configured ? "true" : "false"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Supabase URL</dt>
              <dd className="font-mono">{maskUrl(cfg.url)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">URL source</dt>
              <dd className="font-mono">{cfg.urlSource}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Anon key</dt>
              <dd className="font-mono">{maskKey(cfg.anonKey)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Key source</dt>
              <dd className="font-mono">{cfg.anonKeySource}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild>
              <Link to="/setup">Go to /setup</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearSupabaseConfig();
                window.location.reload();
              }}
            >
              Clear local config
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
