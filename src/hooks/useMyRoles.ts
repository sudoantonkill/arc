import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type AppRole = "admin" | "student" | "interviewer";

export function useMyRoles(enabled: boolean) {
  const supabase = getSupabaseClient();

  const { data: roles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['my_roles'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error: e } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (e) throw e;
      return (data ?? []).map((r) => r.role as AppRole);
    },
    enabled: enabled && !!supabase,
    staleTime: 1000 * 60 * 5, // Cache roles for 5 minutes
  });

  return { 
    roles, 
    isLoading: enabled ? isLoading : false, 
    error: error instanceof Error ? error.message : null, 
    refresh: refetch 
  };
}
