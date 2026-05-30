'use client';

import { ProfilePicker } from '@/components/profile-picker';
import { RequireAuth } from '@/components/require-auth';

export default function ProfilesPage() {
  return (
    <RequireAuth>
      <ProfilePicker />
    </RequireAuth>
  );
}
