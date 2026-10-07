import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/stores/authStore";
import { TherapistsProvider } from "@/stores/therapistsStore";
import { ClientsProvider } from "@/stores/clientsStore";
import { SchedulesProvider } from "@/stores/schedulesStore";
import { CreditsProvider } from "@/stores/creditsStore";
import { AssessmentsProvider } from "@/stores/assessmentsStore";
import { MasterDataProvider } from "@/stores/masterDataStore";
import { HolidaysProvider } from "@/stores/holidaysStore";
import { BranchesProvider } from "@/stores/branchesStore";
import { LeavesProvider } from "@/stores/leavesStore";

// Disiapkan untuk fase API: store domain akan memakai react-query (lihat docs/guide/10).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Urutan provider: Auth paling luar (dipakai semua), lalu store domain.
// Store domain tidak saling memanggil; orkestrasi lintas domain ada di hook use-case tiap feature.
export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BranchesProvider>
      <AuthProvider>
        <TherapistsProvider>
          <ClientsProvider>
            <SchedulesProvider>
              <CreditsProvider>
                <AssessmentsProvider>
                  <MasterDataProvider>
                    <HolidaysProvider>
                      <LeavesProvider>{children}</LeavesProvider>
                    </HolidaysProvider>
                  </MasterDataProvider>
                </AssessmentsProvider>
              </CreditsProvider>
            </SchedulesProvider>
          </ClientsProvider>
        </TherapistsProvider>
      </AuthProvider>
      </BranchesProvider>
    </QueryClientProvider>
  );
}
