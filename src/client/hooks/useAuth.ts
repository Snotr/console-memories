import { useState, useEffect, useCallback } from "react";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    loading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = (await res.json()) as { authenticated: boolean };
      setState({ isAuthenticated: data.authenticated, loading: false });
    } catch {
      setState({ isAuthenticated: false, loading: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // clear state regardless
    }
    setState({ isAuthenticated: false, loading: false });
  }, []);

  return {
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    checkAuth,
    logout,
  };
}
