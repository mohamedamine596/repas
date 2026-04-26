import React, { createContext, useState, useContext, useEffect } from "react";
import {
  backendApi,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/api/backendClient";
import { createPageUrl } from "@/utils";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [token, setToken] = useState(getAccessToken());

  useEffect(() => {
    // Bootstrap session on first app load.
    checkAppState();
  }, []);

  const applySession = (session) => {
    if (!session?.accessToken || !session?.user) {
      return;
    }
    setAccessToken(session.accessToken);
    setToken(session.accessToken);
    setUser(session.user);
    setIsAuthenticated(true);
  };

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      let currentToken = token || getAccessToken();

      if (!currentToken) {
        const refresh = await backendApi.auth.refresh();
        currentToken = refresh?.accessToken || null;

        if (currentToken) {
          setAccessToken(currentToken);
          setToken(currentToken);
          setUser(refresh.user || null);
          setIsAuthenticated(Boolean(refresh.user));
          return;
        }
      }

      const me = await backendApi.auth.me(currentToken);
      const latestToken = getAccessToken();
      if (latestToken && latestToken !== token) {
        setToken(latestToken);
      }
      setUser(me.user || null);
      setIsAuthenticated(Boolean(me.user));
    } catch (error) {
      clearAccessToken();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async ({ email, password }) => {
    const result = await backendApi.auth.login({ email, password });
    applySession(result);
    return result;
  };

  const register = async ({ name, fullName, email, password, role }) => {
    const payload = {
      name: name || fullName,
      email,
      password,
      role,
    };
    const result = await backendApi.auth.register(payload);
    return result;
  };

  const verifyOtp = async ({ email, code }) => {
    const result = await backendApi.auth.verifyOtp({ email, code });
    applySession(result);
    return result;
  };

  const logout = async (shouldRedirect = false) => {
    try {
      await backendApi.auth.logout();
    } catch {
      // Clear local auth state even when backend logout fails.
    }

    clearAccessToken();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      window.location.assign(createPageUrl("Login"));
    }
  };

  const navigateToLogin = () => {
    window.location.assign(createPageUrl("Login"));
  };

  const role = user?.role || null;
  const isDonor = role === "DONOR" || role === "ROLE_RESTAURANT";
  const isReceiver = role === "RECEIVER" || role === "ROLE_RECEIVER";
  const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
  const isVerifiedDonor = isDonor;
  // hasRole accepts both canonical (ROLE_RESTAURANT) and legacy (DONOR) names
  const hasRole = (...roles) => {
    const aliases = {
      DONOR: "ROLE_RESTAURANT",
      ROLE_RESTAURANT: "DONOR",
      RECEIVER: "ROLE_RECEIVER",
      ROLE_RECEIVER: "RECEIVER",
      ADMIN: "ROLE_ADMIN",
      ROLE_ADMIN: "ADMIN",
    };
    return roles.some((r) => r === role || aliases[r] === role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        token,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        login,
        register,
        verifyOtp,
        logout,
        role,
        isDonor,
        isReceiver,
        isAdmin,
        isVerifiedDonor,
        hasRole,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
