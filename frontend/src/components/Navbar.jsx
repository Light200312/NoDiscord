import { NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { cn } from '../libs/utils'
import { useStore } from '../libs/store'

const navLinks = [
  { label: 'Home', to: '/home' },
  { label: 'Agents', to: '/agents' },
  { label: 'Debate', to: '/debate' },
  { label: 'History', to: '/history' },
]

const Navbar = () => {
  const settings = useStore((s) => s.settings)
  const openSettingsModal = useStore((s) => s.openSettingsModal)
  return (
    <header className="sticky top-4 z-50">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(34,34,34,0.92),rgba(10,10,10,0.92))] px-5 py-3 text-white shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <NavLink
          to="/home"
          className="flex items-center gap-3 rounded-full pr-4 transition-opacity duration-200 hover:opacity-90"
        >
          <span className="relative block w-12  h-9 overflow-hidden rounded-full shadow-[0_8px_20px_rgba(255,255,255,0.18)]">
            {/* <span className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-[6px] bg-[#050505]" />
             */}
             <img className=' w-12' h-10 src="/logo2.png" alt="" />
          </span>
          <span className="text-lg font-semibold tracking-tight">noDiscord</span>
        </NavLink>

        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          {navLinks.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/8 hover:text-white',
                  isActive && 'bg-white text-neutral-950 shadow-[0_10px_24px_rgba(255,255,255,0.16)]',
                )
              }
            >
              {label}
            </NavLink>
          ))}

          <button
            onClick={openSettingsModal}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white"
            title={`${settings.orchestrationMode} • ${settings.memoryMode} • ${settings.languageMode === 'english_in' ? 'EN(IN)' : 'HIN'}`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
