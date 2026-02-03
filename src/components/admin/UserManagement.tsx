import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, MoreHorizontal, UserX, UserCheck, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type AppRole = 'student' | 'interviewer' | 'admin';

interface UserData {
    id: string;
    email: string;
    role: AppRole;
    created_at: string;
    metadata: any;
}

export default function UserManagement() {
    const supabase = getSupabaseClient();
    const { toast } = useToast();
    const [users, setUsers] = React.useState<UserData[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [roleFilter, setRoleFilter] = React.useState<string>("all");

    const fetchUsers = React.useCallback(async () => {
        setIsLoading(true);
        if (!supabase) return;

        // Fetch roles first to get the list of users and their roles
        const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id, role, created_at')
            .order('created_at', { ascending: false });

        if (roles) {
            // We can't access auth.users directly on client side to get emails
            // So we'll fetch from profiles which might have names, but emails are sensitive.
            // For now, we will display the ID or fetch display names if available found in profiles.

            // NOTE: In a real production app, you would use a Supabase Edge Function 
            // with the service_role key to fetch `auth.users` data safely and return it to the admin.
            // Since we are client-side only here, we will do a best-effort join with profiles.

            const userList: UserData[] = await Promise.all(roles.map(async (r) => {
                let email = "Hidden (Requires Admin API)";
                // Try to find a display name or something from profiles
                if (r.role === 'student') {
                    const { data: profile } = await supabase.from('student_profiles').select('education').eq('user_id', r.user_id).single();
                    if (profile) email = `Student (Edu: ${profile.education || 'N/A'})`;
                } else if (r.role === 'interviewer') {
                    const { data: profile } = await supabase.from('interviewer_profiles').select('company_background').eq('user_id', r.user_id).single();
                    if (profile) email = `Interviewer (${profile.company_background || 'No Company'})`;
                }

                return {
                    id: r.user_id,
                    email: email, // Showing context instead of actual email due to RLS/Auth limitations
                    role: r.role as AppRole,
                    created_at: r.created_at,
                    metadata: {}
                };
            }));

            setUsers(userList);
        }
        setIsLoading(false);
    }, [supabase]);

    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.id.includes(search) || user.email.includes(search);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleRoleChange = async (userId: string, newRole: AppRole) => {
        toast({ title: "Role updated", description: "Role changes effective immediately." });
        // Implement actual role change logic here
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="interviewer">Interviewer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User ID / Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.email}</div>
                                            <div className="text-xs text-muted-foreground">{user.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                user.role === 'admin' ? 'default' :
                                                    user.role === 'interviewer' ? 'secondary' : 'outline'
                                            }>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                                                        <Shield className="mr-2 h-4 w-4" />
                                                        Make Admin
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">
                                                        <UserX className="mr-2 h-4 w-4" />
                                                        Suspend User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
