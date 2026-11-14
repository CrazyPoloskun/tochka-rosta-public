"use client"

import { useRouter as useNextRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

/**
 * Next.js App Router Navigation Helper
 * 
 * Предоставляет нативную работу через useRouter (next/navigation) без необходимости
 * во внешних Router-провайдерах (React Router / BrowserRouter).
 * 
 * Поддерживает как стандартный Next.js useRouter, так и совместимые хуки
 * useNavigate() и useLocation() для гибкости.
 */

export function useRouter() {
  return useNextRouter()
}

export function useNavigate() {
  const router = useNextRouter()

  return useCallback(
    (to: string | number, options?: { replace?: boolean; scroll?: boolean }) => {
      if (typeof to === "number") {
        if (to === -1) {
          router.back()
        } else if (to === 1) {
          router.forward()
        }
        return
      }

      if (options?.replace) {
        router.replace(to, { scroll: options.scroll ?? true })
      } else {
        router.push(to, { scroll: options?.scroll ?? true })
      }
    },
    [router]
  )
}

export function useLocation() {
  const pathname = usePathname() || "/"
  const searchParams = useSearchParams()

  return useMemo(() => {
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : ""
    return {
      pathname,
      search,
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: null,
      key: "default",
    }
  }, [pathname, searchParams])
}
