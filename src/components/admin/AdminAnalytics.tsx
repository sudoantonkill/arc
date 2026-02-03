import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Loader2 } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface BookingData {
    scheduled_at: string;
    status: string;
    platform_fee_cents: number;
}

interface DayData {
    date: string;
    bookings: number;
    revenue: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

export default function AdminAnalytics() {
    const supabase = getSupabaseClient();
    const [isLoading, setIsLoading] = React.useState(true);
    const [dailyData, setDailyData] = React.useState<DayData[]>([]);
    const [statusData, setStatusData] = React.useState<{ name: string; value: number }[]>([]);
    const [stats, setStats] = React.useState({
        avgRating: 0,
        completionRate: 0,
        avgSessionMins: 0,
        activeThisWeek: 0,
    });

    React.useEffect(() => {
        if (!supabase) return;

        const fetchAnalytics = async () => {
            setIsLoading(true);

            // Get bookings from last 30 days
            const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
            const { data: bookings } = await supabase
                .from('bookings')
                .select('scheduled_at, status, platform_fee_cents, duration_minutes')
                .gte('created_at', thirtyDaysAgo)
                .order('scheduled_at', { ascending: true });

            if (bookings) {
                // Generate daily breakdown
                const interval = eachDayOfInterval({
                    start: subDays(new Date(), 29),
                    end: new Date(),
                });

                const dailyMap = new Map<string, DayData>();
                interval.forEach(day => {
                    const key = format(day, 'yyyy-MM-dd');
                    dailyMap.set(key, { date: format(day, 'MMM d'), bookings: 0, revenue: 0 });
                });

                bookings.forEach(booking => {
                    const key = format(new Date(booking.scheduled_at), 'yyyy-MM-dd');
                    const existing = dailyMap.get(key);
                    if (existing) {
                        existing.bookings += 1;
                        if (booking.status === 'completed') {
                            existing.revenue += (booking.platform_fee_cents ?? 0) / 100;
                        }
                    }
                });

                setDailyData(Array.from(dailyMap.values()));

                // Status distribution
                const statusCounts = bookings.reduce((acc, b) => {
                    acc[b.status] = (acc[b.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                setStatusData(Object.entries(statusCounts).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
                    value,
                })));

                // Calculate stats
                const completed = bookings.filter(b => b.status === 'completed');
                const completionRate = bookings.length > 0
                    ? Math.round((completed.length / bookings.length) * 100)
                    : 0;

                const avgSession = completed.length > 0
                    ? Math.round(completed.reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0) / completed.length)
                    : 0;

                // Get feedback ratings
                const { data: feedback } = await supabase
                    .from('interview_feedback')
                    .select('overall_rating')
                    .not('overall_rating', 'is', null);

                const avgRating = feedback && feedback.length > 0
                    ? Math.round((feedback.reduce((sum, f) => sum + (f.overall_rating ?? 0), 0) / feedback.length) * 10) / 10
                    : 0;

                // Active this week
                const sevenDaysAgo = subDays(new Date(), 7).toISOString();
                const { count: activeCount } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .gte('scheduled_at', sevenDaysAgo);

                setStats({
                    avgRating,
                    completionRate,
                    avgSessionMins: avgSession,
                    activeThisWeek: activeCount ?? 0,
                });
            }

            setIsLoading(false);
        };

        fetchAnalytics();
    }, [supabase]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Bookings Over Time */}
            <Card>
                <CardHeader>
                    <CardTitle>Booking Trends</CardTitle>
                    <CardDescription>Interview bookings over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Revenue Over Time */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Over Time</CardTitle>
                    <CardDescription>Platform earnings from commissions (last 30 days)</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Booking Status Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Booking Status</CardTitle>
                    <CardDescription>Distribution of booking statuses</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {statusData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No booking data yet
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 grid-cols-2">
                        <div className="p-4 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">Avg. Rating</p>
                            <p className="text-2xl font-bold">{stats.avgRating || '—'}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">Completion Rate</p>
                            <p className="text-2xl font-bold">{stats.completionRate}%</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">Avg. Session</p>
                            <p className="text-2xl font-bold">{stats.avgSessionMins} min</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted">
                            <p className="text-sm text-muted-foreground">Active This Week</p>
                            <p className="text-2xl font-bold">{stats.activeThisWeek}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
