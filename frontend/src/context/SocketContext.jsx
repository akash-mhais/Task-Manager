import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import API from "../services/api";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef();

  // Load existing notifications
  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const res = await API.get("/notifications");
          if (res.data.success) {
            setNotifications(res.data.notifications);
          }
        } catch (err) {
          console.error("Error loading notifications", err);
        }
      };
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Handle socket connection
  useEffect(() => {
    if (user) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
      console.log(`Connecting socket to: ${socketUrl}`);
      const socketIo = io(socketUrl);
      
      socketRef.current = socketIo;
      setSocket(socketIo);

      // Register user on socket server
      socketIo.emit("register", user._id);

      // Listen for incoming notifications
      socketIo.on("receive_notification", (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        
        // Push to active toast alerts
        const toastId = Date.now();
        setToasts((prev) => [...prev, { id: toastId, ...notification }]);

        // Auto remove toast after 5 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 5000);
      });

      return () => {
        socketIo.disconnect();
        console.log("Socket disconnected");
      };
    } else {
      setSocket(null);
    }
  }, [user]);

  const markAllAsRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all read", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification read", err);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        toasts,
        markAllAsRead,
        markAsRead,
        removeToast
      }}
    >
      {children}
      
      {/* Real-time Toast Drawer */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex flex-col bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 shadow-xl border-l-4 border-violet-500 rounded-lg p-4 animate-slide-in relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-sm text-violet-600 dark:text-violet-400">
                {toast.title}
              </h4>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-semibold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {toast.message}
            </p>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
