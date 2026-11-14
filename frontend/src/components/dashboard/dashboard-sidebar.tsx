"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineFolderOpen,
  HiOutlineLightBulb,
  HiOutlineBriefcase,
  HiOutlineCreditCard,
  HiOutlineChatBubbleLeftRight,
  HiOutlineLifebuoy,
  HiOutlineCog6Tooth,
  HiOutlineShieldCheck,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineUser,
} from "react-icons/hi2"

import { Badge } from "@/components/ui/badge"
import { User } from "@/lib/auth-context"
import { TabType } from "./dashboard-types"

interface DashboardSidebarProps {
  user: User | null
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  unreadMessagesCount: number
  unreadSupportCount: number
  projectsCount: number
  tasksCount: number
  onLogout: () => void
}

export function DashboardSidebar({
  user,
  activeTab,
  onSelectTab,
  unreadMessagesCount,
  unreadSupportCount,
  projectsCount,
  tasksCount,
  onLogout,
}: DashboardSidebarProps) {
  const isLab = user?.role === "lab"
  const verificationStatus = user?.verification_status || "pending"

  const navItems = [
    {
      id: "projects" as TabType,
      label: "Мои проекты",
      icon: HiOutlineFolderOpen,
      badge: projectsCount > 0 ? projectsCount : undefined,
    },
    {
      id: "ideas" as TabType,
      label: "Каталог разработок",
      icon: HiOutlineLightBulb,
    },
    {
      id: "tasks" as TabType,
      label: "Биржа R&D-задач",
      icon: HiOutlineBriefcase,
      badge: tasksCount > 0 ? tasksCount : undefined,
    },
    {
      id: "finances" as TabType,
      label: "Баланс и Финансы",
      icon: HiOutlineCreditCard,
    },
    {
      id: "messages" as TabType,
      label: "Сообщения",
      icon: HiOutlineChatBubbleLeftRight,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    {
      id: "support" as TabType,
      label: "Поддержка",
      icon: HiOutlineLifebuoy,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
    },
    {
      id: "settings" as TabType,
      label: "Настройки и Реквизиты",
      icon: HiOutlineCog6Tooth,
    },
  ]

  return (
    <aside className="w-[240px] shrink-0 h-screen bg-white border-r border-[#E2E5EB] flex flex-col justify-between select-none z-20">
      {/* Top Header */}
      <div>
        <div className="p-4 border-b border-[#E2E5EB] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="Точка Роста"
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>
        </div>

        {/* User Role Card */}
        <div className="p-3 mx-3 my-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              {isLab ? "НИИ / Лаборатория" : "Инвестор / Спонсор"}
            </span>
          </div>
          {isLab && (
            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  verificationStatus === "verified"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200/50"
                    : verificationStatus === "rejected"
                    ? "bg-red-100 text-red-800 border border-red-200/50"
                    : "bg-amber-100 text-amber-800 border border-amber-200/50"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    verificationStatus === "verified"
                      ? "bg-emerald-500"
                      : verificationStatus === "rejected"
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                />
                {verificationStatus === "verified"
                  ? "Верифицирован"
                  : verificationStatus === "rejected"
                  ? "Отклонён"
                  : "На проверке"}
              </span>
            </div>
          )}
          <p className="text-xs font-semibold text-[#111111] truncate">
            {user?.organization_name || user?.full_name || "Личный кабинет"}
          </p>
        </div>

        {/* Nav Items */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[#111111] text-white shadow-xs"
                    : "text-[#4B5563] hover:bg-[#F5F6F8] hover:text-[#111111]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${
                      isActive ? "text-[#F81B00]" : "text-[#6B7280] group-hover:text-[#111111]"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <Badge
                    variant={isActive ? "destructive" : "secondary"}
                    className="rounded-full text-[10px] font-bold px-1.5 py-0 h-4 min-w-4 flex items-center justify-center shrink-0"
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-[#E2E5EB] space-y-2">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-[#F5F6F8] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-full bg-[#111111] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
              {user?.full_name?.charAt(0) || <HiOutlineUser className="size-3.5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111111] truncate">{user?.full_name || "Пользователь"}</p>
              <p className="text-[10px] text-[#6B7280] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Выйти"
            className="p-1.5 text-[#6B7280] hover:text-[#F81B00] rounded-lg transition-colors cursor-pointer"
          >
            <HiOutlineArrowLeftOnRectangle className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
