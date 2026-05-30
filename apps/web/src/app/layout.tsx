import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/app-providers';

export const metadata: Metadata = {
  title: 'StreamVerse',
  description: 'A streaming discovery MVP with practical AI recommendations.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
