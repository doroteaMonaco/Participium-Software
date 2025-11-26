import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { Login } from "src/pages/LoginPage";
import { Register } from "src/pages/RegisterPage";
import UserDashboardPage from "./pages/UserDashboard/UserDashboardPage";
import NewReportPage from "./pages/UserDashboard/NewReportPage";
import UserSettingsPage from "./pages/UserDashboard/UserSettingsPage";
import AdminDashboardPage from "./pages/AdminDashboard/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminDashboard/AdminUsersPage";
import MunicipalityReportsPage from "./pages/MunicipalityDashboard/MunicipalityReportsPage";
import MunicipalityTechnicalReportsPage from "./pages/MunicipalityDashboard/TechnicalReportsPage";
import { NavBar } from "src/components/Navbar";
import { Footer } from "src/components/Footer";
import { AuthProvider } from "src/contexts/AuthContext";
import { ProtectedRoute } from "src/components/ProtectedRoute";

import LandingPage from "src/pages/LandingPage";

// import MapPage from "./pages/MapPage";
import ReportDetailsPage from "./pages/ReportDetailsPage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            {/* User Dashboard routes - protected, CITIZEN role */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="CITIZEN">
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute requiredRole="CITIZEN">
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/new-report"
              element={
                <ProtectedRoute requiredRole="CITIZEN">
                  <NewReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute requiredRole="CITIZEN">
                  <UserSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Dashboard routes - protected, ADMIN role */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />

            {/* Municipality Dashboard routes - protected, MUNICIPALITY role */}
            <Route
              path="/municipality/reports"
              element={
                <ProtectedRoute
                  requiredRole="MUNICIPALITY"
                  requiredMunicipalityRole="municipal public relations officer"
                >
                  <MunicipalityReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/municipality/technical-reports"
              element={
                <ProtectedRoute requiredRole="MUNICIPALITY">
                  <MunicipalityTechnicalReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Public routes - with navbar/footer */}
            <Route
              path="*"
              element={
                <>
                  <NavBar />
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    {/* <Route path="/map" element={<MapPage />} /> */}
                    <Route path="/report/:id" element={<ReportDetailsPage />} />
                  </Routes>
                  <Footer />
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
