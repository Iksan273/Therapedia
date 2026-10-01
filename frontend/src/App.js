import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ClientsProvider } from "@/context/ClientsContext";
import { TherapistsProvider } from "@/context/TherapistsContext";
import { SchedulesProvider } from "@/context/SchedulesContext";
import { CreditsProvider } from "@/context/CreditsContext";
import { AssessmentsProvider } from "@/context/AssessmentsContext";
import { MasterDataProvider } from "@/context/MasterDataContext";
import AppLayout from "@/components/layout/AppLayout";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import Welcome from "@/pages/Welcome";

const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const RoleSelect = lazy(() => import("@/pages/RoleSelect"));
const AssessmentFill = lazy(() => import("@/pages/AssessmentFill"));
const DashboardInquiry = lazy(() => import("@/pages/adminInquiry/DashboardInquiry"));
const InquiryPipeline = lazy(() => import("@/pages/adminInquiry/InquiryPipeline"));
const ClientDetailInquiry = lazy(() => import("@/pages/adminInquiry/ClientDetailInquiry"));
const AssessmentMasterData = lazy(() => import("@/pages/adminInquiry/AssessmentMasterData"));
const InquiryMasterData = lazy(() => import("@/pages/adminInquiry/InquiryMasterData"));
const ParentAssessmentView = lazy(() => import("@/pages/adminInquiry/ParentAssessmentView"));
const DashboardSchedule = lazy(() => import("@/pages/adminSchedule/DashboardSchedule"));
const ActiveClients = lazy(() => import("@/pages/adminSchedule/ActiveClients"));
const ActiveClientDetail = lazy(() => import("@/pages/adminSchedule/ActiveClientDetail"));
const CalendarPage = lazy(() => import("@/pages/adminSchedule/CalendarPage"));
const MySchedule = lazy(() => import("@/pages/therapist/MySchedule"));
const TherapistSummary = lazy(() => import("@/pages/therapist/TherapistSummary"));
const TherapistClientDetail = lazy(() => import("@/pages/therapist/TherapistClientDetail"));
const ClientDashboard = lazy(() => import("@/pages/client/ClientDashboard"));
const DashboardRevenue = lazy(() => import("@/pages/master/DashboardRevenue"));
const BranchPerformance = lazy(() => import("@/pages/master/BranchPerformance"));
const UserManagement = lazy(() => import("@/pages/master/UserManagement"));
const RoleModuleAccess = lazy(() => import("@/pages/master/RoleModuleAccess"));
const FinancePortal = lazy(() => import("@/pages/finance/FinancePortal"));

const RouteFallback = () => (
  <div className="max-w-6xl mx-auto p-4 sm:p-8">
    <PageSkeleton variant="table" />
  </div>
);

const RequireRole = ({ role, children }) => {
  const { auth } = useAuth();
  if (auth.role !== role) return <Navigate to="/roles" replace />;
  return children;
};

const RequireAnyRole = ({ roles, children }) => {
  const { auth } = useAuth();
  if (!roles.includes(auth.role)) return <Navigate to="/roles" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <TherapistsProvider>
        <ClientsProvider>
          <SchedulesProvider>
            <CreditsProvider>
              <AssessmentsProvider>
                <MasterDataProvider>
                <BrowserRouter>
                  <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Welcome />} />
                    <Route path="/landing" element={<Home />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/roles" element={<RoleSelect />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/assessment" element={<AssessmentFill />} />

                    {/* ROLE MASTER */}
                    <Route
                      path="/master"
                      element={
                        <RequireRole role="master">
                          <AppLayout />
                        </RequireRole>
                      }
                    >
                      <Route index element={<Navigate to="/master/revenue" replace />} />
                      <Route path="revenue" element={<DashboardRevenue />} />
                      <Route path="branch-performance" element={<BranchPerformance />} />
                      <Route path="users" element={<UserManagement />} />
                      <Route path="rbac" element={<RoleModuleAccess />} />
                    </Route>

                    {/* ROLE MANAGER */}
                    <Route
                      path="/manager"
                      element={
                        <RequireRole role="manager">
                          <AppLayout />
                        </RequireRole>
                      }
                    >
                      <Route index element={<Navigate to="/manager/revenue" replace />} />
                      <Route path="revenue" element={<DashboardRevenue />} />
                    </Route>

                    {/* ROLE FINANCE */}
                    <Route
                      path="/finance"
                      element={
                        <RequireAnyRole roles={["master", "finance"]}>
                          <AppLayout />
                        </RequireAnyRole>
                      }
                    >
                      <Route index element={<FinancePortal />} />
                    </Route>

                    {/* ADMIN INQUIRY PIPELINE */}
                    <Route
                      path="/admin-inquiry"
                      element={
                        <RequireAnyRole roles={["master", "manager", "admin_inquiry", "therapist"]}>
                          <AppLayout />
                        </RequireAnyRole>
                      }
                    >
                      <Route index element={<DashboardInquiry />} />
                      <Route path="dashboard" element={<DashboardInquiry />} />
                      <Route path="pipeline" element={<InquiryPipeline />} />
                      <Route path="pipeline/:id" element={<ClientDetailInquiry />} />
                      <Route path="clients/:id" element={<ClientDetailInquiry />} />
                      <Route path="assessments" element={<AssessmentMasterData />} />
                      <Route path="master-data" element={<InquiryMasterData />} />
                      <Route path="parent-assessment/:id" element={<ParentAssessmentView />} />
                    </Route>

                    {/* ADMIN SCHEDULE TIMETABLE & ACTIVE CLIENTS */}
                    <Route
                      path="/admin-schedule"
                      element={
                        <RequireAnyRole roles={["master", "manager", "admin_schedule", "finance"]}>
                          <AppLayout />
                        </RequireAnyRole>
                      }
                    >
                      <Route index element={<DashboardSchedule />} />
                      <Route path="calendar" element={<CalendarPage />} />
                      <Route path="clients" element={<ActiveClients />} />
                      <Route path="clients/:id" element={<ActiveClientDetail />} />
                    </Route>

                    {/* THERAPIST PORTAL */}
                    <Route
                      path="/therapist"
                      element={
                        <RequireRole role="therapist">
                          <AppLayout />
                        </RequireRole>
                      }
                    >
                      <Route index element={<MySchedule />} />
                      <Route path="summary" element={<TherapistSummary />} />
                      <Route path="clients/:id" element={<TherapistClientDetail />} />
                      <Route path="parent-assessment/:id" element={<ParentAssessmentView />} />
                    </Route>

                    {/* PARENT PORTAL */}
                    <Route
                      path="/client"
                      element={
                        <RequireRole role="client">
                          <AppLayout />
                        </RequireRole>
                      }
                    >
                      <Route index element={<ClientDashboard />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  </Suspense>
                </BrowserRouter>
                <Toaster position="top-right" richColors />
                </MasterDataProvider>
              </AssessmentsProvider>
            </CreditsProvider>
          </SchedulesProvider>
        </ClientsProvider>
      </TherapistsProvider>
    </AuthProvider>
  );
}

export default App;
