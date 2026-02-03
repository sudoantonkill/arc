import * as React from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import {
  Users,
  Settings,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Briefcase,
  Shield,
  Eye,
  CreditCard,
  UserCog
} from "lucide-react";
import UserManagement from "@/components/admin/UserManagement";
import SubAdminManager from "@/components/admin/SubAdminManager";
import PaymentsManagement from "@/components/admin/PaymentsManagement";

type InterviewerProfile = {
  user_id: string;
  company_background: string | null;
  years_experience: number | null;
  bio: string | null;
  hourly_rate_cents: number | null;
  verification_status: string;
  created_at: string;
};

type PlatformStats = {
  totalUsers: number;
  totalInterviewers: number;
  totalStudents: number;
  pendingApprovals: number;
  totalBookings: number;
  completedInterviews: number;
  totalRevenue: number;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const [interviewers, setInterviewers] = React.useState<InterviewerProfile[]>([]);
  const [stats, setStats] = React.useState<PlatformStats>({
    totalUsers: 0,
    totalInterviewers: 0,
    totalStudents: 0,
    pendingApprovals: 0,
    totalBookings: 0,
    completedInterviews: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) return;
    void (async () => {
      setIsLoading(true);

      // Fetch interviewers
      const { data: interviewerData } = await supabase
        .from("interviewer_profiles")
        .select("*")
        .order('created_at', { ascending: false });
      setInterviewers(interviewerData ?? []);

      // Calculate stats
      const pending = (interviewerData ?? []).filter(i => i.verification_status === 'pending').length;

      // Get booking stats
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("status, platform_fee_cents");

      const completed = (bookingData ?? []).filter(b => b.status === 'completed').length;
      const revenue = (bookingData ?? [])
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.platform_fee_cents ?? 0), 0);

      // Get actual student count
      const { count: studentCount } = await supabase
        .from("student_profiles")
        .select("*", { count: 'exact', head: true });

      setStats({
        totalUsers: (interviewerData?.length ?? 0) + (studentCount ?? 0),
        totalInterviewers: interviewerData?.length ?? 0,
        totalStudents: studentCount ?? 0,
        pendingApprovals: pending,
        totalBookings: bookingData?.length ?? 0,
        completedInterviews: completed,
        totalRevenue: revenue,
      });

      setIsLoading(false);
    })();
  }, [supabase]);

  const handleApprove = async (userId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("interviewer_profiles")
      .update({ verification_status: "approved" })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Interviewer approved" });
      setInterviewers((prev) =>
        prev.map((i) => (i.user_id === userId ? { ...i, verification_status: "approved" } : i))
      );
    }
  };

  const handleReject = async (userId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("interviewer_profiles")
      .update({ verification_status: "rejected" })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Reject failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Interviewer rejected" });
      setInterviewers((prev) =>
        prev.map((i) => (i.user_id === userId ? { ...i, verification_status: "rejected" } : i))
      );
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const pendingInterviewers = interviewers.filter(i => i.verification_status === 'pending');
  const approvedInterviewers = interviewers.filter(i => i.verification_status === 'approved');

  return (
    <main className="container py-10">
      <header className="space-y-2 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage the platform, approve interviewers, and monitor analytics.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents} students, {stats.totalInterviewers} interviewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Interviewer applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Interviews</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedInterviews}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalBookings} total bookings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              50% commission on bookings
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="approvals" className="gap-2">
            <Users className="h-4 w-4" />
            Approvals
            {pendingInterviewers.length > 0 && (
              <Badge variant="secondary">{pendingInterviewers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="interviewers" className="gap-2">
            <Briefcase className="h-4 w-4" />
            All Interviewers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <UserCog className="h-4 w-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Pending Approvals */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Interviewer Approvals</CardTitle>
              <CardDescription>Review and approve new interviewer applications</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInterviewers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInterviewers.map((interviewer) => (
                    <div
                      key={interviewer.user_id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{interviewer.company_background || '(No company)'}</span>
                          <Badge variant="outline">{interviewer.years_experience ?? 0}+ years</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {interviewer.bio || 'No bio provided'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Rate: {formatCurrency(interviewer.hourly_rate_cents ?? 0)}/hr
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleReject(interviewer.user_id)}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(interviewer.user_id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Interviewers */}
        <TabsContent value="interviewers">
          <Card>
            <CardHeader>
              <CardTitle>All Interviewers</CardTitle>
              <CardDescription>Manage interviewer accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {interviewers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No interviewers yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Company</th>
                        <th className="pb-3 font-medium">Experience</th>
                        <th className="pb-3 font-medium">Rate</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviewers.map((interviewer) => (
                        <tr key={interviewer.user_id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{interviewer.company_background || '-'}</td>
                          <td className="py-3">{interviewer.years_experience ?? 0} years</td>
                          <td className="py-3">{formatCurrency(interviewer.hourly_rate_cents ?? 0)}/hr</td>
                          <td className="py-3">
                            <Badge
                              variant={
                                interviewer.verification_status === 'approved' ? 'default' :
                                  interviewer.verification_status === 'pending' ? 'secondary' :
                                    'destructive'
                              }
                            >
                              {interviewer.verification_status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsManagement />
        </TabsContent>

        <TabsContent value="admins">
          <SubAdminManager />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure platform-wide settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Commission Rate</h4>
                  <p className="text-3xl font-bold text-primary">50%</p>
                  <p className="text-sm text-muted-foreground mt-1">Platform takes 50% of each booking</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Cancellation Policy</h4>
                  <p className="text-3xl font-bold">24hrs</p>
                  <p className="text-sm text-muted-foreground mt-1">Free cancellation up to 24 hours before</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Min Booking Notice</h4>
                  <p className="text-3xl font-bold">24hrs</p>
                  <p className="text-sm text-muted-foreground mt-1">Minimum hours before interview</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Max Duration</h4>
                  <p className="text-3xl font-bold">120min</p>
                  <p className="text-sm text-muted-foreground mt-1">Maximum interview duration</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  💡 Settings are stored in the platform_settings table.
                  A full settings editor would allow modifying these values.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
