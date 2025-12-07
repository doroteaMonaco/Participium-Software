import React, { useState, useEffect } from "react";
import { DashboardLayout } from "src/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Save,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Info,
  Upload,
  Check,
  X,
} from "lucide-react";
import { updateCitizenProfile, verifyAuth } from "src/services/api";

export const UserSettingsPage: React.FC = () => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [telegramUsername, setTelegramUsername] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const user = await verifyAuth();
        if (user.telegramUsername) {
          setTelegramUsername(user.telegramUsername);
        }
        if (typeof user.notificationsEnabled === "boolean") {
          setEmailNotifications(user.notificationsEnabled);
        }
        if (user.profilePhoto) {
          // profilePhoto comes as a URL from the backend
          setProfilePhoto(`http://${user.profilePhoto}`);
        }
      } catch (error) {
        console.error("Failed to load user preferences:", error);
      }
    };

    loadUserPreferences();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification("error", "Photo size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        setProfilePhotoFile(file);
        showNotification("success", "Profile photo updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const formData = new FormData();

      // Add photo if changed
      if (profilePhotoFile) {
        formData.append("photo", profilePhotoFile);
      }

      // Add telegram username if provided
      if (telegramUsername.trim()) {
        formData.append("telegramUsername", telegramUsername.trim());
      }

      // Add notifications preference
      formData.append("notificationsEnabled", String(emailNotifications));

      await updateCitizenProfile(formData);
      showNotification("success", "Settings saved successfully!");

      // Clear the photo file after successful save
      setProfilePhotoFile(null);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save settings";
      showNotification("error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        {/* Notification */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 rounded-xl px-6 py-4 shadow-lg border-2 ${
              notification.type === "success"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className="text-sm font-semibold">{notification.message}</p>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            ⚙️ My Account Settings
          </h1>
          <p className="text-base text-slate-600">
            Personalize your experience and stay connected with your community
          </p>
        </div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="px-6 py-5 border-b-2 border-indigo-100 bg-indigo-50/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white shadow-md">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  👤 Profile Photo
                </h2>
                <p className="text-sm text-slate-600">
                  Make your account more personal
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center gap-6">
              {/* Profile Photo */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-200 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-lg group-hover:border-indigo-300 transition-colors">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-indigo-300" />
                  )}
                </div>
                {profilePhoto && (
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                <label className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg cursor-pointer transition-all">
                  <Upload className="h-4 w-4" />
                  {profilePhoto ? "Change Photo" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <div className="flex items-start gap-2 text-xs text-slate-500">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Square image recommended. Max 5MB (JPG, PNG, or GIF)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/30 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="px-6 py-5 border-b-2 border-blue-100 bg-blue-50/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-md">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  🔔 Notifications
                </h2>
                <p className="text-sm text-slate-600">
                  Stay updated on your reports
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Email Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white border-2 border-blue-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    Email Updates
                  </p>
                  <p className="text-sm text-slate-600">
                    Get notifications in your inbox
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all shadow-inner ${
                  emailNotifications ? "bg-green-500" : "bg-slate-300"
                }`}
                aria-label="Toggle email notifications"
              >
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                    emailNotifications ? "translate-x-7" : "translate-x-1"
                  }`}
                >
                  {emailNotifications ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-slate-400" />
                  )}
                </span>
              </button>
            </div>

            {/* Telegram Section */}
            <div className="p-4 rounded-xl bg-white border-2 border-blue-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Telegram Bot
                    </p>
                    <p className="text-sm text-slate-600">
                      Instant notifications on your phone
                    </p>
                  </div>
                </div>
                {telegramUsername && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border-2 border-green-200">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="telegram_username"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Your Telegram Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 text-base font-bold">
                      @
                    </span>
                    <input
                      id="telegram_username"
                      type="text"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="your_username"
                      className="w-full rounded-xl border-2 border-blue-200 bg-white pl-9 pr-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 pt-4"
        >
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Save className="h-5 w-5" />
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default UserSettingsPage;
