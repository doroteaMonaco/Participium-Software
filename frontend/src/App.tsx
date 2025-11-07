import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from 'src/pages/LandingPage'
import UsersPage from 'src/pages/UsersPage'
import { Login } from 'src/pages/LoginPage'
import { Register } from 'src/pages/RegisterPage'
import { NavBar } from 'src/components/Navbar'
import UserDashboardPage from './pages/UserDashboard/UserDashboardPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <>
              <NavBar />
              <Login />
            </>
          } />
          <Route path="/register" element={
            <>
              <NavBar />
              <Register />
            </>
          } />
          <Route path="/users" element={
            <>
              <NavBar />
              <UsersPage />
            </>
          } />
          <Route path="/dashboard" element={<UserDashboardPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
