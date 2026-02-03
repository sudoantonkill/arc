import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearSupabaseConfig, getSupabaseConfig } from "@/lib/supabaseClient";

function maskUrl(url?: string) {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return "(invalid url)";
  }
}

export default function BackendNotConfigured({
  title,
  hint,
}: {
  title: string;
  hint?: React.ReactNode;
}) {
  const cfg = getSupabaseConfig();

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-xl py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">
            The app can’t see your backend settings yet. In Preview, Project Secrets sometimes don’t inject until the
            preview process restarts.
          </p>
          {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
        </header>

        <Card className="mt-6 p-6">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Detected URL</dt>
              <dd className="font-mono">{maskUrl(cfg.url)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">URL source</dt>
              <dd className="font-mono">{cfg.urlSource}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Key source</dt>
              <dd className="font-mono">{cfg.anonKeySource}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild>
              <Link to="/setup">Configure via /setup</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/backend-status">Open backend status</Link>
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
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Tip: If you already set Project Secrets, try opening a brand-new Preview tab (or restarting Preview) and then
            refresh.
          </p>
        </Card>
      </section>
    </main>
  );
}
