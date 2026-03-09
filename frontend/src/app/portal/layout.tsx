import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice Portal - Invo',
  description: 'View and pay your invoice',
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {children}
    </div>
  );
}
