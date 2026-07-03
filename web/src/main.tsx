import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { enableMocks } from "./mocks/browser";
import { initAppearance } from "./lib/appearance";
import { I18nProvider } from "./lib/i18n";
import "./index.css";

// Застосовуємо збережені тему/акцент/мову ДО першого рендера (без миготіння).
initAppearance();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Моки мають стартувати до рендера, інакше перші запити пройдуть повз них.
// .catch: якщо реєстрація service worker впаде (або воркер відсутній), усе одно
// рендеримо — інакше був би білий екран без пояснення.
function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

enableMocks().then(render).catch(render);
