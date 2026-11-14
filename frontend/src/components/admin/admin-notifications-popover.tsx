"use client"

import * as React from "react"
import {
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
} from "react-icons/hi2"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

interface NotificationItem {
  id: number
  type: string
  title: string
  body: string
  link_url?: string | null
  severity: "info" | "warning" | "critical"
  is_read: boolean
  created_at: string
}

export function AdminNotificationsPopover() {
  const { authFetch } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [filter, setFilter] = React.useState<"all" | "critical" | "moderation">("all")
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const loadNotifications = React.useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        authFetch("/api/v1/notifications"),
        authFetch("/api/v1/notifications/unread-count"),
      ])
      if (listRes.ok) setNotifications(await listRes.json())
      if (countRes.ok) {
        const c = await countRes.json()
        setUnreadCount(c.count || 0)
      }
    } catch (e) {
      console.error("Notifications fetch error:", e)
    }
  }, [authFetch])

  React.useEffect(() => {
    loadNotifications()
    const timer = setInterval(loadNotifications, 10000)
    return () => clearInterval(timer)
  }, [loadNotifications])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markAllRead = async () => {
    try {
      await authFetch("/api/v1/notifications/read-all", { method: "POST" })
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (e) {
      console.error("Read all error:", e)
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "critical") return n.severity === "critical"
    if (filter === "moderation") return n.type.includes("moderation") || n.type.includes("verify")
    return true
  })

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative size-9 rounded-xl border border-[#E2E5EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8] transition-all shadow-xs cursor-pointer"
        aria-label="Уведомления"
      >
        <HiOutlineBell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-4 bg-[#F81B00] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E2E5EB] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 border-b border-[#E2E5EB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111111]">Оповещения</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full text-[9px] px-1.5 py-0">
                  {unreadCount} новых
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-[#F81B00] hover:underline cursor-pointer"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* Фильтры */}
          <div className="p-2 border-b border-[#E2E5EB] flex gap-1 bg-[#F5F6F8]/60">
            {[
              { id: "all", label: "Все" },
              { id: "critical", label: "Критические" },
              { id: "moderation", label: "Модерация" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  filter === f.id
                    ? "bg-[#111111] text-white"
                    : "text-[#6B7280] hover:text-[#111111]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Список */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F5F6F8]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9CA3AF]">
                Новых оповещений нет
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 space-y-1 transition-colors ${
                    n.is_read ? "bg-white" : "bg-red-50/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      {n.severity === "critical" ? (
                        <HiOutlineExclamationTriangle className="size-3.5 text-[#F81B00]" />
                      ) : (
                        <HiOutlineInformationCircle className="size-3.5 text-blue-500" />
                      )}
                      <span>{n.title}</span>
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] font-mono">
                      {new Date(n.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-snug">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
