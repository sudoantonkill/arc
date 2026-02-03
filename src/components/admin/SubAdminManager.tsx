import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Shield, Plus, Trash2, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminUser {
    email: string;
}

export default function SubAdminManager() {
    const supabase = getSupabaseClient();
    const { toast } = useToast();
    const { isMasterAdmin } = useAdminAuth();
    const [admins, setAdmins] = React.useState<AdminUser[]>([]);
    const [newAdminEmail, setNewAdminEmail] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAdding, setIsAdding] = React.useState(false);

    const fetchAdmins = React.useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);

        try {
            const { data, error } = await supabase
                .from('admin_allowlist')
                .select('email');

            if (data) {
                setAdmins(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    React.useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdminEmail || !supabase) return;

        setIsAdding(true);
        try {
            const { error } = await supabase
                .from('admin_allowlist')
                .insert({ email: newAdminEmail });

            if (error) throw error;

            toast({ title: "Admin added", description: `${newAdminEmail} can now register as an admin.` });
            setNewAdminEmail("");
            fetchAdmins();
        } catch (error: any) {
            toast({
                title: "Failed to add admin",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveAdmin = async (email: string) => {
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('admin_allowlist')
                .delete()
                .eq('email', email);

            if (error) throw error;

            toast({ title: "Admin removed", description: "Access revoked successfully." });
            fetchAdmins();
        } catch (error: any) {
            toast({
                title: "Failed to remove admin",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    if (!isMasterAdmin) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Sub-Admin Management
                    </CardTitle>
                    <CardDescription>
                        Only the Master Admin can manage sub-admins.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Manage Sub-Admins
                </CardTitle>
                <CardDescription>
                    Add emails to allow users to sign up as administrators.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleAddAdmin} className="flex gap-2">
                    <Input
                        type="email"
                        placeholder="new.admin@example.com"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isAdding}>
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Admin
                    </Button>
                </form>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admin Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-4">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : admins.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                        No sub-admins configured
                                    </TableCell>
                                </TableRow>
                            ) : (
                                admins.map((admin) => (
                                    <TableRow key={admin.email}>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveAdmin(admin.email)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
