import * as React from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import BackendNotConfigured from "@/components/backend/BackendNotConfigured";

const schema = z.object({ email: z.string().email() });
type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const { toast } = useToast();

  const supabase = getSupabaseClient();

  if (!isSupabaseConfigured() || !supabase)
    return (
      <BackendNotConfigured
        title="Reset password"
        hint={
          <Link className="text-primary underline-offset-4 hover:underline" to="/sign-in">
            Back to sign in
          </Link>
        }
      />
    );

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: Values) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Check your email",
      description: "If an account exists, you’ll receive a password reset link.",
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-md py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground">We’ll email you a reset link.</p>
        </header>

        <div className="mt-8">
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

              <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-sm">
            <Link className="text-primary underline-offset-4 hover:underline" to="/sign-in">
              Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
