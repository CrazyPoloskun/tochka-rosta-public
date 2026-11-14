"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export interface User {
  id: number
  email: string
  role: "investor" | "lab"
  status: "active" | "pending" | "rejected"
  verification_status?: "pending" | "verified" | "rejected"
  is_admin?: boolean
  full_name: string
  organization_name?: string | null
  inn?: string | null
  ogrn?: string | null
  representative_name?: string | null
  bio?: string | null
  website_url?: string | null
  external_links?: any[]
  portfolio_files?: any[]
  patents_info?: any[]
  documents?: any[]
  moderation_comment?: string | null
  created_at?: string | null
}

export type AuthModalMode = "login" | "register-investor" | "register-lab"

interface AuthContextType {
  user: User | null
  token: string | null
  refreshTokenValue: string | null
  isLoading: boolean
  isModalOpen: boolean
  modalMode: AuthModalMode
  openModal: (mode?: AuthModalMode) => void
  closeModal: () => void
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  registerInvestor: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  registerLab: (data: {
    organizationName: string
    inn: string
    ogrn: string
    representativeName: string
    email: string
    password: string
  }) => Promise<{ success: boolean; error?: string }>
  refreshToken: () => Promise<string | null>
  refreshUser: () => Promise<void>
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  updateProfile: (data: {
    fullName?: string
    representativeName?: string
    organizationName?: string
    inn?: string
    ogrn?: string
    bio?: string
    websiteUrl?: string
    externalLinks?: any[]
    portfolioFiles?: any[]
    patentsInfo?: any[]
    documents?: any[]
    requestReverification?: boolean
  }) => Promise<{ success: boolean; user?: User; error?: string }>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

const ACCESS_TOKEN_KEY = "tochka_access_token"
const REFRESH_TOKEN_KEY = "tochka_refresh_token"

// Helper to safely parse JWT expiration time
function getJwtExp(token: string): number | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const [refreshTokenValue, setRefreshTokenValue] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [modalMode, setModalMode] = React.useState<AuthModalMode>("login")
  const router = useRouter()

  // Mutex to prevent duplicate concurrent refresh calls
  const refreshPromiseRef = React.useRef<Promise<string | null> | null>(null)
  const refreshTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const clearStorage = React.useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem("tochka_auth_token") // legacy key cleanup
    setToken(null)
    setRefreshTokenValue(null)
    setUser(null)
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const saveTokens = React.useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem("tochka_auth_token", accessToken) // keep legacy key in sync
    setToken(accessToken)
    setRefreshTokenValue(refreshToken)
    scheduleAutoRefresh(accessToken)
  }, [])

  // Executes token refresh with rotation
  const refreshToken = React.useCallback(async (): Promise<string | null> => {
    // If a refresh is already in-flight, return the active promise
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const currentRefreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem(REFRESH_TOKEN_KEY) || refreshTokenValue
        : null

    if (!currentRefreshToken) {
      clearStorage()
      return null
    }

    const runRefresh = async (): Promise<string | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        })

        if (!res.ok) {
          clearStorage()
          return null
        }

        const data = await res.json()
        if (data.access_token && data.refresh_token) {
          saveTokens(data.access_token, data.refresh_token)
          return data.access_token
        }

        clearStorage()
        return null
      } catch (err) {
        console.error("Auto-refresh token failed:", err)
        return null
      } finally {
        refreshPromiseRef.current = null
      }
    }

    refreshPromiseRef.current = runRefresh()
    return refreshPromiseRef.current
  }, [clearStorage, refreshTokenValue, saveTokens])

  // Schedules automatic background refresh ~2 minutes before expiration
  const scheduleAutoRefresh = React.useCallback(
    (accToken: string) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }

      const exp = getJwtExp(accToken)
      if (!exp) return

      const now = Date.now()
      // Refresh 2 minutes before expiry, or immediately if already within 2 minutes
      const delay = Math.max(exp - now - 2 * 60 * 1000, 5000)

      refreshTimerRef.current = setTimeout(async () => {
        await refreshToken()
      }, delay)
    },
    [refreshToken]
  )

  // Fetch current user with auto-retry on 401 via refresh
  const fetchCurrentUser = React.useCallback(
    async (authToken: string) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        } else if (res.status === 401) {
          // Access token might be expired, try refreshing
          const newAccess = await refreshToken()
          if (newAccess) {
            const retryRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
              headers: { Authorization: `Bearer ${newAccess}` },
            })
            if (retryRes.ok) {
              const userData = await retryRes.json()
              setUser(userData)
            } else {
              clearStorage()
            }
          } else {
            clearStorage()
          }
        } else {
          clearStorage()
        }
      } catch {
        // Offline or connection error
      } finally {
        setIsLoading(false)
      }
    },
    [clearStorage, refreshToken]
  )

  const refreshUser = React.useCallback(async () => {
    const currentToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem("tochka_auth_token")
        : null)
    if (currentToken) {
      await fetchCurrentUser(currentToken)
    }
  }, [token, fetchCurrentUser])

  // Initialize on mount
  React.useEffect(() => {
    const savedAccess = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem("tochka_auth_token")
    const savedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)

    if (savedAccess) {
      setToken(savedAccess)
      if (savedRefresh) {
        setRefreshTokenValue(savedRefresh)
        scheduleAutoRefresh(savedAccess)
      }
      fetchCurrentUser(savedAccess)
    } else {
      setIsLoading(false)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [fetchCurrentUser, scheduleAutoRefresh])

  // Wrapper around fetch that adds Authorization and automatically refreshes token on 401
  const authFetch = React.useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      let activeToken = token || localStorage.getItem(ACCESS_TOKEN_KEY)

      const makeRequest = (t: string | null) => {
        const headers = new Headers(init.headers || {})
        if (t) {
          headers.set("Authorization", `Bearer ${t}`)
        }
        return fetch(input, { ...init, headers })
      }

      let res = await makeRequest(activeToken)

      if (res.status === 401) {
        const newToken = await refreshToken()
        if (newToken) {
          res = await makeRequest(newToken)
        }
      }

      return res
    },
    [refreshToken, token]
  )

  const openModal = (mode: AuthModalMode = "login") => {
    setModalMode(mode)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.detail || "Ошибка при входе" }
      }

      saveTokens(data.access_token, data.refresh_token)
      setUser(data.user)
      closeModal()
      if (data.user?.is_admin) {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
      return { success: true }
    } catch {
      return { success: false, error: "Ошибка подключения к серверу" }
    }
  }

  const registerInvestor = async (fullName: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register/investor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.detail || "Ошибка при регистрации" }
      }

      saveTokens(data.access_token, data.refresh_token)
      setUser(data.user)
      closeModal()
      if (data.user?.is_admin) {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
      return { success: true }
    } catch {
      return { success: false, error: "Ошибка подключения к серверу" }
    }
  }

  const registerLab = async (data: {
    organizationName: string
    inn: string
    ogrn: string
    representativeName: string
    email: string
    password: string
  }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register/lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_name: data.organizationName,
          inn: data.inn,
          ogrn: data.ogrn,
          representative_name: data.representativeName,
          email: data.email,
          password: data.password,
        }),
      })

      const responseData = await res.json()
      if (!res.ok) {
        return { success: false, error: responseData.detail || "Ошибка при регистрации НИИ" }
      }

      saveTokens(responseData.access_token, responseData.refresh_token)
      setUser(responseData.user)
      closeModal()
      router.push("/dashboard")
      return { success: true }
    } catch {
      return { success: false, error: "Ошибка подключения к серверу" }
    }
  }

  const updateProfile = async (data: {
    fullName?: string
    representativeName?: string
    organizationName?: string
    inn?: string
    ogrn?: string
    bio?: string
    websiteUrl?: string
    externalLinks?: any[]
    portfolioFiles?: any[]
    patentsInfo?: any[]
    documents?: any[]
    requestReverification?: boolean
  }) => {
    try {
      const payload: Record<string, any> = {}
      if (data.fullName !== undefined) payload.full_name = data.fullName
      if (data.representativeName !== undefined) payload.representative_name = data.representativeName
      if (data.organizationName !== undefined) payload.organization_name = data.organizationName
      if (data.inn !== undefined) payload.inn = data.inn
      if (data.ogrn !== undefined) payload.ogrn = data.ogrn
      if (data.bio !== undefined) payload.bio = data.bio
      if (data.websiteUrl !== undefined) payload.website_url = data.websiteUrl
      if (data.externalLinks !== undefined) payload.external_links = data.externalLinks
      if (data.portfolioFiles !== undefined) payload.portfolio_files = data.portfolioFiles
      if (data.patentsInfo !== undefined) payload.patents_info = data.patentsInfo
      if (data.documents !== undefined) payload.documents = data.documents
      if (data.requestReverification !== undefined) payload.request_reverification = data.requestReverification

      const res = await authFetch(`${API_BASE_URL}/api/v1/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        return { success: false, error: errData.detail || "Ошибка при обновлении профиля" }
      }

      const updatedUser: User = await res.json()
      setUser(updatedUser)
      return { success: true, user: updatedUser }
    } catch {
      return { success: false, error: "Ошибка подключения к серверу" }
    }
  }

  const logout = () => {
    clearStorage()
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshTokenValue,
        isLoading,
        isModalOpen,
        modalMode,
        openModal,
        closeModal,
        login,
        registerInvestor,
        registerLab,
        refreshToken,
        refreshUser,
        authFetch,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
