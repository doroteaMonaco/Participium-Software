import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, User, Mail, Lock } from "lucide-react";
import registrationIll from "src/assets/registration-ill.png";
import { register, type UserRegistration } from "../services/api";
import { useAuth } from "src/contexts/AuthContext";

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const {
    login: setAuthUser,
    checkAuth,
    isAuthenticated,
    user,
    isLoading,
  } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (user.role === "MUNICIPALITY") {
        // Redirect based on municipality role
        const municipalityRole = user.municipality_role?.name?.toLowerCase() || "";
        if (municipalityRole.includes("municipal public relations officer")) {
          navigate("/municipality/reports", { replace: true });
        } else {
          navigate("/municipality/technical-reports", { replace: true });
        }
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
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

    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.username ||
      !formData.email ||
      !formData.password
    ) {
      setError("All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const userData: UserRegistration = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };

      const user = await register(userData);
      // Save user to context (registration auto-logs in)
      setAuthUser({ ...user, role: "CITIZEN" });
      // Refresh auth state
      await checkAuth();

      navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
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
              Create your account
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Join{" "}
              <span className="font-semibold text-indigo-600">Participium</span>{" "}
              to start reporting and tracking city issues.
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

            {/* Full Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 !w-full items-start justify-center ">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name
                </label>
                <div className="relative w-full">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                    className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 !w-full items-start justify-center ">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name
                </label>
                <div className="relative w-full">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1 !w-full items-start justify-center ">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <div className="relative w-full">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  required
                  className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1 !w-full items-start justify-center ">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="relative w-full">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 !w-full items-start justify-center ">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 !w-full items-start justify-center ">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-9 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm shadow-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link
              to="/login"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Sign in
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
            alt="Registration illustration"
            className="w-full max-w-lg h-auto drop-shadow-2xl"
          />
        </motion.div>
      </div>
    </div>
  );
};
