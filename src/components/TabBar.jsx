import { IconToday, IconSpark, IconList, IconChart, IconGear } from './ui.jsx'

const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'suggest', label: 'What fits', Icon: IconSpark },
  { id: 'foods', label: 'My Foods', Icon: IconList },
  { id: 'history', label: 'History', Icon: IconChart },
  { id: 'settings', label: 'Settings', Icon: IconGear },
]

export function TabBar({ tab, onChange }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-md" aria-label="Main">
      <div className="mx-auto flex max-w-lg">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                active ? 'text-ink' : 'text-faint'
              }`}
            >
              <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? 'bg-sunken' : ''}`}>
                <Icon size={21} />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
