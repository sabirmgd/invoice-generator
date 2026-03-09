'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/', label: 'Home' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/estimates', label: 'Estimates' },
  { href: '/recurring', label: 'Recurring' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/settings', label: 'Settings' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo + Wordmark */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/invo-logo.png" alt="Invo" width={80} height={28} style={{ width: 'auto', height: 'auto' }} priority />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Session indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-success" />
          <span className="text-xs text-text-secondary">Session active</span>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface md:hidden"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <path d="M5 5l10 10M15 5L5 15" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="mt-3 flex items-center gap-2 px-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-success" />
            <span className="text-xs text-text-secondary">Session active</span>
          </div>
        </div>
      )}
    </nav>
  );
}
