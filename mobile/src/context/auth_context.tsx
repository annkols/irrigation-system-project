
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { login as apiLogin } from "@/api/login";
import { clearTokens, refreshAccessToken } from "@/api/auth";

type AuthContextType = {
    isAuthenticated: boolean;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            try {
                await refreshAccessToken();

                if (active) {
                    setIsAuthenticated(true);
                }
            } catch {
                // No valid refresh token: login is required.
                if (active) {
                    setIsAuthenticated(false);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        restoreSession();

        return () => {
            active = false;
        };
    }, []);

    async function signIn(email: string, password: string) {
        await apiLogin(email, password);
        setIsAuthenticated(true);
    }

    async function signOut() {
        await clearTokens();
        setIsAuthenticated(false);
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                loading,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}