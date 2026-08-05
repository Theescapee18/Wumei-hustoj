'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

const HIDE_NAV_PATHS = ['/login'];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = HIDE_NAV_PATHS.includes(pathname);

  return (
    <>
      {!hideNav && <Navigation />}
      <main style={!hideNav ? { paddingTop: '64px', minHeight: '100vh' } : { minHeight: '100vh' }}>
        {children}
      </main>
      {!hideNav && (
        <footer className="footer">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-6 text-center text-md-start">
                <span className="fw-bold text-gradient">
                  {process.env.NEXT_PUBLIC_OJ_NAME || 'Online Judge'}
                </span>
                <span className="mx-2">·</span>
                <span>在线评测系统</span>
              </div>
              <div className="col-md-6 text-center text-md-end mt-2 mt-md-0">
                <span>Powered by Next.js</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
