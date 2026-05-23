import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search, CheckCircle } from "lucide-react";

const Topbar = ({ onMenuClick, setGlobalSearch }) => {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (setGlobalSearch) {
      setGlobalSearch(e.target.value);
    }
  };

  const handleNotificationClick = async (notif) => {
    await markAsRead(notif._id);
    setShowNotifications(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-slate-200 dark:border-gray-800">
      {/* Left section: Hamburger & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-1.5 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-lg md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar */}
        <div className="relative max-w-md w-full hidden sm:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Global search projects, tasks, IDs..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-800 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100 transition-colors"
          />
        </div>
      </div>

      {/* Right section: Notifications & User profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              {/* Overlay to close popover */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />

              <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-20 animate-slide-in">
                {/* Popover Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-gray-800/80 border-b border-slate-100 dark:border-gray-700">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAllRead => {
                        markAllAsRead();
                        setShowNotifications(false);
                      }}
                      className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCircle size={10} />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Popover List */}
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex flex-col text-left w-full px-4 py-3 border-b border-slate-100 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors ${
                          !notif.read ? "bg-brand-50/20 dark:bg-brand-900/10" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-semibold ${!notif.read ? "text-slate-800 dark:text-slate-200" : "text-gray-500"}`}>
                            {notif.title}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-gray-800" />

        {/* User Details */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden md:block">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user.name}
            </span>
            <span className="block text-[10px] text-gray-500 font-semibold uppercase leading-none">
              {user.designation}
            </span>
          </div>
          <img
            src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/20"
          />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
