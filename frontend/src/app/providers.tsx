'use client';

import { ReactNode } from 'react';
import { AppProvider } from '@/lib/context/app-context';
import { Navbar } from '@/components/layout/navbar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </AppProvider>
  );
}
