import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { SignupPage } from '../features/auth/SignupPage';
import { MallangOverlayPage } from '../features/mallang/MallangOverlayPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LunchVotePage } from '../features/lunch/LunchVotePage';
import { EmotionReportPage } from '../features/emotion/EmotionReportPage';

const router = createHashRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/mallang', element: <MallangOverlayPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/lunch/vote', element: <LunchVotePage /> },
  { path: '/emotion/report', element: <EmotionReportPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
