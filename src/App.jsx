import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { I18nProvider } from "./i18n/I18nContext";

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </I18nProvider>
  );
}