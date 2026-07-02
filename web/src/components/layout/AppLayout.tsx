import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AgentBanner } from "./AgentBanner";
import { TopBar } from "./TopBar";
import { AppearanceSync } from "./AppearanceSync";

export function AppLayout() {
  return (
    <div className="flex h-full">
      <AppearanceSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AgentBanner />
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
