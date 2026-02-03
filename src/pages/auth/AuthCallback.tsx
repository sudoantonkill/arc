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

    // Once we have a session, continue into role setup.
    if (session && supabase) {
      void (async () => {
        // 1) If this email is allowlisted and no admin exists yet, grant admin (server-side check).
        // Safe no-op if RPC doesn't exist yet or user isn't allowlisted.
        try {
          await supabase.rpc("bootstrap_admin");
        } catch {
          // ignore
        }

        // 2) Check if user already has a role - if so, skip role assignment
        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .limit(1);

        const hasExistingRole = existingRoles && existingRoles.length > 0;
        console.log("[AuthCallback] Existing roles:", existingRoles, "hasExistingRole:", hasExistingRole);

        // 3) If a role was chosen before Google OAuth AND user doesn't have a role yet, apply it now.
        let pendingRole: string | null = null;
        try {
          pendingRole = window.localStorage.getItem("pending_role");
          console.log("[AuthCallback] Retrieved pending_role from localStorage:", pendingRole);
        } catch (e) {
          console.error("[AuthCallback] Failed to read pending_role:", e);
          pendingRole = null;
        }

        // Only set the role if the user doesn't already have one
        if (!hasExistingRole && (pendingRole === "student" || pendingRole === "interviewer")) {
          console.log("[AuthCallback] Attempting to set role:", pendingRole);
          try {
            const { error: roleError } = await supabase.rpc("set_my_role", { _role: pendingRole });
            if (roleError) {
              console.error("[AuthCallback] Failed to set role:", roleError);
            } else {
              console.log("[AuthCallback] Successfully set role:", pendingRole);
            }
          } catch (e) {
            console.error("[AuthCallback] Exception setting role:", e);
          }
        } else if (hasExistingRole) {
          console.log("[AuthCallback] User already has role, skipping role assignment");
        } else {
          console.log("[AuthCallback] No valid pending_role found, user will go to role-setup");
        }

        // Always clean up pending_role from localStorage
        try {
          window.localStorage.removeItem("pending_role");
        } catch {
          // ignore
        }

        navigate("/role-setup", { replace: true });
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
