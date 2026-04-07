import { Link } from 'react-router-dom'

const footerLinks = [
  { label: 'Home', to: '/home' },
  { label: 'Agents', to: '/agents' },
  { label: 'Debate', to: '/debate' },
]

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(10,10,10,0.86),rgba(3,3,3,0.98))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="max-w-2xl">


          <p className="mt-4 text-sm leading-7 text-white/62 sm:text-base">
            Build a room full of experts, personas, and historical minds, then let the debate
            reveal the strongest answer.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-sm text-white/58 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {footerLinks.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>

          <p>© {year} noDiscord. Multi-agent conversations, one shared floor.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
