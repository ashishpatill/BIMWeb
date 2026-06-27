"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type Theme = "light" | "dark" | "system"

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getInitialTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback
  const stored = localStorage.getItem(storageKey) as Theme | null
  return stored ?? fallback
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return theme
}

function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "bimweb-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getInitialTheme(storageKey, defaultTheme)
  )

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme])

  // Sync the DOM class with the resolved theme
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return

    function handleChange(e: MediaQueryListEvent) {
      const root = document.documentElement
      const newTheme = e.matches ? "dark" : "light"
      root.classList.remove("light", "dark")
      root.classList.add(newTheme)
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [theme])

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      localStorage.setItem(storageKey, newTheme)
    },
    [storageKey]
  )

  return (
    <ThemeProviderContext.Provider
      value={useMemo(
        () => ({
          theme,
          resolvedTheme,
          setTheme,
        }),
        [theme, resolvedTheme, setTheme]
      )}
    >
      {children}
    </ThemeProviderContext.Provider>
  )
}

function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

export { ThemeProvider, useTheme }
