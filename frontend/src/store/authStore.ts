import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Address } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  currentAddress: Address | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrentAddress: (address: Address) => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      currentAddress: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", token);
          document.cookie = `accessToken=${token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
        }
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          document.cookie = "accessToken=; path=/; max-age=0";
          document.cookie = "token=; path=/; max-age=0";
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          currentAddress: null,
        });
      },

      setCurrentAddress: (address) => set({ currentAddress: address }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: "insta-zomato-auth",
    }
  )
);
