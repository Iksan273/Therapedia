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
import PublicInquiryForm from "@/pages/PublicInquiryForm";
import AssessmentFill from "@/pages/AssessmentFill";
import DashboardInquiry from "@/pages/adminInquiry/DashboardInquiry";
import InquiryPipeline from "@/pages/adminInquiry/InquiryPipeline";
import ClientDetailInquiry from "@/pages/adminInquiry/ClientDetailInquiry";
import AssessmentMasterData from "@/pages/adminInquiry/AssessmentMasterData";
import DashboardSchedule from "@/pages/adminSchedule/DashboardSchedule";
import ActiveClients from "@/pages/adminSchedule/ActiveClients";
import ActiveClientDetail from "@/pages/adminSchedule/ActiveClientDetail";
import CalendarPage from "@/pages/adminSchedule/CalendarPage";
import MySchedule from "@/pages/therapist/MySchedule";
import TherapistClientDetail from "@/pages/therapist/TherapistClientDetail";
import ClientDashboard from "@/pages/client/ClientDashboard";

const RequireRole = ({ role, children }) => {
  const { auth } = useAuth();
  if (auth.role !== role) return <Navigate to="/" replace />;
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
                    <Route path="/inquiry" element={<PublicInquiryForm />} />
                    <Route path="/assessment" element={<AssessmentFill />} />

                    <Route
                      path="/admin-inquiry"
                      element={
                        <RequireRole role="admin_inquiry">
                          <AppLayout />
                        </RequireRole>
                      }
                    >
                      <Route index element={<DashboardInquiry />} />
                      <Route path="pipeline" element={<InquiryPipeline />} />
                      <Route path="clients/:id" element={<ClientDetailInquiry />} />
                      <Route path="assessments" element={<AssessmentMasterData />} />
                    </Route>

                    <Route
                      path="/admin-schedule"
                      element={
                        <RequireRole role="admin_schedule">
                          <AppLayout />
                        </RequireRole>
                      }
                    >
                      <Route index element={<DashboardSchedule />} />
                      <Route path="calendar" element={<CalendarPage />} />
                      <Route path="clients" element={<ActiveClients />} />
                      <Route path="clients/:id" element={<ActiveClientDetail />} />
                    </Route>

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
                    </Route>

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
