import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import BackendNotConfigured from "@/components/backend/BackendNotConfigured";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type Values = z.infer<typeof schema>;

export default function UpdatePassword() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const supabase = getSupabaseClient();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!isSupabaseConfigured() || !supabase) return <BackendNotConfigured title="Set new password" />;

  const onSubmit = async (values: Values) => {
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast({ title: "Could not update password", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    navigate("/sign-in", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="container max-w-md py-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Set new password</h1>
          <p className="text-muted-foreground">Choose a strong password you don’t use elsewhere.</p>
        </header>

        <div className="mt-8">
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
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
                {form.formState.isSubmitting ? "Updating…" : "Update password"}
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
