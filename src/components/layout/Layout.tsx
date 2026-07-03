import type { ReactNode } from 'react';
import { NavigationRail } from './NavigationRail';
import { AppBar } from './AppBar';
import { useUIStore } from '../../stores/useUIStore';
import { useAnimateOnMount } from '../../utils/animations';

export function Layout({ children }: { children: ReactNode }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const pageAnim = useAnimateOnMount({ variant: 'fadeIn', duration: 350 });

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '52px 1fr',
      gridTemplateColumns: sidebarOpen ? '72px 1fr' : '0px 1fr',
      height: '100vh', width: '100vw', overflow: 'hidden',
      transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {sidebarOpen && (
        <div style={{ gridRow: '1 / -1', gridColumn: '1', zIndex: 10 }}>
          <NavigationRail />
        </div>
      )}
      <div style={{ gridRow: '1', gridColumn: '2', zIndex: 5 }}>
        <AppBar />
      </div>
      <main style={{ gridRow: '2', gridColumn: '2', overflow: 'auto', position: 'relative', ...pageAnim.style }}>
        {children}
      </main>
    </div>
  );
}
