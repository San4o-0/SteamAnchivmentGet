import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function enableMocks() {
  // Моки — ЛИШЕ в dev-збірці. Прод-бандл (vite build) ніколи не піднімає MSW,
  // навіть якщо VITE_ENABLE_MOCKS випадково лишили "true" — інакше в проді
  // подавалися б фейкові дані й обходилась авторизація.
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return;
  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
  });
}
