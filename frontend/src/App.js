import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ClientsProvider } from "@/context/ClientsContext";
import { TherapistsProvider } from "@/context/TherapistsContext";
import { SchedulesProvider } from "@/context/SchedulesContext";
import { CreditsProvider } from "@/context/CreditsContext";
import { AssessmentsProvider } from "@/context/AssessmentsContext";
import AppLayout from "@/components/layout/AppLayout";
import RoleSelect from "@/pages/RoleSelect";
import AssessmentFill from "@/pages/AssessmentFill";
import DashboardInquiry from "@/pages/adminInquiry/DashboardInquiry";
import InquiryPipeline from "@/pages/adminInquiry/InquiryPipeline";
import ClientDetailInquiry from "@/pages/adminInquiry/ClientDetailInquiry";
import AssessmentMasterData from "@/pages/adminInquiry/AssessmentMasterData";
import ParentAssessmentView from "@/pages/adminInquiry/ParentAssessmentView";
import DashboardSchedule from "@/pages/adminSchedule/DashboardSchedule";
import ActiveClients from "@/pages/adminSchedule/ActiveClients";
import ActiveClientDetail from "@/pages/adminSchedule/ActiveClientDetail";
import CalendarPage from "@/pages/adminSchedule/CalendarPage";
import MySchedule from "@/pages/therapist/MySchedule";
import TherapistClientDetail from "@/pages/therapist/TherapistClientDetail";
import ClientDashboard from "@/pages/client/ClientDashboard";
import DashboardRevenue from "@/pages/master/DashboardRevenue";
import BranchPerformance from "@/pages/master/BranchPerformance";
import UserManagement from "@/pages/master/UserManagement";
import RoleModuleAccess from "@/pages/master/RoleModuleAccess";
import FinancePortal from "@/pages/finance/FinancePortal";

const RequireRole = ({ role, children }) => {
  const { auth } = useAuth();
  if (auth.role !== role) return <Navigate to="/" replace />;
  return children;
};

const RequireAnyRole = ({ roles, children }) => {
  const { auth } = useAuth();
  if (!roles.includes(auth.role)) return <Navigate to="/" replace />;
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
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<RoleSelect />} />
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
                </BrowserRouter>
                <Toaster position="top-right" richColors />
              </AssessmentsProvider>
            </CreditsProvider>
          </SchedulesProvider>
        </ClientsProvider>
      </TherapistsProvider>
    </AuthProvider>
  );
}

export default App;
