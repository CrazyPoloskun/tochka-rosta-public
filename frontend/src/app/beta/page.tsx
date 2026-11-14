"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  HiOutlineLockClosed,
  HiOutlineArrowRight,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineCheckCircle,
} from "react-icons/hi2"

function BetaGateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || "/"

  const [code, setCode] = React.useState("")
  const [showCode, setShowCode] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/beta-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
        if (data.token) {
          document.cookie = `tochka_beta_access=${data.token}; path=/; max-age=2592000; SameSite=Lax; Secure`
        }
        setTimeout(() => {
          const target = redirectTarget && redirectTarget !== "/beta" ? redirectTarget : "/"
          window.location.replace(target)
        }, 300)
      } else {
        setError(data.error || "Неверный код доступа")
      }
    } catch {
      setError("Ошибка соединения с сервером")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans selection:bg-[#F9C72F] selection:text-black">
      {/* Seamless Content without card background or borders */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto text-center">
        {/* VEXA Logo: No frame, no container, pure transparent logo */}
        <div className="mb-6 flex justify-center">
          <img
            src="/images/vexa-logo.png"
            alt="VEXA"
            className="h-12 sm:h-14 w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget
              if (target.src.indexOf("logo.png") === -1) {
                target.src = "/logo.png"
              }
            }}
          />
        </div>

        {/* SECURITY POINT Heading */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-mono font-black tracking-[0.2em] text-[#F9C72F] uppercase mb-3">
          SECURITY POINT
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-[#888888] max-w-xs sm:max-w-sm mx-auto leading-relaxed mb-8">
          Сайт в бета тестировании, чтобы продолжить введите код тестировщика
        </p>

        {/* Error notification */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Success notification */}
        {success && (
          <div className="mb-5 p-3 rounded-xl bg-[#F9C72F]/10 border border-[#F9C72F]/40 text-xs text-[#F9C72F] font-medium flex items-center justify-center gap-2">
            <HiOutlineCheckCircle className="size-4 shrink-0 text-[#F9C72F]" />
            <span>Код принят. Переход на сайт...</span>
          </div>
        )}

        {/* Form: completely flat, minimal, black aesthetic */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <input
              type={showCode ? "text" : "password"}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              placeholder="Код тестировщика"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-12 pl-11 pr-11 bg-[#0F0F0F] border border-[#222222] focus:border-[#F9C72F] rounded-xl text-center font-mono text-sm tracking-widest text-white placeholder:text-[#555555] placeholder:font-sans placeholder:tracking-normal outline-none transition-colors"
            />
            <HiOutlineLockClosed className="size-4 text-[#555555] absolute left-4 top-4 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3.5 top-3.5 text-[#555555] hover:text-white transition-colors cursor-pointer p-0.5"
              tabIndex={-1}
              aria-label={showCode ? "Скрыть код" : "Показать код"}
            >
              {showCode ? <HiOutlineEyeSlash className="size-4" /> : <HiOutlineEye className="size-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim() || success}
            className="w-full h-12 rounded-xl bg-[#F9C72F] hover:bg-[#E5B525] active:bg-[#D4A51D] text-black font-extrabold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Проверка..." : "Войти"}</span>
            {!loading && <HiOutlineArrowRight className="size-4" />}
          </button>
        </form>

        {/* Minimal Footer */}
        <div className="mt-8 text-[11px] font-mono text-[#444444] tracking-wider uppercase">
          VEXA Security Check
        </div>
      </div>
    </div>
  )
}

export default function BetaPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="size-8 border-2 border-[#F9C72F] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BetaGateForm />
    </React.Suspense>
  )
}
