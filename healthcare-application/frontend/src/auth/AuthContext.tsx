/**
 * Auth context — manages authentication state, tokens, and role-based access.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../api/services';
import type { User, LoginRequest, TokenResponse } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentialsOrUsername: LoginRequest | string, password?: string) => Promise<TokenResponse>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('dori_access_token');
    if (token) {
      authApi
        .me()
        .then((user) => {
          setState({ user, isAuthenticated: true, isLoading: false, error: null });
        })
        .catch(() => {
          localStorage.removeItem('dori_access_token');
          localStorage.removeItem('dori_refresh_token');
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
        });
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(
    async (credentialsOrUsername: LoginRequest | string, password?: string): Promise<TokenResponse> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const payload: LoginRequest =
        typeof credentialsOrUsername === 'string'
          ? { username: credentialsOrUsername, password: password || '' }
          : credentialsOrUsername;

      try {
        const response = await authApi.login(payload);
        localStorage.setItem('dori_access_token', response.access_token);
        localStorage.setItem('dori_refresh_token', response.refresh_token);
        setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('dori_access_token');
    localStorage.removeItem('dori_refresh_token');
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
