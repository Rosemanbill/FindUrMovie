'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Profile, SessionResponse, User } from '@/lib/types';

type SessionContextValue = {
  token: string | null;
  user: User | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { email: string; password: string; name?: string; profileName?: string }) => Promise<void>;
  logout: () => void;
  selectProfile: (profile: Profile) => void;
  refreshProfiles: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const tokenKey = 'streamverse.token';
const userKey = 'streamverse.user';
const profilesKey = 'streamverse.profiles';
const activeProfileKey = 'streamverse.activeProfile';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(tokenKey);
    const storedUser = readJson<User>(userKey);
    const storedProfiles = readJson<Profile[]>(profilesKey) ?? [];
    const storedActiveProfile = readJson<Profile>(activeProfileKey);

    setToken(storedToken);
    setUser(storedUser);
    setProfiles(storedProfiles);
    setActiveProfile(storedActiveProfile);

    if (!storedToken) {
      setIsReady(true);
      return;
    }

    api
      .me(storedToken)
      .then((session) => {
        const nextProfiles = session.profiles;
        const nextActiveProfile =
          nextProfiles.find((profile) => profile.id === storedActiveProfile?.id) ?? nextProfiles[0] ?? null;

        setUser(session.user);
        setProfiles(nextProfiles);
        setActiveProfile(nextActiveProfile);
        localStorage.setItem(userKey, JSON.stringify(session.user));
        localStorage.setItem(profilesKey, JSON.stringify(nextProfiles));
        if (nextActiveProfile) {
          localStorage.setItem(activeProfileKey, JSON.stringify(nextActiveProfile));
        } else {
          localStorage.removeItem(activeProfileKey);
        }
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        setProfiles([]);
        setActiveProfile(null);
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        localStorage.removeItem(profilesKey);
        localStorage.removeItem(activeProfileKey);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  function applySession(session: SessionResponse) {
    setToken(session.token);
    setUser(session.user);
    setProfiles(session.profiles);
    setActiveProfile(session.profiles[0] ?? null);
    localStorage.setItem(tokenKey, session.token);
    localStorage.setItem(userKey, JSON.stringify(session.user));
    localStorage.setItem(profilesKey, JSON.stringify(session.profiles));
    if (session.profiles[0]) {
      localStorage.setItem(activeProfileKey, JSON.stringify(session.profiles[0]));
    }
  }

  const value = useMemo<SessionContextValue>(
    () => ({
      token,
      user,
      profiles,
      activeProfile,
      isReady,
      login: async (email, password) => {
        const session = await api.login({ email, password });
        applySession(session);
      },
      signup: async (payload) => {
        const session = await api.signup(payload);
        applySession(session);
      },
      logout: () => {
        setToken(null);
        setUser(null);
        setProfiles([]);
        setActiveProfile(null);
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        localStorage.removeItem(profilesKey);
        localStorage.removeItem(activeProfileKey);
      },
      selectProfile: (profile) => {
        setActiveProfile(profile);
        localStorage.setItem(activeProfileKey, JSON.stringify(profile));
      },
      refreshProfiles: async () => {
        if (!token) return;
        const fresh = await api.profiles(token);
        setProfiles(fresh);
        localStorage.setItem(profilesKey, JSON.stringify(fresh));
      }
    }),
    [activeProfile, isReady, profiles, token, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return session;
}

function readJson<T>(key: string): T | null {
  const value = localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
