import React, { useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const Layout = ({ setGlobalSearch }) => {
  const { token, user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // If loading user profile, show a beautiful loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">Loading WorkFlow Pro...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if token is missing
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admin routing check: Admin should only access /users.
  if (user && user.role === "Admin" && location.pathname !== "/users") {
    return <Navigate to="/users" replace />;
  }

  // Non-Admin routing check: non-Admins should not access /users.
  if (user && user.role !== "Admin" && location.pathname.startsWith("/users")) {
    return <Navigate to="/" replace />;
  }

  // Non-Manager reports access check
  if (user && user.role !== "Manager" && location.pathname.startsWith("/reports")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Topbar Component */}
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          setGlobalSearch={setGlobalSearch}
        />

        {/* Dynamic Page content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto animate-slide-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
