import { create } from "zustand";

const TOKEN_KEY = "agrinexus_token";
const USER_KEY = "agrinexus_user";

function readLocal(key: string, fallback: any = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export const useAuthStore = create<{
  token: string | null;
  user: any;
  setAuth: (payload: { token: string; user: any }) => void;
  logout: () => void;
}>((set: any) => ({
  token: readLocal(TOKEN_KEY, null),
  user: readLocal(USER_KEY, null),
  setAuth: ({ token, user }: { token: string; user: any }) => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  }
}));
