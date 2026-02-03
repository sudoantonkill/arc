import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { loginAsMaster, isAdmin, isLoading } = useAdminAuth();
    const [password, setPassword] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!isLoading && isAdmin) {
            navigate("/app/admin", { replace: true });
        }
    }, [isAdmin, isLoading, navigate]);

    const handleMasterLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulating network delay for better UX
        setTimeout(() => {
            const success = loginAsMaster(password);
            if (success) {
                toast({ title: "Welcome back, Admin" });
                navigate("/app/admin");
            } else {
                toast({
                    title: "Access Denied",
                    description: "Invalid credentials",
                    variant: "destructive"
                });
                setIsSubmitting(false);
            }
        }, 800);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Admin Access</CardTitle>
                    <CardDescription>
                        Enter master key or sign in as sub-admin
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleMasterLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Master Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Access Dashboard"
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate("/sign-in")}
                    >
                        Sign in as Sub-Admin
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
