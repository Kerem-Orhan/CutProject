import { useCallback, useEffect, useState } from 'react'
import { StoreProvider } from './state/store.jsx'
import { LoggerProvider } from './state/logger.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { TabBar } from './components/TabBar.jsx'
import { TodayScreen } from './components/TodayScreen.jsx'
import { SuggestScreen } from './components/SuggestScreen.jsx'
import { FoodsScreen } from './components/FoodsScreen.jsx'
import { HistoryScreen } from './components/HistoryScreen.jsx'
import { SettingsScreen } from './components/SettingsScreen.jsx'

// Tab ↔ URL hash, so a refresh (or an installed-app shortcut) reopens the same tab.
const HASH = { today: 'today', suggest: 'fits', foods: 'foods', history: 'history', settings: 'setup' }

function initialTab() {
  const h = location.hash.replace('#', '')
  return Object.keys(HASH).find((t) => HASH[t] === h) ?? 'today'
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <LoggerProvider>
          <Shell />
        </LoggerProvider>
      </ToastProvider>
    </StoreProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState(initialTab)
  const [intent, setIntent] = useState(null)

  const goTo = useCallback((next, nextIntent = null) => {
    setTab(next)
    setIntent(nextIntent)
  }, [])
  const clearIntent = useCallback(() => setIntent(null), [])

  useEffect(() => {
    history.replaceState(null, '', `#${HASH[tab]}`)
    window.scrollTo({ top: 0 })
  }, [tab])

  return (
    <div className="pt-safe mx-auto min-h-dvh max-w-lg">
      <main className="px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {tab === 'today' && <TodayScreen goTo={goTo} />}
        {tab === 'suggest' && <SuggestScreen goTo={goTo} />}
        {tab === 'foods' && <FoodsScreen intent={intent} clearIntent={clearIntent} />}
        {tab === 'history' && <HistoryScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <TabBar tab={tab} onChange={(t) => goTo(t)} />
    </div>
  )
}
