import * as React from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import BackendNotConfigured from "@/components/backend/BackendNotConfigured";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type Values = z.infer<typeof schema>;

export default function SignIn() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from as string | undefined;
  const { session, isLoading: sessionLoading } = useSession();
  const supabase = getSupabaseClient();

  // All hooks must be called before any conditional returns
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // Show loading while checking session
  if (sessionLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  // Redirect already logged-in users to app
  if (session) {
    return <Navigate to="/app" replace />;
  }

  if (!isSupabaseConfigured() || !supabase) return <BackendNotConfigured title="Sign in" />;

  const onSubmit = async (values: Values) => {
    const { email, password } = values;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    // RequireAuth will handle role-setup redirect if user has no role
    navigate(from ?? "/app", { replace: true });
  };

  const signInWithGoogle = async () => {
    // Clear pending_role since this is sign-in (existing users already have roles)
    try {
      window.localStorage.removeItem("pending_role");
    } catch {
      // ignore
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header with logo and back button */}
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity">
            <span className="text-lg">MockInterview</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <section className="container max-w-md py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground">Welcome back — pick up where you left off.</p>
        </header>

        <div className="mt-8">
          <Button className="w-full" type="button" variant="outline" onClick={() => void signInWithGoogle()}>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or sign in with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input autoComplete="email" inputMode="email" placeholder="you@domain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link className="text-primary underline-offset-4 hover:underline" to="/reset-password">
              Forgot password?
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" to="/sign-up">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
