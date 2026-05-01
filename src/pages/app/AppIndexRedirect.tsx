import { useMyRoles } from "@/hooks/useMyRoles";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function AppIndexRedirect() {
  const { roles, isLoading } = useMyRoles(true);
  const [isSettingRole, setIsSettingRole] = useState(false);

  if (isLoading) {
    return (
      <main className="min-h-[60vh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  // Route based on role
  if (roles.includes("admin")) {
    return <Navigate to="/app/admin" replace />;
  }

  if (roles.includes("interviewer")) {
    return <Navigate to="/app/interviewer" replace />;
  }

  if (roles.includes("student")) {
    return <Navigate to="/app/student" replace />;
  }

  const handleSetRole = async (role: "student" | "interviewer") => {
    setIsSettingRole(true);
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    // Call the RPC to set role
    await supabase.rpc("set_my_role", { _role: role });
    
    // Create the associated profile so foreign keys don't fail later
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (role === "student") {
        await supabase.from("student_profiles").upsert({ user_id: user.id }, { onConflict: "user_id" });
      } else {
        await supabase.from("interviewer_profiles").upsert({ user_id: user.id, verification_status: "approved" }, { onConflict: "user_id" });
      }
    }
    
    // Reload page to re-trigger Auth checks and routing
    window.location.reload();
  };

  // No role - show inline role selection to prevent redirect loops
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <h1 className="text-3xl font-semibold mb-3 tracking-tight">Welcome to ArcInterview!</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        It looks like your account doesn't have a role assigned yet. Please select how you want to use the platform.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button 
          size="lg" 
          onClick={() => handleSetRole("student")}
          disabled={isSettingRole}
          className="w-full"
        >
          {isSettingRole ? "Setting up..." : "I'm a Student"}
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          onClick={() => handleSetRole("interviewer")}
          disabled={isSettingRole}
          className="w-full"
        >
          I'm an Interviewer
        </Button>
      </div>
    </main>
  );
}
