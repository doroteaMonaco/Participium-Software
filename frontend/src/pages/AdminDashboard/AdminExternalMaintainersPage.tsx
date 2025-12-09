import React, { useState, useEffect } from "react";
import { AdminDashboardLayout } from "../../components/dashboard/AdminDashboardLayout";
import { motion } from "framer-motion";
import {
  Plus,
  Wrench,
  Search,
  Loader,
  AlertCircle,
  Building2,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  getExternalMaintainerUsers,
  createExternalMaintainerUser,
} from "src/services/api";
import type { ExternalMaintainerUserCreateRequest } from "src/services/api";

// Categories for external maintainers
const CATEGORIES = [
  { value: "WATER_SUPPLY_DRINKING_WATER", label: "Water Supply - Drinking Water" },
  { value: "ARCHITECTURAL_BARRIERS", label: "Architectural Barriers" },
  { value: "SEWER_SYSTEM", label: "Sewer System" },
  { value: "PUBLIC_LIGHTING", label: "Public Lighting" },
  { value: "WASTE", label: "Waste" },
  { value: "ROAD_SIGNS_TRAFFIC_LIGHTS", label: "Road Signs and Traffic Lights" },
  { value: "ROADS_URBAN_FURNISHINGS", label: "Roads and Urban Furnishings" },
  { value: "PUBLIC_GREEN_AREAS_PLAYGROUNDS", label: "Public Green Areas and Playgrounds" },
  { value: "OTHER", label: "Other" },
];

// Map API user to display format
interface DisplayUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username: string;
  email: string;
  companyName: string;
  category: string;
  createdAt: string;
}

export const AdminExternalMaintainersPage: React.FC = () => {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    companyName: "",
    category: "PUBLIC_LIGHTING",
  });
  const [submitting, setSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await getExternalMaintainerUsers();

      // Transform API users to display format
      const transformedUsers: DisplayUser[] = usersData.map((user: any) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        companyName: user.companyName,
        category: user.category,
        createdAt: user.createdAt,
      }));

      setUsers(transformedUsers);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load external maintainers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const userData: ExternalMaintainerUserCreateRequest = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        companyName: newUser.companyName,
        category: newUser.category,
      };

      await createExternalMaintainerUser(userData);

      // Reload data to get updated list
      await loadData();

      // Reset form and close modal
      setNewUser({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        companyName: "",
        category: "PUBLIC_LIGHTING",
      });
      setShowAddModal(false);
    } catch (err: any) {
      console.error("Failed to create user:", err);

      // Extract specific error message from API response
      let errorMessage = "Failed to create external maintainer";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Make specific errors more user-friendly
      if (errorMessage.toLowerCase().includes("username")) {
        errorMessage =
          "Username already exists. Please choose a different username.";
      } else if (errorMessage.toLowerCase().includes("email")) {
        errorMessage =
          "Email is already in use. Please use a different email address.";
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Get category label
  const getCategoryLabel = (value: string) => {
    const cat = CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  // Filter users
  const filteredUsers = users.filter((user: DisplayUser) => {
    const matchesSearch =
      `${user.firstName || ""} ${user.lastName || ""} ${user.email} ${user.username} ${user.companyName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || user.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const totalUsersCount = users.length;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="h-6 w-6 text-orange-600" /> External Maintainers
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage external maintenance companies and contractors
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setShowAddModal(true);
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Maintainer
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 transition"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Maintainers</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalUsersCount}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Available Categories</p>
                <p className="text-2xl font-bold text-slate-900">
                  {CATEGORIES.length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, username, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Loader className="h-8 w-8 text-orange-600 mx-auto mb-3 animate-spin" />
            <p className="text-slate-600">Loading external maintainers...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">
              {searchQuery || filterCategory
                ? "No maintainers found matching your filters."
                : "No external maintainers yet. Add your first maintainer to get started."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm">
                      {(user.firstName?.[0] || user.username[0] || "E").toUpperCase()}
                      {(user.lastName?.[0] || user.username[1] || "M").toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username}
                      </h3>
                      <p className="text-sm text-slate-600">@{user.username}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>Company:</strong> {user.companyName}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Category:</strong>{" "}
                    <span className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                      {getCategoryLabel(user.category)}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Created:</strong>{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Plus className="h-5 w-5 text-orange-600" />
                Add External Maintainer
              </h2>

              {/* Error message inside modal */}
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900">
                      Error
                    </h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={newUser.firstName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, firstName: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={newUser.lastName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, lastName: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="user@company.com"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    required
                    value={newUser.companyName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, companyName: e.target.value })
                    }
                    placeholder="Company SRL"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    required
                    value={newUser.category}
                    onChange={(e) =>
                      setNewUser({ ...newUser, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setError(null);
                      setNewUser({
                        firstName: "",
                        lastName: "",
                        username: "",
                        email: "",
                        password: "",
                        companyName: "",
                        category: "PUBLIC_LIGHTING",
                      });
                    }}
                    disabled={submitting}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting && <Loader className="h-4 w-4 animate-spin" />}
                    {submitting ? "Creating..." : "Create Maintainer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body,
        )}
    </AdminDashboardLayout>
  );
};

export default AdminExternalMaintainersPage;
