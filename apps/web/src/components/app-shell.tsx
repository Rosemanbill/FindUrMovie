'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useSession } from './session-provider';

const links = [
  { href: '/browse', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/my-list', label: 'My List' },
  { href: '/admin', label: 'Admin' }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProfile, logout, user } = useSession();

  return (
    <div className="min-h-screen bg-ink text-smoke">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/82 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-4" aria-label="Primary">
          <Link href="/browse" className="text-2xl font-black text-ember">
            StreamVerse
          </Link>
          <div className="hidden flex-1 items-center gap-2 sm:flex">
            {links
              .filter((link) => link.label !== 'Admin' || user?.role === 'ADMIN')
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                    pathname === link.href ? 'bg-white/12 text-white' : 'text-smoke/72 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </div>
          <button
            onClick={() => router.push('/profiles')}
            className="ml-auto flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10"
          >
            {activeProfile?.avatarUrl && (
              <img
                src={activeProfile.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-md object-cover"
                aria-hidden="true"
              />
            )}
            <span className="hidden text-sm font-bold text-smoke/82 md:block">{activeProfile?.name}</span>
          </button>
          <button onClick={logout} className="rounded-md px-3 py-2 text-sm font-bold text-smoke/70 hover:text-white">
            Logout
          </button>
        </nav>
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 sm:hidden">
          {links
            .filter((link) => link.label !== 'Admin' || user?.role === 'ADMIN')
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-bold ${
                  pathname === link.href ? 'bg-white/12 text-white' : 'text-smoke/72'
                }`}
              >
                {link.label}
              </Link>
            ))}
        </div>
      </header>
      {children}
    </div>
  );
}
