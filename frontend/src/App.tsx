import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from 'src/pages/LandingPage'
import UsersPage from 'src/pages/UsersPage'
import { NavBar } from 'src/components/Navbar'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/users" element={
            <>
              <NavBar />
              <UsersPage />
            </>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
