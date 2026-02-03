import { useSession } from "@/hooks/useSession";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import * as React from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, isLoading } = useSession();
  const supabase = getSupabaseClient();

  React.useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // For PKCE/email links that send ?code=..., exchange it.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    void supabase.auth.exchangeCodeForSession(code).finally(() => {
      // Clean URL (remove code param) after exchange attempt.
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.toString());
    });
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    if (!isSupabaseConfigured()) {
      navigate("/sign-in", { replace: true });
      return;
    }

    if (session && supabase) {
      void (async () => {
        // 1) Bootstrap admin if allowlisted
        try {
          await supabase.rpc("bootstrap_admin");
        } catch {
          // ignore
        }

        // 2) Check if user already has a role
        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .limit(1);

        const hasExistingRole = existingRoles && existingRoles.length > 0;
        let finalRole: string | null = hasExistingRole ? existingRoles[0].role : null;

        console.log("[AuthCallback] Existing role:", finalRole);

        // 3) Get pending role from localStorage (set during sign-up)
        let pendingRole: string | null = null;
        try {
          pendingRole = window.localStorage.getItem("pending_role");
          console.log("[AuthCallback] Pending role from localStorage:", pendingRole);
        } catch {
          pendingRole = null;
        }

        // 4) If no existing role and we have a pending role, set it now
        if (!hasExistingRole && (pendingRole === "student" || pendingRole === "interviewer")) {
          console.log("[AuthCallback] Setting role:", pendingRole);

          const { error: roleError } = await supabase.rpc("set_my_role", { _role: pendingRole });

          if (roleError) {
            console.error("[AuthCallback] Failed to set role:", roleError);
          } else {
            console.log("[AuthCallback] Role set successfully:", pendingRole);
            finalRole = pendingRole;

            // Also create the profile for the user
            const userId = session.user.id;
            if (pendingRole === "student") {
              await supabase
                .from("student_profiles")
                .upsert({ user_id: userId }, { onConflict: "user_id" });
            } else if (pendingRole === "interviewer") {
              await supabase
                .from("interviewer_profiles")
                .upsert({ user_id: userId, verification_status: "approved" }, { onConflict: "user_id" });
            }
          }
        }

        // 5) Always clean up pending_role
        try {
          window.localStorage.removeItem("pending_role");
        } catch {
          // ignore
        }

        // 6) Navigate directly to the appropriate dashboard
        if (finalRole === "admin") {
          navigate("/app/admin", { replace: true });
        } else if (finalRole === "interviewer") {
          navigate("/app/interviewer", { replace: true });
        } else if (finalRole === "student") {
          navigate("/app/student", { replace: true });
        } else {
          // No role set - go to role-setup as fallback
          navigate("/role-setup", { replace: true });
        }
      })();
    } else {
      navigate("/sign-in", { replace: true });
    }
  }, [isLoading, navigate, session]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Signing you in…</p>
    </main>
  );
}
