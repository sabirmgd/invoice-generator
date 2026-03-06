'use client';

import { ReactNode } from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { AppProvider } from '@/lib/context/app-context';
import { Navbar } from '@/components/layout/navbar';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function RecaptchaWrapper({ children }: { children: ReactNode }) {
  if (!RECAPTCHA_SITE_KEY) return <>{children}</>;
  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY} useEnterprise>
      {children}
    </GoogleReCaptchaProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RecaptchaWrapper>
      <AppProvider>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </AppProvider>
    </RecaptchaWrapper>
  );
}
