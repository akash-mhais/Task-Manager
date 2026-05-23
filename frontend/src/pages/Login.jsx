import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Workflow, Lock, Mail, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { login, forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await login(email, password);
    if (res.success) {
      navigate("/");
    } else {
      setError(res.error);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");

    if (!forgotEmail) {
      setForgotError("Please enter your Email ID.");
      return;
    }

    const res = await forgotPassword(forgotEmail);
    if (res.success) {
      setForgotMessage(res.message);
    } else {
      setForgotError(res.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 z-10 animate-slide-in">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center bg-brand-600 p-3 rounded-lg text-white mb-3">
            <Workflow size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Faith Automation</h2>
          <p className="mt-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Project & Task Manager
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 space-y-6">
          <h3 className="text-lg font-bold text-white">Sign In</h3>

          {error && (
            <div className="p-3 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@faithautomation.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 placeholder-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs font-semibold text-brand-500 hover:text-brand-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-12 text-sm text-white focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 placeholder-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>

        {/* Info footer for testing */}
        <div className="text-center bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-300">Developer/Testing Credentials:</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="font-semibold text-slate-400">Manager Account:</p>
              <p>manager@faithautomation.com</p>
              <p className="text-[10px]">ManagerPassword123!</p>
            </div>
            <div>
              <p className="font-semibold text-slate-400">Employee Account:</p>
              <p>employee@faithautomation.com</p>
              <p className="text-[10px]">EmployeePassword123!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">Password Recovery</h3>
              <button
                onClick={() => {
                  setIsForgotOpen(false);
                  setForgotError("");
                  setForgotMessage("");
                  setForgotEmail("");
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {forgotError && (
              <div className="p-3 mb-4 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                {forgotError}
              </div>
            )}

            {forgotMessage && (
              <div className="p-3 mb-4 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg">
                {forgotMessage}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your work Email ID below. The portal will simulate password recovery by generating a temporary default password on the server.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email ID
                </label>
                <input
                  type="email"
                  required
                  placeholder="username@faithautomation.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-bold transition-colors"
              >
                Recover Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
