'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthScreen } from '@/components/auth-screen';
import { ProfilePicker } from '@/components/profile-picker';
import { useSession } from '@/components/session-provider';

export default function Page() {
  const { token, activeProfile, isReady } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isReady && token && activeProfile) {
      router.replace('/browse');
    }
  }, [activeProfile, isReady, router, token]);

  if (!isReady) {
    return <div className="grid min-h-screen place-items-center bg-ink text-smoke">Loading...</div>;
  }

  if (!token) {
    return <AuthScreen />;
  }

  return <ProfilePicker />;
}
