import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, User } from "lucide-react";
import registrationIll from "src/assets/registration-ill.png";
import { login, type LoginRequest } from "../services/api";
import { useAuth } from "src/contexts/AuthContext";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuthUser, isAuthenticated, user, isLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (user.role === "MUNICIPALITY") {
        navigate("/municipality/reports", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.identifier || !formData.password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);

    try {
      const credentials: LoginRequest = {
        identifier: formData.identifier,
        password: formData.password,
      };

      const user = await login(credentials);
      // Save user to context
      setAuthUser(user);

      // Role-based routing
      if (user.role === "ADMIN") {
        navigate("/admin");
      } else if (user.role === "MUNICIPALITY") {
        navigate("/municipality/reports");
      } else {
        // CITIZEN role or default
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-100 via-white to-emerald-50">
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-200 opacity-40 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-emerald-200 opacity-30 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-white to-transparent" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Login Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.25)] p-10"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Sign in to continue contributing to{" "}
                <span className="font-semibold text-indigo-600">
                  Participium
                </span>
                .
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Username or Email */}
              <div className="flex flex-col gap-1 !w-full items-start justify-center ">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username or Email
                </label>
                <div className="relative w-full">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="identifier"
                    value={formData.identifier}
                    onChange={handleChange}
                    placeholder="your username or email"
                    required
                    className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1 !w-full items-start justify-center ">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>
              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {/* Footer Links */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Don’t have an account?{" "}
              <Link
                to="/register"
                className="text-indigo-600 font-semibold hover:underline"
              >
                Create one
              </Link>
            </p>

            <p className="mt-4 text-center text-xs text-slate-400">
              Securely handled under{" "}
              <span className="text-indigo-600 font-medium">Participium</span>{" "}
              privacy standards.
            </p>
          </motion.div>
          {/* Illustration Side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hidden lg:flex items-center justify-center"
          >
            <img
              src={registrationIll}
              alt="Login illustration"
              className="w-full max-w-lg h-auto drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
