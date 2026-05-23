import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Users,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Workflow
} from "lucide-react";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();

  if (!user) return null;

  // Define navigation based on role
  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["Manager", "Team Leader", "Employee"] },
    { name: "Projects", path: "/projects", icon: Briefcase, roles: ["Manager", "Team Leader", "Employee"] },
    { name: "Tasks", path: "/tasks", icon: CheckSquare, roles: ["Manager", "Team Leader", "Employee"] },
    { name: "Users Directory", path: "/users", icon: Users, roles: ["Admin"] },
    { name: "Reports", path: "/reports", icon: BarChart3, roles: ["Manager"] }
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <aside
      className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-gray-800">
            <div className="bg-brand-600 p-2 rounded-lg text-white">
              <Workflow size={20} />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-800 dark:text-white leading-none">Faith Automation</h1>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Task Manager</span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="p-4 mx-3 my-4 bg-slate-50 dark:bg-gray-800/50 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-gray-800/60">
            <img
              src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/20"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</h2>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium truncate uppercase">{user.role}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={toggleSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800/80 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800 space-y-2">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </div>
            <div className="w-8 h-4 bg-slate-200 dark:bg-gray-700 rounded-full relative p-0.5 transition-colors">
              <div
                className={`w-3 h-3 bg-white dark:bg-gray-200 rounded-full shadow-sm transform transition-transform ${
                  darkMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
          </button>

          {/* Log Out */}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
