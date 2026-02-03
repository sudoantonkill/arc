import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type AppRole = "admin" | "student" | "interviewer";

export function useMyRoles(enabled: boolean) {
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  // Start with isLoading=true if enabled, so components wait for the initial fetch
  const [isLoading, setIsLoading] = React.useState(enabled);
  const [error, setError] = React.useState<string | null>(null);
  const [hasFetched, setHasFetched] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!enabled || !supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error: e } = await supabase
      .from("user_roles")
      .select("role")
      // RLS restricts to current user; no need to filter by user_id.
      .order("created_at", { ascending: true });

    if (e) {
      setError(e.message);
      setRoles([]);
      setIsLoading(false);
      setHasFetched(true);
      return;
    }

    const nextRoles = (data ?? []).map((r) => r.role as AppRole);
    setRoles(nextRoles);
    setIsLoading(false);
    setHasFetched(true);
  }, [enabled]);

  React.useEffect(() => {
    if (enabled && !hasFetched) {
      void refresh();
    }
  }, [enabled, hasFetched, refresh]);

  // If not enabled, don't show as loading
  const effectiveLoading = enabled ? (isLoading || !hasFetched) : false;

  return { roles, isLoading: effectiveLoading, error, refresh };
}

