import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';



interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1, padding: 'var(--space-8) 0' }}>
        {children}
      </main>
      <Footer />
    </>
  );
};
