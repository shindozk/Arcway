import { useState, useEffect, Suspense, lazy } from 'react';
import { Layout } from './components/layout/Layout';
import { SplashScreen } from './components/common/SplashScreen';
import { PageLoader } from './components/common/PageLoader';
import { SudoModal } from './components/common/SudoModal';
import { InstallProgressPopup } from './components/common/InstallProgressPopup';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthGuard } from './components/auth/AuthGuard';
import { I18nProvider } from './i18n';
import { useUIStore } from './stores/useUIStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useSudoStore } from './hooks/useSudo';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ToastContainer } from './components/common/Toast';

const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PackageDetailPage = lazy(() => import('./pages/PackageDetailPage'));
const InstalledPage = lazy(() => import('./pages/InstalledPage'));
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

export default function App() {
  const [booted, setBooted] = useState(false);
  const activePage = useUIStore((s) => s.activePage);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const sudoShowModal = useSudoStore((s) => s.showModal);
  const sudoPendingName = useSudoStore((s) => s.pendingPackageName);
  const sudoOnSuccess = useSudoStore((s) => s.onSuccess);
  const sudoOnClose = useSudoStore((s) => s.onClose);
  const checkSudo = useSudoStore((s) => s.checkPassword);
  useTheme();
  useKeyboardShortcuts();

  useEffect(() => {
    loadSettings();
    checkSudo();
  }, [loadSettings, checkSudo]);

  const renderPage = () => {
    switch (activePage) {
      case 'home':      return <HomePage />;
      case 'search':    return <SearchPage />;
      case 'detail':    return <PackageDetailPage />;
      case 'installed': return <InstalledPage />;
      case 'updates':   return <UpdatesPage />;
      case 'settings':  return <SettingsPage />;
      case 'profile':   return <ProfilePage />;
      case 'about':     return <AboutPage />;
      default:          return <HomePage />;
    }
  };

  if (!booted) {
    return <SplashScreen onComplete={() => setBooted(true)} />;
  }

  return (
    <ErrorBoundary>
    <I18nProvider>
      <AuthGuard>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </Layout>
        <InstallProgressPopup />
        <ToastContainer />
        <SudoModal
          open={sudoShowModal}
          onClose={sudoOnClose}
          onSuccess={sudoOnSuccess}
          packageName={sudoPendingName}
        />
      </AuthGuard>
    </I18nProvider>
    </ErrorBoundary>
  );
}
