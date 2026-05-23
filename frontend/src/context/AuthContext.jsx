import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data on mount if token is available
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await API.get("/auth/me");
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem("user", JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error("Failed to load user profile", err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  // Log in user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.post("/auth/login", { email, password });
      if (res.data.success) {
        const { token: userToken, user: userData } = res.data;
        setToken(userToken);
        setUser(userData);
        localStorage.setItem("token", userToken);
        localStorage.setItem("user", JSON.stringify(userData));
        return { success: true };
      }
    } catch (err) {
      console.error("[AuthContext] Login API call failed:", err);
      const errMsg = err.response?.data?.error || "Login failed. Check credentials.";
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    }
  };

  // Sign out user
  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Forgot password
  const forgotPassword = async (email) => {
    setError(null);
    try {
      const res = await API.post("/auth/forgot-password", { email });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to trigger recovery.";
      return { success: false, error: errMsg };
    }
  };

  // Reset password
  const resetPassword = async (currentPassword, newPassword) => {
    setError(null);
    try {
      const res = await API.post("/auth/reset-password", { currentPassword, newPassword });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to reset password.";
      return { success: false, error: errMsg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        logout,
        forgotPassword,
        resetPassword,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
