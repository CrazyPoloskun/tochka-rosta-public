"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import {
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
} from "react-icons/hi2"

import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { AdminNotificationsPopover } from "@/components/admin/admin-notifications-popover"

// Modular Dashboard Components
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { VerificationBanner } from "@/components/dashboard/verification-banner"
import { ProjectsTab } from "@/components/dashboard/projects-tab"
import { IdeasTab } from "@/components/dashboard/ideas-tab"
import { TasksTab } from "@/components/dashboard/tasks-tab"
import { FinancesTab } from "@/components/dashboard/finances-tab"
import { MessagesTab } from "@/components/dashboard/messages-tab"
import { SupportTab } from "@/components/dashboard/support-tab"
import { SettingsTab } from "@/components/dashboard/settings-tab"

// Shared Types
import {
  TabType,
  Project,
  IdeaItem,
  TaskItem,
  TransactionItem,
  ChatItem,
  TicketItem,
} from "@/components/dashboard/dashboard-types"

function DashboardContent() {
  const { user, token, authFetch, updateProfile, logout, refreshUser } = useAuth()
  const { success, error, info } = useToast()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = React.useState<TabType>("projects")
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // 1. Projects
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = React.useState(false)

  // 2. Ideas
  const [ideas, setIdeas] = React.useState<IdeaItem[]>([])
  const [loadingIdeas, setLoadingIdeas] = React.useState(false)

  // 3. Tasks
  const [tasks, setTasks] = React.useState<TaskItem[]>([])
  const [loadingTasks, setLoadingTasks] = React.useState(false)

  // 4. Finances
  const [availableBalance, setAvailableBalance] = React.useState(0)
  const [frozenBalance, setFrozenBalance] = React.useState(0)
  const [totalFunded, setTotalFunded] = React.useState(0)
  const [transactions, setTransactions] = React.useState<TransactionItem[]>([])
  const [loadingFinances, setLoadingFinances] = React.useState(false)

  // 5. Chats
  const [chats, setChats] = React.useState<ChatItem[]>([])
  const [loadingChats, setLoadingChats] = React.useState(false)

  // 6. Tickets
  const [tickets, setTickets] = React.useState<TicketItem[]>([])
  const [loadingTickets, setLoadingTickets] = React.useState(false)

  // Redirect admin directly to admin panel
  React.useEffect(() => {
    if (user?.is_admin) {
      router.replace("/admin")
    }
  }, [user, router])

  // Sync tab with URL
  React.useEffect(() => {
    if (pathname) {
      const parts = pathname.split("/").filter(Boolean)
      if (parts.length >= 2 && parts[0] === "dashboard") {
        const sub = parts[1]
        if (
          ["projects", "ideas", "tasks", "finances", "messages", "support", "settings"].includes(
            sub
          )
        ) {
          setActiveTab(sub as TabType)
          return
        }
      }
    }
    const qTab = searchParams?.get("tab")
    if (qTab) {
      if (qTab === "search") setActiveTab("ideas")
      else if (qTab === "balance") setActiveTab("finances")
      else if (
        ["projects", "ideas", "tasks", "finances", "messages", "support", "settings"].includes(
          qTab
        )
      ) {
        setActiveTab(qTab as TabType)
      }
    }
  }, [pathname, searchParams])

  // Switch tab function
  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    router.push(`/dashboard?tab=${tab}`, { scroll: false })
  }

  // Fetch Projects
  const fetchProjects = React.useCallback(async () => {
    if (projects.length === 0) setLoadingProjects(true)
    try {
      const res = await authFetch("/api/v1/projects")
      if (res.ok) {
        setProjects(await res.json())
      }
    } catch (e) {
      console.error("fetchProjects error:", e)
    } finally {
      setLoadingProjects(false)
    }
  }, [authFetch, projects.length])

  // Fetch Ideas
  const fetchIdeas = React.useCallback(async () => {
    if (ideas.length === 0) setLoadingIdeas(true)
    try {
      const res = await authFetch("/api/v1/ideas")
      if (res.ok) {
        setIdeas(await res.json())
      }
    } catch (e) {
      console.error("fetchIdeas error:", e)
    } finally {
      setLoadingIdeas(false)
    }
  }, [authFetch, ideas.length])

  // Fetch Tasks
  const fetchTasks = React.useCallback(async () => {
    if (tasks.length === 0) setLoadingTasks(true)
    try {
      const res = await authFetch("/api/v1/tasks")
      if (res.ok) {
        setTasks(await res.json())
      }
    } catch (e) {
      console.error("fetchTasks error:", e)
    } finally {
      setLoadingTasks(false)
    }
  }, [authFetch, tasks.length])

  // Fetch Finances
  const fetchFinances = React.useCallback(async () => {
    if (transactions.length === 0) setLoadingFinances(true)
    try {
      const res = await authFetch("/api/v1/finances/ledger")
      if (res.ok) {
        const data = await res.json()
        setAvailableBalance(Number(data.available_balance || 0))
        setFrozenBalance(Number(data.frozen_balance || 0))
        setTotalFunded(Number(data.total_funded || 0))
        setTransactions(data.transactions || [])
      }
    } catch (e) {
      console.error("fetchFinances error:", e)
    } finally {
      setLoadingFinances(false)
    }
  }, [authFetch, transactions.length])

  // Fetch Chats
  const fetchChats = React.useCallback(async () => {
    if (chats.length === 0) setLoadingChats(true)
    try {
      const res = await authFetch("/api/v1/chats")
      if (res.ok) {
        setChats(await res.json())
      }
    } catch (e) {
      console.error("fetchChats error:", e)
    } finally {
      setLoadingChats(false)
    }
  }, [authFetch, chats.length])

  // Fetch Tickets
  const fetchTickets = React.useCallback(async () => {
    if (tickets.length === 0) setLoadingTickets(true)
    try {
      const res = await authFetch("/api/v1/support/tickets")
      if (res.ok) {
        setTickets(await res.json())
      }
    } catch (e) {
      console.error("fetchTickets error:", e)
    } finally {
      setLoadingTickets(false)
    }
  }, [authFetch, tickets.length])

  // Active Tab Data Loader
  React.useEffect(() => {
    if (activeTab === "projects") fetchProjects()
    if (activeTab === "ideas") fetchIdeas()
    if (activeTab === "tasks") fetchTasks()
    if (activeTab === "finances") fetchFinances()
    if (activeTab === "messages") fetchChats()
    if (activeTab === "support") fetchTickets()
  }, [activeTab, fetchProjects, fetchIdeas, fetchTasks, fetchFinances, fetchChats, fetchTickets])

  // Initial Data Load
  React.useEffect(() => {
    fetchProjects()
    fetchFinances()
    fetchChats()
    fetchTickets()
  }, [fetchProjects, fetchFinances, fetchChats, fetchTickets])

  const totalUnreadMessages = chats.reduce((acc, c) => acc + (c.unread_count || 0), 0)
  const totalUnreadSupport = tickets.filter(
    (t) => t.initiated_by_admin && t.status !== "resolved"
  ).length

  return (
    <div className="flex h-screen w-full bg-[#F5F6F8] font-sans antialiased text-[#111111] overflow-hidden selection:bg-[#F81B00] selection:text-white">
      {/* Desktop Left Sidebar (Strictly 240px) */}
      <div className="hidden lg:block">
        <DashboardSidebar
          user={user}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          unreadMessagesCount={totalUnreadMessages}
          unreadSupportCount={totalUnreadSupport}
          projectsCount={projects.length}
          tasksCount={tasks.length}
          onLogout={logout}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-xs">
          <div className="w-[260px] bg-white h-full shadow-2xl relative">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#6B7280] hover:text-[#111111] cursor-pointer"
            >
              <HiOutlineXMark className="size-5" />
            </button>
            <DashboardSidebar
              user={user}
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              unreadMessagesCount={totalUnreadMessages}
              unreadSupportCount={totalUnreadSupport}
              projectsCount={projects.length}
              tasksCount={tasks.length}
              onLogout={logout}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 shrink-0 bg-white border-b border-[#E2E5EB] px-4 sm:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-[#6B7280] hover:text-[#111111] rounded-lg cursor-pointer"
            >
              <HiOutlineBars3 className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Кабинет
              </span>
              <span className="text-xs text-[#CBD5E1]">/</span>
              <span className="text-xs font-bold text-[#111111]">
                {activeTab === "projects" && "Мои проекты и сделки"}
                {activeTab === "ideas" && "Каталог разработок и идей"}
                {activeTab === "tasks" && "Биржа R&D-задач"}
                {activeTab === "finances" && "Баланс и Финансы"}
                {activeTab === "messages" && "Сообщения сделок"}
                {activeTab === "support" && "Служба заботы"}
                {activeTab === "settings" && "Настройки и Реквизиты"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Popover */}
            <AdminNotificationsPopover />
          </div>
        </header>

        {/* Scrollable Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top Verification Banner for Lab */}
          <VerificationBanner
            user={user}
            onFixDocuments={() => handleSelectTab("settings")}
            onRefresh={refreshUser}
          />

          {/* Active Tab Views */}
          {activeTab === "projects" && (
            <ProjectsTab
              user={user}
              projects={projects}
              loading={loadingProjects}
              onRefresh={fetchProjects}
              authFetch={authFetch}
            />
          )}

          {activeTab === "ideas" && (
            <IdeasTab
              user={user}
              ideas={ideas}
              projects={projects}
              loading={loadingIdeas}
              onRefresh={fetchIdeas}
              authFetch={authFetch}
              onNavigateToProjects={() => handleSelectTab("projects")}
              onNavigateToMessages={() => handleSelectTab("messages")}
            />
          )}

          {activeTab === "tasks" && (
            <TasksTab
              user={user}
              tasks={tasks}
              loading={loadingTasks}
              onRefresh={fetchTasks}
              authFetch={authFetch}
              onNavigateToProjects={() => handleSelectTab("projects")}
              onNavigateToMessages={() => handleSelectTab("messages")}
            />
          )}

          {activeTab === "finances" && (
            <FinancesTab
              user={user}
              availableBalance={availableBalance}
              frozenBalance={frozenBalance}
              totalFunded={totalFunded}
              transactions={transactions}
              loading={loadingFinances}
              onRefresh={fetchFinances}
              authFetch={authFetch}
            />
          )}

          {activeTab === "messages" && (
            <MessagesTab
              user={user}
              token={token}
              chats={chats}
              loadingChats={loadingChats}
              onRefreshChats={fetchChats}
              authFetch={authFetch}
            />
          )}

          {activeTab === "support" && (
            <SupportTab
              user={user}
              token={token}
              tickets={tickets}
              loading={loadingTickets}
              onRefresh={fetchTickets}
              authFetch={authFetch}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              user={user}
              onUpdateProfile={updateProfile}
              authFetch={authFetch}
              onRefresh={() => {
                fetchProjects()
                fetchFinances()
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#F5F6F8] text-xs text-[#6B7280]">
          Загрузка личного кабинета...
        </div>
      }
    >
      <DashboardContent />
    </React.Suspense>
  )
}
