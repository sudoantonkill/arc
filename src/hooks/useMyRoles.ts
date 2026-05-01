import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type AppRole = "admin" | "student" | "interviewer";

export function useMyRoles(enabled: boolean) {
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(enabled);
  const [error, setError] = React.useState<string | null>(null);
  const fetchedRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!enabled || !supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const { data, error: e } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (e) {
      setError(e.message);
      setRoles([]);
    } else {
      const nextRoles = (data ?? []).map((r) => r.role as AppRole);
      setRoles(nextRoles);
    }

    setIsLoading(false);
    fetchedRef.current = true;
  }, [enabled]);

  React.useEffect(() => {
    if (enabled && !fetchedRef.current) {
      void refresh();
    }
  }, [enabled, refresh]);

  return { roles, isLoading, error, refresh };
}
