"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser, type User } from "@/lib/api";

interface UserContextValue {
  user: User | null;
  loading: boolean;
}

const UserContext = React.createContext<UserContextValue>({
  user: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        // Belt-and-suspenders: middleware already guards, but if the cookie is
        // present-but-invalid, bounce to login.
        router.replace("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return React.useContext(UserContext);
}
