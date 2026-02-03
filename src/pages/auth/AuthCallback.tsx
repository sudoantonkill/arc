import { useSession } from "@/hooks/useSession";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import * as React from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, isLoading } = useSession();
  const supabase = getSupabaseClient();
  const processedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    void supabase.auth.exchangeCodeForSession(code).finally(() => {
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.toString());
    });
  }, []);

  React.useEffect(() => {
    // Prevent double processing
    if (processedRef.current) return;
    if (isLoading) return;
    if (!isSupabaseConfigured() || !supabase) {
      navigate("/sign-in", { replace: true });
      return;
    }

    if (!session) {
      navigate("/sign-in", { replace: true });
      return;
    }

    processedRef.current = true;

    void (async () => {
      const userId = session.user.id;

      // Bootstrap admin if allowlisted
      try {
        await supabase.rpc("bootstrap_admin");
      } catch { }

      // Check existing role
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1);

      let finalRole = existingRoles?.[0]?.role ?? null;

      // Get pending role from localStorage
      let pendingRole: string | null = null;
      try {
        pendingRole = window.localStorage.getItem("pending_role");
      } catch { }

      // Set role if needed
      if (!finalRole && (pendingRole === "student" || pendingRole === "interviewer")) {
        await supabase.rpc("set_my_role", { _role: pendingRole });

        // Create profile
        if (pendingRole === "student") {
          await supabase.from("student_profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
        } else {
          await supabase.from("interviewer_profiles").upsert({ user_id: userId, verification_status: "approved" }, { onConflict: "user_id" });
        }

        // Wait for role to be saved
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 300));
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1);
          if (data?.[0]?.role) {
            finalRole = data[0].role;
            break;
          }
        }
      }

      // Clean up
      try {
        window.localStorage.removeItem("pending_role");
      } catch { }

      // Navigate to dashboard
      if (finalRole === "admin") {
        navigate("/app/admin", { replace: true });
      } else if (finalRole === "interviewer") {
        navigate("/app/interviewer", { replace: true });
      } else if (finalRole === "student") {
        navigate("/app/student", { replace: true });
      } else {
        navigate("/sign-up", { replace: true });
      }
    })();
  }, [isLoading, session, navigate, supabase]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Signing you in…</p>
    </main>
  );
}
