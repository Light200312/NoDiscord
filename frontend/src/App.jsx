import './App.css'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer from "./components/Footer"
import Navbar from './components/Navbar'
import AgentsPage from './pages/AgentsPage'
import DebatePage from './pages/DebatePage'
import HomePage from './pages/HomePage'

const AppShell = () => {
  const { pathname } = useLocation()
  const isHomeRoute = pathname === '/' || pathname === '/home'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Navbar />
      </div>

      <main className={'w-full '}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/agensts" element={<AgentsPage />} />
          <Route path="/agents" element={<Navigate to="/agensts" replace />} />
          <Route path="/debate" element={<DebatePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
