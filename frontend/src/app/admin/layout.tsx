"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineDocumentCheck,
  HiOutlineBanknotes,
  HiOutlineScale,
  HiOutlineLifebuoy,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineUserCircle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineShieldCheck,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlineBars3,
  HiOutlineXMark,
} from "react-icons/hi2"

import { useAuth } from "@/lib/auth-context"
import { GlobalSearchModal } from "@/components/admin/global-search-modal"
import { AdminNotificationsPopover } from "@/components/admin/admin-notifications-popover"
import { DossierDrawer } from "@/components/admin/dossier-drawer"

// Global Context for Dossier Drawer
interface DossierContextType {
  openDossier: (userId: number) => void
}
export const DossierContext = React.createContext<DossierContextType>({
  openDossier: () => {},
})

export const useDossier = () => React.useContext(DossierContext)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Search Modal state (Cmd/Ctrl + K)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Dossier Drawer state
  const [dossierUserId, setDossierUserId] = React.useState<number | null>(null)
  const [dossierOpen, setDossierOpen] = React.useState(false)

  const openDossier = React.useCallback((id: number) => {
    setDossierUserId(id)
    setDossierOpen(true)
  }, [])

  // Keyboard shortcut Cmd/Ctrl + K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  React.useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) {
      router.replace("/")
    }
  }, [user, isLoading, router])

  if (isLoading || !user || !user.is_admin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F5F6F8] gap-3">
        <div className="size-8 border-3 border-[#F81B00] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-[#6B7280]">
          Проверка прав доступа администратора...
        </span>
      </div>
    )
  }

  const navItems = [
    { href: "/admin", label: "Сводка и аналитика", icon: HiOutlineChartBar, exact: true },
    { href: "/admin/users", label: "Пользователи и НИИ", icon: HiOutlineUsers },
    { href: "/admin/content", label: "Модерация контента", icon: HiOutlineDocumentCheck },
    { href: "/admin/finances", label: "Финансы и Резервный счёт", icon: HiOutlineBanknotes },
    { href: "/admin/projects", label: "Проекты и Арбитраж", icon: HiOutlineScale },
    { href: "/admin/tickets", label: "Поддержка и Тикеты", icon: HiOutlineLifebuoy },
  ]

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Логотип */}
      <div className="p-4 sm:p-5 border-b border-[#E2E5EB] flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="Точка Роста"
            className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      {/* Быстрый поиск в сайдбаре */}
      <div className="px-3.5 pt-3">
        <button
          onClick={() => {
            setSearchOpen(true)
            setMobileMenuOpen(false)
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#9CA3AF] bg-[#F5F6F8] hover:bg-zinc-100 border border-[#E2E5EB] rounded-xl transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HiOutlineMagnifyingGlass className="size-3.5 text-[#6B7280]" />
            <span>Быстрый поиск...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-white border border-[#E2E5EB] px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Навигационное меню */}
      <div className="flex-1 overflow-y-auto py-3 px-3.5 space-y-1">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
          Управление платформой
        </div>

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#4B5563] hover:bg-[#F5F6F8] hover:text-[#111111]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`size-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-white/10 text-[#F81B00]"
                      : "bg-[#F5F6F8] text-[#6B7280] group-hover:text-[#111111] group-hover:bg-white"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <span>{item.label}</span>
              </div>
              {isActive && (
                <HiOutlineChevronRight className="size-3 text-white/50" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Футер сайдбара с профилем */}
      <div className="p-3.5 border-t border-[#E2E5EB] bg-white space-y-2">
        <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-xs space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider flex items-center gap-1">
            <HiOutlineShieldCheck className="size-3 text-[#F81B00]" />
            <span>Администратор</span>
          </div>
          <div className="font-bold text-[#111111] truncate">{user.full_name || user.email}</div>
          <div className="text-[10px] text-[#6B7280] truncate">{user.email}</div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-[#F81B00] hover:bg-red-50 rounded-xl transition-all duration-150 cursor-pointer"
        >
          <HiOutlineArrowLeftOnRectangle className="size-3.5" />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  )

  return (
    <DossierContext.Provider value={{ openDossier }}>
      <div className="flex h-screen w-full bg-[#F5F6F8] font-sans antialiased text-[#111111] overflow-hidden selection:bg-[#F81B00] selection:text-white">
        {/* Десктопный сайдбар панели управления */}
        <aside className="hidden lg:flex flex-col w-64 lg:w-72 border-r border-[#E2E5EB] bg-white select-none z-20 shrink-0">
          {renderSidebarContent()}
        </aside>

        {/* Мобильная выдвижная шторка */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-xs">
            <div className="w-[270px] bg-white h-full shadow-2xl relative">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-[#6B7280] hover:text-[#111111] cursor-pointer z-10"
              >
                <HiOutlineXMark className="size-5" />
              </button>
              {renderSidebarContent()}
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Основной контент со скроллом */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          {/* Верхняя полоса админ-панели */}
          <header className="h-14 bg-white border-b border-[#E2E5EB] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 text-[#6B7280] hover:text-[#111111] rounded-lg cursor-pointer"
                aria-label="Открыть меню"
              >
                <HiOutlineBars3 className="size-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <AdminNotificationsPopover />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#F5F6F8] p-4 sm:p-6 lg:p-8" style={{ scrollbarGutter: "stable" }}>
            {children}
          </main>
        </div>

        {/* Глобальный поиск (Cmd + K) */}
        <GlobalSearchModal
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelectUser={(uid) => openDossier(uid)}
        />

        {/* Сквозное Досье 360° */}
        <DossierDrawer
          userId={dossierUserId}
          open={dossierOpen}
          onClose={() => setDossierOpen(false)}
        />
      </div>
    </DossierContext.Provider>
  )
}
