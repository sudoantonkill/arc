import * as React from "react";
import { useSession } from "@/hooks/useSession";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { INTERVIEW_TYPES, TARGET_COMPANIES } from "@/types/database";
import AvailabilityCalendar from "@/components/interviewer/AvailabilityCalendar";
import BookingRequests from "@/components/interviewer/BookingRequests";
import EarningsDashboard from "@/components/interviewer/EarningsDashboard";
import { useBookings } from "@/hooks/useBookings";
import {
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Settings,
  Briefcase,
  Check,
  X,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle
} from "lucide-react";

type InterviewerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  company_background: string | null;
  years_experience: number | null;
  specialties: string[];
  bio: string | null;
  hourly_rate_cents: number | null;
  verification_status: string;
  timezone: string | null;
};

const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+971', label: 'UAE (+971)' },
];

export default function InterviewerDashboard() {
  const { session } = useSession();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [profile, setProfile] = React.useState<InterviewerProfile | null>(null);
  // Personal info
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [githubUrl, setGithubUrl] = React.useState("");
  const [phoneCountryCode, setPhoneCountryCode] = React.useState("+1");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  // Professional info
  const [company, setCompany] = React.useState("");
  const [yearsExp, setYearsExp] = React.useState("");
  const [specialties, setSpecialties] = React.useState<string[]>([]);
  const [bio, setBio] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [timezone, setTimezone] = React.useState("");

  // Fetch bookings for stats
  const { data: allBookings = [] } = useBookings({ role: 'interviewer' });

  const stats = React.useMemo(() => {
    const now = new Date();
    const upcoming = allBookings.filter(b =>
      new Date(b.scheduled_at) > now &&
      ['confirmed', 'pending'].includes(b.status)
    ).length;
    const completed = allBookings.filter(b => b.status === 'completed').length;
    const pending = allBookings.filter(b => b.status === 'pending').length;
    const totalEarnings = allBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.interviewer_amount_cents || 0), 0);

    return { upcoming, completed, pending, totalEarnings };
  }, [allBookings]);

  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  // Only flip to true after DB confirms complete OR user explicitly saves
  const [profileSetupDone, setProfileSetupDone] = React.useState(false);

  React.useEffect(() => {
    if (!supabase || !session) return;
    void (async () => {
      setIsProfileLoading(true);
      const { data } = await supabase.from("interviewer_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (data) {
        setProfile(data);
        // Personal info
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setLinkedinUrl(data.linkedin_url ?? "");
        setGithubUrl(data.github_url ?? "");
        setPhoneCountryCode(data.phone_country_code ?? "+1");
        setPhoneNumber(data.phone_number ?? "");
        // Professional info
        setCompany(data.company_background ?? "");
        setYearsExp(data.years_experience?.toString() ?? "");
        setSpecialties(data.specialties ?? []);
        setBio(data.bio ?? "");
        setRate((data.hourly_rate_cents ?? 0).toString());
        setTimezone(data.timezone ?? "");
        // Check if DB profile is already complete (don't use live state)
        const dbComplete = 
          (data.company_background ?? '').trim() !== '' &&
          (data.bio ?? '').trim() !== '' &&
          (data.hourly_rate_cents ?? 0) > 0 &&
          (data.specialties ?? []).length > 0;
        if (dbComplete) {
          setProfileSetupDone(true);
        }
      }
      setIsProfileLoading(false);
    })();
  }, [session, supabase]);

  const handleSave = async () => {
    if (!supabase || !session) return;
    const { error } = await supabase
      .from("interviewer_profiles")
      .upsert(
        {
          user_id: session.user.id,
          // Personal info
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          phone_country_code: phoneCountryCode,
          phone_number: phoneNumber.trim() || null,
          // Professional info
          company_background: company,
          years_experience: parseInt(yearsExp, 10) || 0,
          specialties,
          bio,
          hourly_rate_cents: parseInt(rate, 10) || 0,
          timezone,
        },
        { onConflict: "user_id" }
      );
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      // Refresh profile to update completion status
      const { data } = await supabase.from("interviewer_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (data) setProfile(data);
      toast({ title: "Profile saved" });
      // Mark setup as done so we transition to full dashboard
      setProfileSetupDone(true);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const isPending = profile?.verification_status === 'pending';
  const isApproved = profile?.verification_status === 'approved';

  // Show loading state
  if (isProfileLoading) {
    return (
      <main className="container py-10">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // If profile is incomplete, show only the profile form
  if (!profileSetupDone) {
    return (
      <main className="container py-10">
        <header className="space-y-2 mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Interviewer Dashboard</h1>
          <p className="text-muted-foreground">Manage your profile, availability, and conduct interviews.</p>
        </header>

        {/* Profile Completion Warning */}
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Complete Your Profile</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please complete your profile to access all features. Fill in your company background, bio, hourly rate, and select at least one specialty.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form Only */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-6">My Profile</h2>
          <div className="grid gap-6">
            {/* Personal Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <Label htmlFor="github">GitHub URL</Label>
                <Input
                  id="github"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourusername"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="phoneCode">Country Code</Label>
                <select
                  id="phoneCode"
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {COUNTRY_CODES.map(cc => (
                    <option key={cc.code} value={cc.code}>{cc.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="1234567890"
                  type="tel"
                />
              </div>
            </div>

            <hr className="my-2" />

            {/* Professional Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="company">Company Background <span className="text-red-500">*</span></Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Google, Amazon, Meta"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Which companies have you worked at?
                </p>
              </div>
              <div>
                <Label htmlFor="years">Years of Experience</Label>
                <Input
                  id="years"
                  type="number"
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value)}
                  min="0"
                  max="50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio <span className="text-red-500">*</span></Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell students about your background, expertise, and interviewing style..."
              />
            </div>

            <div>
              <Label className="mb-3 block">Interview Specialties <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {INTERVIEW_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={specialties.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpecialty(type)}
                  >
                    {specialties.includes(type) && <Check className="h-3 w-3 mr-1" />}
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="rate">Hourly Rate (USD) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="rate"
                    type="number"
                    value={parseInt(rate) / 100 || ''}
                    onChange={(e) => setRate((parseFloat(e.target.value) * 100).toString())}
                    placeholder="50"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Platform takes 50% commission
                </p>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g., America/New_York"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                size="lg"
                disabled={!firstName.trim() || !lastName.trim() || !company.trim() || !bio.trim() || parseInt(rate, 10) <= 0 || specialties.length === 0}
              >
                Save Profile & Continue
              </Button>
            </div>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="container py-10">
      <header className="space-y-2 mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Interviewer Dashboard</h1>
        <p className="text-muted-foreground">Manage your profile, availability, and conduct interviews.</p>
      </header>

      {/* Verification Status Banner */}
      {isPending && (
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Profile Pending Verification</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your profile is being reviewed. Once approved, students will be able to book sessions with you.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Upcoming Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats.totalEarnings / 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Badge */}
      {profile && (
        <div className="mb-6">
          <Badge
            variant={isApproved ? 'default' : 'secondary'}
            className="text-sm"
          >
            {isApproved ? (
              <><Check className="h-3 w-3 mr-1" /> Verified Interviewer</>
            ) : isPending ? (
              <>Pending Verification</>
            ) : (
              <><X className="h-3 w-3 mr-1" /> Not Approved</>
            )}
          </Badge>
        </div>
      )}

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="bookings" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Availability</span>
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Earnings</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <BookingRequests />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityCalendar />
        </TabsContent>

        <TabsContent value="earnings">
          <EarningsDashboard />
        </TabsContent>

        <TabsContent value="profile">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-6">My Profile</h2>
            <div className="grid gap-6">
              {/* Personal Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName2">First Name</Label>
                  <Input
                    id="firstName2"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName2">Last Name</Label>
                  <Input
                    id="lastName2"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="linkedin2">LinkedIn URL</Label>
                  <Input
                    id="linkedin2"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="github2">GitHub URL</Label>
                  <Input
                    id="github2"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="phoneCode2">Country Code</Label>
                  <select
                    id="phoneCode2"
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {COUNTRY_CODES.map(cc => (
                      <option key={cc.code} value={cc.code}>{cc.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="phone2">Phone Number</Label>
                  <Input
                    id="phone2"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="1234567890"
                    type="tel"
                  />
                </div>
              </div>

              <hr className="my-2" />

              {/* Professional Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="company2">Company Background</Label>
                  <Input
                    id="company2"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., Google, Amazon, Meta"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Which companies have you worked at?
                  </p>
                </div>
                <div>
                  <Label htmlFor="years2">Years of Experience</Label>
                  <Input
                    id="years2"
                    type="number"
                    value={yearsExp}
                    onChange={(e) => setYearsExp(e.target.value)}
                    min="0"
                    max="50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell students about your background, expertise, and interviewing style..."
                />
              </div>

              <div>
                <Label className="mb-3 block">Interview Specialties</Label>
                <div className="flex flex-wrap gap-2">
                  {INTERVIEW_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant={specialties.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSpecialty(type)}
                    >
                      {specialties.includes(type) && <Check className="h-3 w-3 mr-1" />}
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="rate">Hourly Rate (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="rate"
                      type="number"
                      value={parseInt(rate) / 100 || ''}
                      onChange={(e) => setRate((parseFloat(e.target.value) * 100).toString())}
                      placeholder="50"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Platform takes 50% commission
                  </p>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g., America/New_York"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} size="lg">
                  Save Profile
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
