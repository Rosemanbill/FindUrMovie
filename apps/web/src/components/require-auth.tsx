'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { ProfilePicker } from './profile-picker';
import { useSession } from './session-provider';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token, activeProfile, isReady } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !token) {
      router.replace('/');
    }
  }, [isReady, router, token]);

  if (!isReady) {
    return <div className="grid min-h-screen place-items-center bg-ink text-smoke">Loading...</div>;
  }

  if (!token) {
    return null;
  }

  if (!activeProfile) {
    return <ProfilePicker />;
  }

  return <>{children}</>;
}
