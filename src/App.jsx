import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { DashboardPage }          from './pages/DashboardPage.jsx';
import { WorkerListPage }         from './pages/WorkerListPage.jsx';
import { WorkerProfilePage }      from './pages/WorkerProfilePage.jsx';
import { WorkerFormPage }         from './pages/WorkerFormPage.jsx';
import { OnboardingPipelinePage } from './pages/OnboardingPipelinePage.jsx';
import { AttendancePage }         from './pages/AttendancePage.jsx';
import { WaitlistFurloughPage }   from './pages/WaitlistFurloughPage.jsx';
import { TerminationsPage }       from './pages/TerminationsPage.jsx';
import { ConversionsPage }        from './pages/ConversionsPage.jsx';
import { InjuriesPage }           from './pages/InjuriesPage.jsx';
import { AnalyticsPage }          from './pages/AnalyticsPage.jsx';
import { UploadPage }             from './pages/UploadPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index                   element={<DashboardPage />} />
            <Route path="workers"          element={<WorkerListPage />} />
            <Route path="workers/new"      element={<WorkerFormPage />} />
            <Route path="workers/:id"      element={<WorkerProfilePage />} />
            <Route path="workers/:id/edit" element={<WorkerFormPage />} />
            <Route path="onboarding"       element={<OnboardingPipelinePage />} />
            <Route path="attendance"       element={<AttendancePage />} />
            <Route path="waitlist"         element={<WaitlistFurloughPage />} />
            <Route path="terminations"     element={<TerminationsPage />} />
            <Route path="conversions"      element={<ConversionsPage />} />
            <Route path="injuries"         element={<InjuriesPage />} />
            <Route path="analytics"        element={<AnalyticsPage />} />
            <Route path="upload"           element={<UploadPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
