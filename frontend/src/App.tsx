import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { Login } from "src/pages/LoginPage";
import { Register } from "src/pages/RegisterPage";
import UserDashboardPage from "./pages/UserDashboard/UserDashboardPage";
import NewReportPage from "./pages/UserDashboard/NewReportPage";
import AdminDashboardPage from "./pages/AdminDashboard/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminDashboard/AdminUsersPage";
import AdminReportsPage from "./pages/AdminDashboard/AdminReportsPage";
import TechnicalReportsPage from "./pages/AdminDashboard/TechnicalReportsPage";
import { NavBar } from "src/components/Navbar";
import { Footer } from "src/components/Footer";

import LandingPage from "src/pages/LandingPage";

import MapPage from "./pages/MapPage";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          {/* User Dashboard routes - no navbar/footer */}
          <Route path="/dashboard" element={<UserDashboardPage />} />
          <Route path="/dashboard/*" element={<UserDashboardPage />} />
          <Route path="/dashboard/new-report" element={<NewReportPage />} />

          {/* Admin Dashboard routes - no navbar/footer */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/technical-reports" element={<TechnicalReportsPage />} />

          {/* Public routes - with navbar/footer */}
          <Route path="*" element={
            <>
              <NavBar />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/map" element={<MapPage />} />
              </Routes>
              <Footer />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
