"use client"

import * as React from "react"
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineInformationCircle,
  HiOutlineXMark,
} from "react-icons/hi2"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "info"

export function formatToastMessage(message: any): string {
  if (typeof message === "string") return message
  if (message instanceof Error) return message.message
  if (Array.isArray(message)) {
    return message
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object") {
          return item.msg || item.message || JSON.stringify(item)
        }
        return String(item)
      })
      .join(", ")
  }
  if (message && typeof message === "object") {
    if (message.msg) return String(message.msg)
    if (message.message) return String(message.message)
    if (message.detail) return formatToastMessage(message.detail)
    try {
      return JSON.stringify(message)
    } catch {
      return String(message)
    }
  }
  return String(message ?? "")
}

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: ToastItem[]
  toast: (message: any, type?: ToastType, title?: string) => void
  success: (message: any, title?: string) => void
  error: (message: any, title?: string) => void
  info: (message: any, title?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

// Global reference for calling toast outside components
let globalToast: ((message: any, type?: ToastType, title?: string) => void) | null = null

export const toast = {
  success: (message: any, title?: string) => globalToast?.(message, "success", title),
  error: (message: any, title?: string) => globalToast?.(message, "error", title),
  info: (message: any, title?: string) => globalToast?.(message, "info", title),
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = React.useCallback((rawMessage: any, type: ToastType = "info", title?: string) => {
    const id = Math.random().toString(36).slice(2, 9)
    const message = formatToastMessage(rawMessage)
    const newToast: ToastItem = { id, message, type, title }
    setToasts((prev) => [...prev.slice(-4), newToast])

    setTimeout(() => {
      dismiss(id)
    }, 4500)
  }, [dismiss])

  React.useEffect(() => {
    globalToast = addToast
    return () => {
      globalToast = null
    }
  }, [addToast])

  return (
    <ToastContext.Provider
      value={{
        toasts,
        toast: addToast,
        success: (msg, title) => addToast(msg, "success", title),
        error: (msg, title) => addToast(msg, "error", title),
        info: (msg, title) => addToast(msg, "info", title),
        dismiss,
      }}
    >
      {children}

      {/* Контейнер всплывающих уведомлений */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 bg-white border shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5",
              t.type === "success" && "border-l-4 border-l-emerald-600 border-[#E5E5E5]",
              t.type === "error" && "border-l-4 border-l-[#F81B00] border-[#E5E5E5]",
              t.type === "info" && "border-l-4 border-l-[#111111] border-[#E5E5E5]"
            )}
          >
            {t.type === "success" && <HiOutlineCheckCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === "error" && <HiOutlineXCircle className="size-5 text-[#F81B00] shrink-0 mt-0.5" />}
            {t.type === "info" && <HiOutlineInformationCircle className="size-5 text-[#111111] shrink-0 mt-0.5" />}

            <div className="flex-1 space-y-0.5">
              {t.title && <div className="text-xs font-black uppercase text-[#111111]">{t.title}</div>}
              <div className="text-xs text-[#333333] leading-relaxed font-medium">{t.message}</div>
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="p-1 text-[#888888] hover:text-[#111111] transition-colors"
            >
              <HiOutlineXMark className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
