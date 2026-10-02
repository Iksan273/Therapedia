import "@/app/App.css";
import AppProviders from "@/app/providers/AppProviders";
import AppRouter from "@/app/router/AppRouter";
import { Toaster } from "@/shared/ui/sonner";

function App() {
  return (
    <AppProviders>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </AppProviders>
  );
}

export default App;
