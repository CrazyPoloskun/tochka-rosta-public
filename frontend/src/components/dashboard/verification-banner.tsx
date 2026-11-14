"use client"

import * as React from "react"
import { HiOutlineExclamationTriangle, HiOutlineXMark, HiOutlineArrowPath, HiOutlineSparkles } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { User, useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"

interface VerificationBannerProps {
  user: User | null
  onFixDocuments: () => void
  onRefresh?: () => void
}

export function VerificationBanner({ user, onFixDocuments, onRefresh }: VerificationBannerProps) {
  const { authFetch, refreshUser } = useAuth()
  const { success, error } = useToast()
  const [loadingDemo, setLoadingDemo] = React.useState(false)

  if (user?.role !== "lab") return null

  const status = user.verification_status || "pending"
  if (status === "verified") return null

  const handleDemoVerify = async () => {
    setLoadingDemo(true)
    try {
      const res = await authFetch("/api/v1/auth/demo/toggle-verification", {
        method: "POST",
      })
      if (res.ok) {
        success("Статус организации успешно изменён на «Верифицирован» (Demo)", "Верификация пройдена")
        if (refreshUser) await refreshUser()
        if (onRefresh) onRefresh()
      } else {
        error("Не удалось выполнить демо-верификацию", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при выполнении демо-верификации", "Ошибка")
    } finally {
      setLoadingDemo(false)
    }
  }

  if (status === "pending") {
    return (
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5">
            <HiOutlineExclamationTriangle className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
              Организация проходит верификацию модератором
            </h4>
            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
              Ваша организация проходит проверку уставных документов и патентной базы модератором. Публикация разработок и отклики на задачи откроются сразу после подтверждения.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleDemoVerify}
            disabled={loadingDemo}
            className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer gap-1.5"
            title="Мгновенно подтвердить организацию для демонстрации"
          >
            <HiOutlineSparkles className="size-3.5 text-amber-400" />
            <span>{loadingDemo ? "Секунду..." : "demo: верифицировать организацию"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onFixDocuments}
            className="text-xs border-amber-300 text-amber-900 hover:bg-amber-100 rounded-xl font-medium cursor-pointer"
          >
            Уставные документы
          </Button>
        </div>
      </div>
    )
  }

  if (status === "rejected") {
    return (
      <div className="bg-red-50/95 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-950 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-700 mt-0.5">
            <HiOutlineXMark className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">
              Верификация отклонена модератором
            </h4>
            <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
              <span className="font-semibold">Причина отказа: </span>
              {user.moderation_comment || "Необходимо приложить читаемые сканы Устава и выписки ЕГРЮЛ, а также подтверждённые патенты."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleDemoVerify}
            disabled={loadingDemo}
            className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer gap-1.5"
            title="Мгновенно подтвердить организацию для демонстрации"
          >
            <HiOutlineSparkles className="size-3.5 text-amber-400" />
            <span>{loadingDemo ? "Секунду..." : "demo: верифицировать организацию"}</span>
          </Button>
          <Button
            size="sm"
            onClick={onFixDocuments}
            className="text-xs bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs font-medium cursor-pointer"
          >
            <HiOutlineArrowPath className="size-3.5 mr-1.5" />
            Исправить документы
          </Button>
        </div>
      </div>
    )
  }

  return null
}
