import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { MallangOverlayPage } from '../features/mallang/MallangOverlayPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LunchVotePage } from '../features/lunch/LunchVotePage';
import { EmotionReportPage } from '../features/emotion/EmotionReportPage';

const router = createHashRouter([
  { path: '/', element: <Navigate to="/onboarding" replace /> },
  { path: '/mallang', element: <MallangOverlayPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/lunch/vote', element: <LunchVotePage /> },
  { path: '/emotion/report', element: <EmotionReportPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
