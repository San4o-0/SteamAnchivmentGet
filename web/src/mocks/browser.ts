import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return;
  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
  });
}
