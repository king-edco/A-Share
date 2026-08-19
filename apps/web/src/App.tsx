import { BrowserRouter } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./features/auth/AuthProvider";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
