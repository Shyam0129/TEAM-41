import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

export interface User {
    user_id: string;
    email: string;
    name: string;
    username?: string;
    picture?: string;
    auth_provider: string;
    is_active: boolean;
    is_verified: boolean;
    last_login?: string;
    created_at: string;
    preferences: {
        timezone: string;
        language: string;
        theme: string;
        notifications_enabled: boolean;
    };
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => void;
    logout: () => void;
    refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load auth state from localStorage on mount
    useEffect(() => {
        const loadAuthState = () => {
            try {
                const storedAccessToken = localStorage.getItem('access_token');
                const storedRefreshToken = localStorage.getItem('refresh_token');
                const storedUser = localStorage.getItem('user');

                if (storedAccessToken && storedUser) {
                    setAccessToken(storedAccessToken);
                    setRefreshToken(storedRefreshToken);
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error('Failed to load auth state:', error);
                // Clear corrupted data
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
            } finally {
                setIsLoading(false);
            }
        };

        loadAuthState();
    }, []);

    // Auto-refresh token before expiry
    useEffect(() => {
        if (!accessToken || !refreshToken) return;

        // Refresh token 1 minute before expiry (tokens expire in 15 minutes)
        const refreshInterval = setInterval(() => {
            refreshAccessToken();
        }, 14 * 60 * 1000); // 14 minutes

        return () => clearInterval(refreshInterval);
    }, [accessToken, refreshToken]);

    const saveAuthState = (accessToken: string, refreshToken: string, user: User) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setUser(user);
    };

    const clearAuthState = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
    };

    const register = async (email: string, username: string, password: string, name: string) => {
        try {
            const response = await fetch('http://localhost:8000/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, username, password, name }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            const data = await response.json();
            saveAuthState(data.access_token, data.refresh_token, data.user);
            toast.success('Account created successfully! Welcome to Rexie AI 🎉');
        } catch (error: any) {
            console.error('Registration error:', error);
            toast.error(error.message || 'Registration failed');
            throw error;
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            saveAuthState(data.access_token, data.refresh_token, data.user);
            toast.success(`Welcome back, ${data.user.name}! 👋`);
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.message || 'Login failed');
            throw error;
        }
    };

    const loginWithGoogle = () => {
        // Show loading toast
        toast.loading('Redirecting to Google...', { id: 'google-login' });
        // Redirect to Google OAuth
        window.location.href = 'http://localhost:8000/auth/login';
    };

    const logout = () => {
        clearAuthState();
        toast.success('Logged out successfully');
    };

    const refreshAccessToken = async (): Promise<boolean> => {
        if (!refreshToken) return false;

        try {
            const response = await fetch('http://localhost:8000/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                // Refresh token expired or invalid
                clearAuthState();
                toast.error('Session expired. Please sign in again.');
                return false;
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            setAccessToken(data.access_token);
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            clearAuthState();
            toast.error('Session expired. Please sign in again.');
            return false;
        }
    };

    const value: AuthContextType = {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshAccessToken,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
