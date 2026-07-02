import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { GameDetailPage } from "@/pages/GameDetailPage";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { FriendsPage } from "@/pages/FriendsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { PlayerPage } from "@/pages/PlayerPage";
import { isAuthed } from "@/lib/auth";

// Гейт: без токена (і не на моках) -> на логін.
function RequireAuth() {
  return isAuthed() ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <AmbientBackground />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/game/:appId" element={<GameDetailPage />} />
          <Route path="/game/:appId/roadmap" element={<RoadmapPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/player/:steamId" element={<PlayerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
