import * as React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import BackendNotConfigured from "@/components/backend/BackendNotConfigured";

const roleSchema = z.enum(["student", "interviewer"]);

const schema = z
  .object({
    role: roleSchema,
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type Values = z.infer<typeof schema>;

export default function SignUp() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, isLoading: sessionLoading } = useSession();
  const supabase = getSupabaseClient();

  // All hooks must be called before any conditional returns
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student", email: "", password: "", confirmPassword: "" },
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

  if (!isSupabaseConfigured() || !supabase) return <BackendNotConfigured title="Create account" />;

  const signUpWithGoogle = async () => {
    const role = form.getValues("role");
    console.log("[SignUp] Selected role:", role);
    try {
      window.localStorage.setItem("pending_role", role);
      console.log("[SignUp] Saved pending_role to localStorage:", role);
    } catch (e) {
      console.error("[SignUp] Failed to save pending_role:", e);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast({ title: "Google sign-up failed", description: error.message, variant: "destructive" });
    }
  };

  const onSubmit = async (values: Values) => {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }

    // If email confirmations are disabled, we'll get a session immediately and can assign the role right away.
    // If not, role will be assigned on first authenticated login using the same RPC.
    if (data.session) {
      const { error: roleError } = await supabase.rpc("set_my_role", { _role: values.role });
      if (roleError) {
        toast({
          title: "Account created, but role not set",
          description: roleError.message,
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Check your email",
      description:
        "We sent you a confirmation link. After confirming, sign in and we’ll finish setting up your account.",
    });
    navigate("/sign-in");
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
          <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
          <p className="text-muted-foreground">Start booking paid mock interviews in minutes.</p>
        </header>

        <div className="mt-8">
          {/* Role selection - now at the top for both Google and email signup */}
          <div className="mb-6 p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium mb-3">I'm signing up as:</p>
            <RadioGroup
              value={form.watch("role")}
              onValueChange={(v) => form.setValue("role", v as "student" | "interviewer")}
              className="grid gap-2"
            >
              <div className="flex items-center gap-3 rounded-md border border-border p-3 bg-background">
                <RadioGroupItem value="student" id="role-student" />
                <div>
                  <Label htmlFor="role-student" className="font-medium">Student</Label>
                  <p className="text-xs text-muted-foreground">Book interviews and receive reports</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-border p-3 bg-background">
                <RadioGroupItem value="interviewer" id="role-interviewer" />
                <div>
                  <Label htmlFor="role-interviewer" className="font-medium">Interviewer</Label>
                  <p className="text-xs text-muted-foreground">Conduct interviews and earn</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Button className="w-full" type="button" variant="outline" onClick={() => void signUpWithGoogle()}>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or sign up with email</span>
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
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create account"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-sm">
            <Link className="text-primary underline-offset-4 hover:underline" to="/sign-in">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
