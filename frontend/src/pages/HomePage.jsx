import { Link } from 'react-router-dom'

const heroStats = [
  { value: 'Dynamic', label: 'debate simulation' },
  { value: 'Infinity', label: 'Persona Types' },
  { value: 'Popular LLMs', label: 'by openRouter' },
  { value: 'Live', label: 'AI Judging' },
]

const chambers = [
  {
    title: 'Walk Into the Past',
    description:
      "Cast historians, rulers, and empire-builders into one room to challenge each other's versions of power, memory, and consequence.",
    tags: ['History', 'Conflict', 'Leadership'],
    className: 'lg:col-span-2',
  },
  {
    title: 'Where Laws Are Made',
    description:
      'Bring constitutional thinkers, economists, and legal philosophers together to test freedom, duty, and the cost of every decision.',
    tags: ['Law', 'Policy', 'Ethics'],
    className: 'lg:col-span-2',
  },
  {
    title: 'Face the Panel',
    description:
      'Simulate a live board, review panel, or oral defense where sharp evaluators press your ideas until the weak logic falls away.',
    tags: ['Interview', 'Panel', 'Review'],
    className: 'lg:col-span-2',
  },
  {
    title: 'The Arena They Never Allowed',
    description:
      'Stage the political, strategic, and diplomatic clashes history never let happen and watch competing doctrines collide in public.',
    tags: ['Strategy', 'Diplomacy', 'Debate'],
    className: 'lg:col-span-3',
  },
  {
    title: 'Your Personal Think Tank',
    description:
      'Assemble a private council of specialists, skeptics, and operators to pressure-test a plan before the world gets a vote.',
    tags: ['Advisors', 'Research', 'Decision'],
    className: 'lg:col-span-3',
  },
]

const sessionSteps = [
  {
    step: 'I',
    title: 'Set the Topic',
    description:
      'Drop in a question, case, conflict, or scenario. The system frames the session around the pressure point that matters.',
  },
  {
    step: 'II',
    title: 'Assemble Council',
    description:
      'Bring your room into focus with historical figures, expert panels, personas, or custom presences built for the session.',
  },
  {
    step: 'III',
    title: 'Watch Them Argue',
    description:
      'The conversation escalates through disagreement, expert reasoning, and synthesis until the useful signal becomes impossible to miss.',
  },
  {
    step: 'IV',
    title: 'Auto-Pilot',
    description:
      'Sit back and enjoy the debate , No instruction needed just grab a drink listen like a poadcast'
  },
]

const playModes = [
  {
    image: "/puppet.png",
    title: 'Dynamic Orchestration',
    description:
      'Adapt prompts, references, and framing to the exact room so each session behaves like a custom format instead of a template.',
    mvp:
      'Fair and relevant orchestration is achieved through a credit-based turn-taking system where each model begins with equal starting credits. When choosing among agents with similar credits, one is selected at random. To maintain balance, the chosen agents credits are decreased while the credits of all unselected agents are increased. However, to ensure contextual relevance, this random selection is overridden if a specific agent is mentioned in past messages, automatically granting that mentioned model the next turn.'
  },
  {
    image: "/birdFamily.png",
    title: 'Persona Routing',
    description:
      'Blend experts, historical figures, and fictional voices so the strongest perspective enters when the room actually needs it.',
    mvp:
      'Based on the "Bird Family Theorem," the orchestrator manages debate turns much like a mother bird feeding her chicks. While she instinctively tries to feed all her chicks fairly to give each a chance, she subconsciously favors the strongest chick to maximize its chances of survival. Similarly, the orchestrator ensures every agent gets a fair baseline opportunity to speak, but strategically prioritizes the most relevant agent. This priority is determined by past messages and which agents specific role can contribute the most value to the current context.'
  },
]

const sectionLabelClass =
  'text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/45'

const panelClass =
  'rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-sm'

const HomePage = () => {
  return (
    <div
      className="relative overflow-hidden bg-[#020202] text-white"
      style={{ fontFamily: '"Aptos", "Segoe UI", sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(255,178,102,0.12),transparent_24%),radial-gradient(circle_at_18%_62%,rgba(111,175,255,0.12),transparent_25%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:100%_156px] opacity-20" />
        <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-white/8 blur-[180px]" />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1
            className="text-5xl font-black tracking-[-0.08em] text-white sm:text-6xl lg:text-8xl"
            style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
          >
            LLM Council
          </h1>

          <p className="mt-5 text-base font-medium tracking-[0.16em] text-white/55 sm:text-lg">
            Multi-Agent Intelligence Platform
          </p>

          <p className="mx-auto mt-8 max-w-3xl text-2xl font-medium leading-tight text-white sm:text-3xl">
            What is better &mdash; the smart LLM, or a team of smart agents?
          </p>

          <p className="mx-auto mt-8 max-w-3xl text-base leading-8 text-white/72 sm:text-xl">
            Assemble history&apos;s greatest minds, world leaders, and expert panels. Watch them
            argue, teach, and illuminate in one room.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/debate"
              className="inline-flex min-w-[15rem] items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/14"
            >
              Convene a Council
              <span className="ml-3 text-white/70">-&gt;</span>
            </Link>

            <a
              href="#play-modes"
              className="inline-flex min-w-[15rem] items-center justify-center rounded-full border border-white/12 px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/88 transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/6 hover:text-white"
            >
              Explore Modes
            </a>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className={`${panelClass} group min-h-[10.5rem] px-6 py-7 transition duration-300 hover:-translate-y-1 hover:border-white/20`}
            >
              <div className="flex h-full flex-col justify-between">
                <span
                  className="text-4xl font-black tracking-[-0.06em] text-white"
                  style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
                >
                  {stat.value}
                </span>
                <p className="text-sm uppercase tracking-[0.22em] text-white/50">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative border-y border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className={`${panelClass} mx-auto max-w-4xl px-8 py-12 text-center sm:px-14`}>
            <p className="text-xl font-semibold leading-relaxed text-white sm:text-2xl">
              A single smart model gives you one perspective.
            </p>
            <p className="mt-3 text-xl font-semibold leading-relaxed text-white sm:text-2xl">
              A council of smart agents gives you the truth.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
              Stop consulting a single opinion. Convene the greatest minds in history or the
              sharpest experts alive.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className={sectionLabelClass}>What You Can Do With It</p>
          <h2
            className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl"
            style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
          >
            Five Chambers. Infinite Conversations.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-6">
          {chambers.map((chamber) => (
            <article
              key={chamber.title}
              className={`${panelClass} ${chamber.className} group px-6 py-6 transition duration-300 hover:-translate-y-1 hover:border-white/20`}
            >
              <div className="mb-6 h-9 w-9 rounded-full border border-white/14 bg-white/6" />
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                {chamber.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-white/68 sm:text-[0.96rem]">
                {chamber.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {chamber.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-white/48"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative border-y border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className={sectionLabelClass}>The Process</p>
            <h2
              className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl"
              style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
            >
              How a Session Unfolds
            </h2>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-4">
            {sessionSteps.map((item) => (
              <article
                key={item.step}
                className={`${panelClass} px-6 py-7 transition duration-300 hover:-translate-y-1 hover:border-white/20`}
              >
                <p
                  className="text-3xl font-black tracking-[-0.06em] text-white"
                  style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
                >
                  {item.step}
                </p>
                <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="play-modes" className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className={sectionLabelClass}>The Play Modes</p>
          <h2
            className="mt-4 text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl"
            style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
          >
            Choose How You Play
          </h2>
        </div>

        <div className="mt-14 flex flex-col gap-8">
          {playModes.map((mode) => (
            <article
              key={mode.title}
              className={`${panelClass} flex flex-col md:flex-row gap-8 p-6 sm:p-8 transition duration-300 hover:-translate-y-1 hover:border-white/20`}
            >
              {/* Image Container (Left Side) */}
              <div className="shrink-0 flex items-center justify-center w-full md:w-64 h-64 rounded-2xl border border-white/10 bg-white/5 overflow-hidden ">
                <img
                  src={mode.image}
                  alt={mode.title}
                  className="w-full h-full object-contain p-4 opacity-80"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <span className="hidden text-sm uppercase tracking-widest text-white/30">Image</span>
              </div>

              {/* Content Container (Right Side) */}
              <div className="flex flex-col justify-center flex-1">
                <h3 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                  {mode.title}
                </h3>

                <p className="mt-4 text-base leading-relaxed text-white/70">
                  {mode.description}
                </p>

                {/* MVP Section */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <span className="block mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                    MVP Implementation
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-white/50 italic">
                    {mode.mvp}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative border-t border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <h2
              className="text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl lg:text-7xl"
              style={{ fontFamily: '"Bahnschrift", "Aptos", "Segoe UI", sans-serif' }}
            >
              <span className="block">One Model Thinks.</span>
              <span className="mt-2 block text-amber-300">A Council Decides.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/68 sm:text-2xl">
              Stop consulting a single opinion. Convene the greatest minds in history, or the
              sharpest experts alive.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/debate"
                className="inline-flex min-w-[16rem] items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/14"
              >
                Open the Council
                <span className="ml-2 text-white/70">-&gt;</span>
              </Link>

              <Link
                to="/agents"
                className="inline-flex min-w-[16rem] items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/88 transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/8 hover:text-white"
              >
                Browse Personas
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
