import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {  Mail, CheckCircle, Clock } from "lucide-react";
import { confirmRegistration } from "../services/api";

export const ConfirmRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromParams = searchParams.get("email");

  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30 * 60); // 30 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect to register if no email is provided
  useEffect(() => {
    if (!emailFromParams) {
      navigate("/register");
    }
  }, [emailFromParams, navigate]);

  // Timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);
    setError("");

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    const newDigits = [...codeDigits];
    
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setCodeDigits(newDigits);
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = codeDigits.join("");

    // Validation
    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    if (!emailFromParams) {
      setError("Email not found. Please register again.");
      return;
    }

    setLoading(true);

    try {
      await confirmRegistration({ email: emailFromParams, code });
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login", { 
          state: { 
            message: "Account confirmed successfully! Please login." 
          } 
        });
      }, 2000);
    } catch (err: any) {
      console.error("Confirmation error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Confirmation failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    setError("Resend functionality will be available soon.");
    // Reset timer after successful resend
    setResendTimer(30 * 60);
    setCanResend(false);
  };

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-100 via-white to-emerald-50">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-200 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-emerald-200 opacity-30 blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl shadow-[0_10px_40px_-10px_rgba(79,70,229,0.25)] p-10 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg mb-6">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
            Account Confirmed!
          </h1>
          <p className="text-slate-600 mb-6">
            Your account has been successfully confirmed. Redirecting you to login...
          </p>
          <div className="animate-spin mx-auto h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-100 via-white to-emerald-50">
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-200 opacity-40 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-72 w-72 rounded-full bg-emerald-200 opacity-30 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-50 via-white to-transparent" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-lg mx-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-[0_20px_60px_-10px_rgba(79,70,229,0.3)] p-12"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg mb-6">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
            Verify Your Email
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            We've sent a 6-digit confirmation code to{" "}
            <span className="font-semibold text-indigo-600 block mt-1">{emailFromParams}</span>
          </p>
          
          {/* Timer */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Code expires in: {formatTime(resendTimer)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 text-center"
            >
              {error}
            </motion.div>
          )}

          {/* 6-Digit Code Inputs */}
          <div className="space-y-3">
            <label htmlFor="confirmation-code-0" className="block text-sm font-semibold text-slate-700 text-center mb-4">
              Enter Confirmation Code
            </label>
            <div className="flex justify-center gap-3">
              {codeDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`confirmation-code-${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-14 h-16 text-center text-2xl font-bold border-2 border-slate-300 rounded-xl bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm hover:border-indigo-400"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center mt-3">
              Enter the 6-digit code from your email
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || codeDigits.some(d => !d)}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-base font-semibold text-white shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200 focus:ring-4 focus:ring-indigo-200 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Verifying...
              </span>
            ) : (
              "Confirm Email"
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center pt-4 border-t border-slate-200">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendCode}
                className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
              >
                Resend Code
              </button>
            ) : (
              <p className="text-sm text-slate-500">
                Didn't receive the code? You can resend in {formatTime(resendTimer)}
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Check your spam folder if you don't see the email
        </p>
      </motion.div>
    </div>
  );
};
