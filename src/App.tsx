import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionProvider } from "@/hooks/useSession";
import Index from "./pages/Index";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import AdminLogin from "./pages/auth/AdminLogin";
import ResetPassword from "./pages/auth/ResetPassword";
import AuthCallback from "./pages/auth/AuthCallback";
import UpdatePassword from "./pages/auth/UpdatePassword";
import Setup from "./pages/Setup";
import BackendStatus from "./pages/BackendStatus";
import AppShell from "./pages/app/AppShell";
import AppIndexRedirect from "./pages/app/AppIndexRedirect";
import StudentDashboard from "./pages/app/student/StudentDashboard";
import InterviewerDashboard from "./pages/app/interviewer/InterviewerDashboard";
import AdminDashboard from "./pages/app/admin/AdminDashboard";
import InterviewRoom from "./pages/app/InterviewRoom";
import InterviewerDetailPage from "./pages/app/student/InterviewerDetailPage";
import RequireAuth from "./components/auth/RequireAuth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/backend-status" element={<BackendStatus />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<AppIndexRedirect />} />
            <Route
              path="student"
              element={
                <RequireAuth allowedRoles={["student", "admin"]}>
                  <StudentDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="student/interviewer/:interviewerId"
              element={
                <RequireAuth allowedRoles={["student", "admin"]}>
                  <InterviewerDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="interviewer"
              element={
                <RequireAuth allowedRoles={["interviewer", "admin"]}>
                  <InterviewerDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="admin"
              element={
                <RequireAuth allowedRoles={["admin"]}>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
          </Route>
          <Route
            path="/app/interview/:bookingId"
            element={
              <RequireAuth>
                <InterviewRoom />
              </RequireAuth>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </SessionProvider>
  </QueryClientProvider>
);

export default App;
