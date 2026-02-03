import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMyRoles } from "@/hooks/useMyRoles";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import BackendNotConfigured from "@/components/backend/BackendNotConfigured";

type PickableRole = "student" | "interviewer";

export default function RoleSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = React.useState<PickableRole>("student");
  const [isSaving, setIsSaving] = React.useState(false);

  const supabase = getSupabaseClient();

  const { roles, isLoading, error, refresh } = useMyRoles(Boolean(isSupabaseConfigured() && supabase));

  // Show loading state during role check to prevent flash
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!isSupabaseConfigured() || !supabase) return <BackendNotConfigured title="Finish setup" />;

  // If role already exists, redirect immediately (no useEffect to cause loop)
  const hasRole = roles.includes("student") || roles.includes("interviewer") || roles.includes("admin");
  if (hasRole) {
    return <Navigate to="/app" replace />;
  }

  const save = async () => {
    setIsSaving(true);

    // First, set the role
    const { error: rpcError } = await supabase.rpc("set_my_role", { _role: role });

    if (rpcError) {
      setIsSaving(false);
      toast({ title: "Could not set role", description: rpcError.message, variant: "destructive" });
      return;
    }

    // Then, create the corresponding profile
    // This ensures the user has a profile record for their role
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userId) {
      if (role === "student") {
        // Create student profile
        await supabase
          .from("student_profiles")
          .upsert({ user_id: userId }, { onConflict: "user_id" });
      } else if (role === "interviewer") {
        // Create interviewer profile - auto-approved for demo
        await supabase
          .from("interviewer_profiles")
          .upsert({
            user_id: userId,
            verification_status: "approved"
          }, { onConflict: "user_id" });
      }
    }

    setIsSaving(false);
    await refresh();
    navigate("/app", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-xl py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Finish account setup</h1>
          <p className="text-muted-foreground">Choose how you’ll use the platform. You can change later via support.</p>
        </header>

        <Card className="mt-8 p-6">
          {error ? (
            <p className="text-sm text-muted-foreground">
              Can’t load roles yet: <span className="font-mono">{error}</span>
            </p>
          ) : null}

          <div className="mt-2">
            <RadioGroup value={role} onValueChange={(v) => setRole(v as PickableRole)} className="grid gap-3">
              <div className="flex items-start gap-3 rounded-md border border-border p-3">
                <RadioGroupItem value="student" id="setup-student" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="setup-student">Student</Label>
                  <p className="text-sm text-muted-foreground">Book sessions, practice, and receive reports.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border border-border p-3">
                <RadioGroupItem value="interviewer" id="setup-interviewer" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="setup-interviewer">Interviewer</Label>
                  <p className="text-sm text-muted-foreground">Apply to conduct interviews and earn.</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isLoading}>
              {isLoading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={isSaving || isLoading}>
              {isSaving ? "Saving…" : "Continue"}
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
