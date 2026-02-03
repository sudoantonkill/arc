import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/useSession";

export type AppRole = "admin" | "student" | "interviewer";

export function useMyRoles(enabled: boolean) {
  const { session } = useSession();
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = React.useState(enabled);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUserId, setLastUserId] = React.useState<string | null>(null);

  const currentUserId = session?.user?.id ?? null;

  const refresh = React.useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!enabled || !supabase || !currentUserId) {
      setIsLoading(false);
      return;
    }

    console.log("[useMyRoles] Fetching roles for user:", currentUserId);
    setIsLoading(true);
    setError(null);

    // Explicitly filter by user_id to avoid any RLS caching issues
    const { data, error: e } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (e) {
      console.error("[useMyRoles] Error fetching roles:", e);
      setError(e.message);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const nextRoles = (data ?? []).map((r) => r.role as AppRole);
    console.log("[useMyRoles] Fetched roles for", currentUserId, ":", nextRoles);
    setRoles(nextRoles);
    setIsLoading(false);
    setLastUserId(currentUserId);
  }, [enabled, currentUserId]);

  // Reset and refetch when user changes
  React.useEffect(() => {
    if (currentUserId !== lastUserId) {
      console.log("[useMyRoles] User changed from", lastUserId, "to", currentUserId, "- resetting roles");
      setRoles([]);
      setLastUserId(null);
      if (enabled && currentUserId) {
        void refresh();
      }
    }
  }, [currentUserId, lastUserId, enabled, refresh]);

  // Initial fetch
  React.useEffect(() => {
    if (enabled && currentUserId && lastUserId === null) {
      void refresh();
    }
  }, [enabled, currentUserId, lastUserId, refresh]);

  const effectiveLoading = enabled ? (isLoading || (currentUserId && lastUserId !== currentUserId)) : false;

  return { roles, isLoading: effectiveLoading, error, refresh };
}
