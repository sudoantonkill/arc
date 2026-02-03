import * as React from "react";
import { useSession } from "@/hooks/useSession";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { INTERVIEW_TYPES, TARGET_COMPANIES } from "@/types/database";
import InterviewerBrowser from "@/components/student/InterviewerBrowser";
import UpcomingSessions from "@/components/student/UpcomingSessions";
import FeedbackReports from "@/components/student/FeedbackReports";
import {
  Users,
  Calendar,
  FileText,
  User,
  Check,
  GraduationCap,
  Target,
  Clock
} from "lucide-react";

type StudentProfile = {
  user_id: string;
  education: string | null;
  target_companies: string[];
  interview_types: string[];
  timezone: string | null;
};

export default function StudentDashboard() {
  const { session } = useSession();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [profile, setProfile] = React.useState<StudentProfile | null>(null);
  const [education, setEducation] = React.useState("");
  const [targetCompanies, setTargetCompanies] = React.useState<string[]>([]);
  const [interviewTypes, setInterviewTypes] = React.useState<string[]>([]);
  const [timezone, setTimezone] = React.useState("");
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase || !session) return;
    void (async () => {
      setIsProfileLoading(true);
      const { data } = await supabase.from("student_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (data) {
        setProfile(data);
        setEducation(data.education ?? "");
        setTargetCompanies(data.target_companies ?? []);
        setInterviewTypes(data.interview_types ?? []);
        setTimezone(data.timezone ?? "");
      }
      setIsProfileLoading(false);
    })();
  }, [session, supabase]);

  const handleSave = async () => {
    if (!supabase || !session) return;
    const { error } = await supabase
      .from("student_profiles")
      .upsert(
        {
          user_id: session.user.id,
          education,
          target_companies: targetCompanies,
          interview_types: interviewTypes,
          timezone
        },
        { onConflict: "user_id" }
      );
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      // Refresh profile to update completion status
      const { data } = await supabase.from("student_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (data) setProfile(data);
      toast({ title: "Profile saved" });
    }
  };

  const toggleCompany = (company: string) => {
    setTargetCompanies(prev =>
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const toggleInterviewType = (type: string) => {
    setInterviewTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Check if profile is complete (education is required)
  const isProfileComplete = profile && education.trim() !== '';

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

  // If profile is incomplete, show only the profile section with a warning
  if (!isProfileComplete) {
    return (
      <main className="container py-10">
        <header className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Find interviewers, book sessions, and track your interview preparation progress.
          </p>
        </header>

        {/* Profile Completion Warning */}
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <User className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Complete Your Profile</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please complete your profile to access all features. Fill in your education details below.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form Only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
            <CardDescription>
              Complete your profile to help interviewers understand your background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="education" className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4" />
                  Education <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g., MS Computer Science, Stanford University"
                />
              </div>
              <div>
                <Label htmlFor="timezone" className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Timezone
                </Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g., America/New_York"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4" />
                Target Companies
              </Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_COMPANIES.map(company => (
                  <Badge
                    key={company}
                    variant={targetCompanies.includes(company) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleCompany(company)}
                  >
                    {targetCompanies.includes(company) && <Check className="h-3 w-3 mr-1" />}
                    {company}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-3">
                Interview Types You're Preparing For
              </Label>
              <div className="flex flex-wrap gap-2">
                {INTERVIEW_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={interviewTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleInterviewType(type)}
                  >
                    {interviewTypes.includes(type) && <Check className="h-3 w-3 mr-1" />}
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} size="lg" disabled={!education.trim()}>
                Save Profile & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container py-10">
      <header className="space-y-2 mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">
          Find interviewers, book sessions, and track your interview preparation progress.
        </p>
      </header>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="browse" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Find Interviewers</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">My Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <InterviewerBrowser />
        </TabsContent>

        <TabsContent value="sessions">
          <UpcomingSessions />
        </TabsContent>

        <TabsContent value="reports">
          <FeedbackReports />
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                My Profile
              </CardTitle>
              <CardDescription>
                Complete your profile to help interviewers understand your background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="education" className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </Label>
                  <Input
                    id="education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g., MS Computer Science, Stanford University"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone" className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Timezone
                  </Label>
                  <Input
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g., America/New_York"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4" />
                  Target Companies
                </Label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_COMPANIES.map(company => (
                    <Badge
                      key={company}
                      variant={targetCompanies.includes(company) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleCompany(company)}
                    >
                      {targetCompanies.includes(company) && <Check className="h-3 w-3 mr-1" />}
                      {company}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  Interview Types You're Preparing For
                </Label>
                <div className="flex flex-wrap gap-2">
                  {INTERVIEW_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant={interviewTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleInterviewType(type)}
                    >
                      {interviewTypes.includes(type) && <Check className="h-3 w-3 mr-1" />}
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} size="lg">
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
