import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

/** Bottom toast with an optional action (used for "Undo"). */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message, action) => {
    clearTimeout(timer.current)
    setToast({ id: Date.now(), message, action })
    timer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="animate-fade pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-surface shadow-xl"
          >
            <span className="tabular min-w-0 flex-1 truncate text-sm">{toast.message}</span>
            {toast.action && (
              <button
                className="h-10 shrink-0 rounded-xl px-4 text-sm font-bold active:bg-white/10"
                onClick={() => {
                  toast.action.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
