import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./features/auth/AuthProvider";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
