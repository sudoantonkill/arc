import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseConfig, persistSupabaseConfig } from "@/lib/supabaseClient";

export default function Setup() {
  const initial = React.useMemo(() => getSupabaseConfig(), []);
  const [url, setUrl] = React.useState(initial.url ?? "");
  const [anonKey, setAnonKey] = React.useState(initial.anonKey ?? "");
  const [saved, setSaved] = React.useState(false);

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-xl py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Backend setup</h1>
          <p className="text-muted-foreground">
            If environment variables aren’t injected in your preview runtime, you can paste your public Supabase URL and
            anon key here (safe to store client-side).
          </p>
        </header>

        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">Supabase project URL</Label>
            <Input
              id="supabase-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-anon">Supabase anon public key</Label>
            <Input
              id="supabase-anon"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              autoComplete="off"
            />
          </div>

          <Button
            type="button"
            onClick={() => {
              persistSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
              setSaved(true);
              window.location.assign("/sign-in");
            }}
            disabled={!url.trim() || !anonKey.trim()}
          >
            Save & continue
          </Button>

          {saved ? <p className="text-sm text-muted-foreground">Saved. Redirecting…</p> : null}
        </div>
      </section>
    </main>
  );
}
