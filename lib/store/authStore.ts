import { create } from 'zustand';

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    createdAt: string;
    isActive: boolean;
};

type AuthState = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    initAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,

    login: async (token: string) => {
        localStorage.setItem('token', token);
        const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const user = await res.json();
        set({ user, token, isLoading: false });
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },

    initAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            set({ user: null, token: null, isLoading: false });
            return;
        }

        try {
            const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error();

            const user = await res.json();
            set({ user, token, isLoading: false });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            localStorage.removeItem('token');
            set({ user: null, token: null, isLoading: false });
        }
    },
}));
