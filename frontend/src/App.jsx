import './App.css'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './libs/store'
import Footer from "./components/Footer"
import Navbar from './components/Navbar'
import SettingsModal from './components/SettingsModal'
import AgentsPage from './pages/AgentsPage'
import DebatePage from './pages/DebatePage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import HistoryDebatePage from './pages/HistoryDebatePage'
import LearnLawsPage from './pages/LearnLawsPage'
import VRInterviewPage from './pages/VRInterviewPage'
import HealthDiagnosisPage from './pages/HealthDiagnosisPage'

const AppShell = () => {
  const { pathname } = useLocation()
  const isHomeRoute = pathname === '/' || pathname === '/home'
  const isSettingsModalOpen = useStore((s) => s.isSettingsModalOpen)
  const closeSettingsModal = useStore((s) => s.closeSettingsModal)

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Navbar />
      </div>

      <main className={'w-full '}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/agensts" element={<Navigate to="/agents" replace />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/debate" element={<DebatePage />} />
          <Route path="/history-debate" element={<HistoryDebatePage />} />
          <Route path="/learn-laws" element={<LearnLawsPage />} />
          <Route path="/vr-interview" element={<VRInterviewPage />} />
          <Route path="/health-diagnosis" element={<HealthDiagnosisPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
      
      <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />
      {/* <Footer /> */}
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
