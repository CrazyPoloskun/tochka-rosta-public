"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  HiOutlineLifebuoy,
  HiOutlineUser,
  HiOutlinePaperAirplane,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowPath,
  HiOutlineDocumentText,
  HiOutlinePlusCircle,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineCheck,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { useDossier } from "@/app/admin/layout"

interface SupportTicket {
  id: number
  user_id: number
  category: string
  priority: string
  subject: string
  description: string
  status: "open" | "in_progress" | "resolved"
  admin_reply?: string
  ai_summary?: string
  ai_sentiment?: string
  ai_suggested_action?: string
  created_at: string
  user_name?: string
  user_email?: string
}

interface UserOption {
  id: number
  full_name: string
  email: string
  role: string
  organization_name?: string | null
}

interface TicketMessageItem {
  id: number
  ticket_id: number
  sender_id: number
  is_admin_reply: boolean
  content: string
  created_at: string
  sender_name?: string
}

function AdminTicketsContent() {
  const { authFetch, user, token } = useAuth()
  const { openDossier } = useDossier()
  const { success, error } = useToast()
  const searchParams = useSearchParams()

  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>("open")
  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = React.useState("")
  const [sendingReply, setSendingReply] = React.useState(false)
  const [togglingStatus, setTogglingStatus] = React.useState(false)

  // Живая переписка по выбранному тикету
  const [messages, setMessages] = React.useState<TicketMessageItem[]>([])
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const wsRef = React.useRef<WebSocket | null>(null)

  // Анализ сути обращения
  const [analyzingAi, setAnalyzingAi] = React.useState(false)

  // Исходящий тикет
  const [outboundOpen, setOutboundOpen] = React.useState(false)
  const [outboundCategory, setOutboundCategory] = React.useState("Общие вопросы")
  const [outboundSubject, setOutboundSubject] = React.useState("")
  const [outboundMessage, setOutboundMessage] = React.useState("")
  const [submittingOutbound, setSubmittingOutbound] = React.useState(false)

  // Выбор пользователя для тикета (поиск вместо ввода ID)
  const [usersList, setUsersList] = React.useState<UserOption[]>([])
  const [selectedUser, setSelectedUser] = React.useState<UserOption | null>(null)
  const [userSearchQuery, setUserSearchQuery] = React.useState("")
  const [loadingUsers, setLoadingUsers] = React.useState(false)

  const loadTickets = React.useCallback(async (isSilent = false) => {
    if (!isSilent && initialLoading) setInitialLoading(true)
    else setRefreshing(true)

    try {
      const query = statusFilter ? `?status=${statusFilter}` : ""
      const res = await authFetch(`/api/v1/admin/tickets${query}`)
      if (res.ok) {
        const data: SupportTicket[] = await res.json()
        setTickets(data)
        if (data.length > 0) {
          setSelectedTicket((prev) => (prev ? data.find((t) => t.id === prev.id) || data[0] : data[0]))
        } else {
          setSelectedTicket(null)
        }
      }
    } catch (e) {
      console.error("loadTickets error:", e)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [authFetch, statusFilter, initialLoading])

  React.useEffect(() => {
    loadTickets(tickets.length > 0)
  }, [statusFilter])

  // Загрузка списка пользователей для поиска
  const loadUsers = React.useCallback(async () => {
    if (usersList.length > 0) return
    setLoadingUsers(true)
    try {
      const res = await authFetch("/api/v1/admin/users?tab=all")
      if (res.ok) {
        const data: UserOption[] = await res.json()
        setUsersList(data)
      }
    } catch (e) {
      console.error("loadUsers error:", e)
    } finally {
      setLoadingUsers(false)
    }
  }, [authFetch, usersList.length])

  // Обработка query param ?user_id=
  React.useEffect(() => {
    const paramUserId = searchParams.get("user_id")
    if (paramUserId) {
      setOutboundOpen(true)
      loadUsers()
    }
  }, [searchParams, loadUsers])

  // Автоматический выбор пользователя из paramUserId после загрузки
  React.useEffect(() => {
    const paramUserId = searchParams.get("user_id")
    if (paramUserId && usersList.length > 0 && !selectedUser) {
      const found = usersList.find((u) => u.id === Number(paramUserId))
      if (found) setSelectedUser(found)
    }
  }, [searchParams, usersList, selectedUser])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Загрузка сообщений тикета
  const fetchTicketMessages = React.useCallback(
    async (ticketId: number) => {
      try {
        const res = await authFetch(`/api/v1/support/tickets/${ticketId}/messages`)
        if (res.ok) {
          const data: TicketMessageItem[] = await res.json()
          setMessages((prev) => {
            const optimistic = prev.filter((m) => m.id < 0)
            const merged = [...data]
            for (const opt of optimistic) {
              if (!merged.some((m) => m.content === opt.content)) {
                merged.push(opt)
              }
            }
            return merged
          })
          setTimeout(scrollToBottom, 50)
        }
      } catch (err) {
        console.error("fetchTicketMessages error:", err)
      }
    },
    [authFetch]
  )

  // WebSocket подключение для выбранного тикета
  React.useEffect(() => {
    if (!selectedTicket?.id) {
      setMessages([])
      return
    }

    const ticketId = selectedTicket.id
    fetchTicketMessages(ticketId)

    const currentToken =
      token || (typeof window !== "undefined" ? localStorage.getItem("tochka_access_token") : "")
    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let isDisposed = false

    const connectWs = () => {
      if (isDisposed || !currentToken || typeof window === "undefined") return

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/tickets/${ticketId}?token=${encodeURIComponent(
          currentToken
        )}`
        ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            if (payload.type === "ticket_message") {
              setMessages((prev) => {
                const filtered = prev.filter((m) => !(m.id < 0 && m.content === payload.content))
                if (filtered.some((m) => m.id === payload.id)) return filtered
                return [
                  ...filtered,
                  {
                    id: payload.id,
                    ticket_id: payload.ticket_id,
                    sender_id: payload.sender_id,
                    is_admin_reply: payload.is_admin_reply,
                    content: payload.content,
                    created_at: payload.created_at || new Date().toISOString(),
                    sender_name: payload.sender_name,
                  },
                ]
              })
              setTimeout(scrollToBottom, 50)
            }
          } catch (err) {
            console.error("WS parse error:", err)
          }
        }

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWs, 3000)
          }
        }

        ws.onerror = () => {
          try {
            ws?.close()
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn("WebSocket init error:", err)
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connectWs, 4000)
        }
      }
    }

    connectWs()

    const pollInterval = setInterval(() => {
      fetchTicketMessages(ticketId)
    }, 4000)

    return () => {
      isDisposed = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      clearInterval(pollInterval)
      if (ws) {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
      wsRef.current = null
    }
  }, [selectedTicket?.id, token, fetchTicketMessages])

  const openOutboundModal = () => {
    setOutboundOpen(true)
    loadUsers()
  }

  const handleSendReply = async (closeTicket: boolean = false) => {
    if (!selectedTicket || !replyText.trim()) return
    setSendingReply(true)
    const text = replyText.trim()
    setReplyText("")

    // Оптимистичное добавление
    const tempId = -Date.now()
    const optimisticMsg: TicketMessageItem = {
      id: tempId,
      ticket_id: selectedTicket.id,
      sender_id: user?.id || 0,
      is_admin_reply: true,
      content: text,
      created_at: new Date().toISOString(),
      sender_name: "Служба заботы",
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(scrollToBottom, 50)

    let sentViaWs = false
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "message", content: text }))
        sentViaWs = true
      } catch (err) {
        console.warn("WS send failed, fallback to REST", err)
      }
    }

    try {
      if (closeTicket) {
        const res = await authFetch(`/api/v1/admin/tickets/${selectedTicket.id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_reply: text,
            status: "resolved",
          }),
        })
        if (res.ok) {
          success("Ответ куратора отправлен, тикет закрыт!", "Тикет закрыт")
          loadTickets(true)
        } else {
          const err = await res.json()
          error(err.detail || "Ошибка отправки ответа", "Ошибка")
        }
      } else if (!sentViaWs) {
        const res = await authFetch(`/api/v1/support/tickets/${selectedTicket.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        })
        if (res.ok) {
          const newMsg: TicketMessageItem = await res.json()
          setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)))
          setTimeout(scrollToBottom, 50)
          success("Сообщение отправлено пользователю", "Отправлено")
        } else {
          const err = await res.json()
          error(err.detail || "Ошибка отправки", "Ошибка")
        }
      } else {
        success("Сообщение доставлено в реальном времени", "Отправлено")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSendingReply(false)
    }
  }

  const handleToggleTicketStatus = async () => {
    if (!selectedTicket) return
    setTogglingStatus(true)
    const isResolved = selectedTicket.status === "resolved"
    const endpoint = isResolved ? "reopen" : "close"
    try {
      const res = await authFetch(`/api/v1/support/tickets/${selectedTicket.id}/${endpoint}`, {
        method: "PATCH",
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedTicket((prev) => (prev ? { ...prev, status: updated.status } : null))
        success(isResolved ? "Тикет возобновлен" : "Тикет успешно закрыт", "Статус тикета")
        loadTickets(true)
      } else {
        const err = await res.json()
        error(err.detail || "Не удалось изменить статус", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleAnalyzeSummary = async () => {
    if (!selectedTicket) return
    setAnalyzingAi(true)
    try {
      const res = await authFetch(`/api/v1/admin/tickets/${selectedTicket.id}/ai-summarize`, {
        method: "POST",
      })
      if (res.ok) {
        const result = await res.json()
        setSelectedTicket((prev) => (prev ? { ...prev, ...result } : null))
        success("Резюме обращения сформировано", "Готово")
      }
    } catch {
      error("Не удалось сформировать резюме", "Ошибка")
    } finally {
      setAnalyzingAi(false)
    }
  }

  const handleCreateOutbound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !outboundSubject.trim() || !outboundMessage.trim()) return
    setSubmittingOutbound(true)
    try {
      const res = await authFetch("/api/v1/admin/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          category: outboundCategory,
          subject: outboundSubject.trim(),
          message: outboundMessage.trim(),
        }),
      })
      if (res.ok) {
        success("Обращение успешно отправлено пользователю", "Отправлено")
        setOutboundOpen(false)
        setSelectedUser(null)
        setUserSearchQuery("")
        setOutboundSubject("")
        setOutboundMessage("")
        loadTickets(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка создания тикета", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingOutbound(false)
    }
  }

  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery.trim()) return true
    const q = userSearchQuery.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.organization_name?.toLowerCase().includes(q)
    )
  }).slice(0, 8)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Шапка раздела в строгом швейцарском стиле */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
            Поддержка пользователей
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mt-0.5">
            Обращения и консультации
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
            Консультации участников платформы, разбор вопросов по сделкам и официальные уведомления
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={openOutboundModal}
            className="gap-2 text-xs font-semibold rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white shadow-xs transition-all cursor-pointer"
          >
            <HiOutlinePlusCircle className="size-4 text-[#F81B00]" />
            <span>Написать пользователю</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTickets(false)}
            disabled={refreshing}
            className="gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
          >
            <HiOutlineArrowPath className={`size-3.5 ${refreshing ? "animate-spin text-[#F81B00]" : ""}`} />
            <span>{refreshing ? "Обновление..." : "Обновить"}</span>
          </Button>
        </div>
      </div>

      {/* Фильтры статуса */}
      <div className="inline-flex p-1 bg-white border border-[#E2E5EB] rounded-xl shadow-xs gap-1">
        {[
          { id: "open", label: "Открытые обращения" },
          { id: "resolved", label: "Закрытые" },
          { id: "", label: "Все обращения" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              statusFilter === tab.id
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[550px] h-[calc(100vh-250px)]">
        {/* Слева: список тикетов */}
        <div className="lg:col-span-1 overflow-y-auto space-y-2.5 pr-1">
          {initialLoading && tickets.length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-[#E2E5EB]">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка обращений...</div>
            </div>
          ) : tickets.length === 0 ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-8 text-center text-xs text-[#6B7280] bg-white shadow-xs">
              Обращений в данном статусе нет
            </Card>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id
              return (
                <Card
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "border-[#F81B00]/60 ring-2 ring-[#F81B00]/10 bg-white shadow-sm"
                      : "border-[#E2E5EB] bg-white hover:border-[#111111]/20 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#6B7280] mb-1">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-[#4B5563]">
                      {t.category}
                    </span>
                    <span className="font-mono text-[#9CA3AF]">
                      {new Date(t.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#111111] line-clamp-1">{t.subject}</h4>
                  <div className="text-[11px] text-[#6B7280] truncate mt-1.5 flex items-center justify-between">
                    <span className="truncate">{t.user_name || t.user_email}</span>
                    {t.status === "open" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#F81B00]">
                        <span className="size-1.5 rounded-full bg-[#F81B00]" />
                        <span>Новое</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                        <span className="size-1.5 rounded-full bg-zinc-400" />
                        <span>Решено</span>
                      </span>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Справа: детали обращения и ответ */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-6 h-full flex flex-col justify-between bg-white shadow-xs">
              <div className="space-y-4 overflow-y-auto pr-2">
                <div className="flex items-start justify-between border-b border-[#E2E5EB] pb-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Обращение #{selectedTicket.id} • {selectedTicket.category}
                    </span>
                    <h3 className="text-lg font-bold text-[#111111] mt-0.5">{selectedTicket.subject}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDossier(selectedTicket.user_id)}
                      className="rounded-xl text-xs gap-1.5 h-8 border-[#E2E5EB] hover:bg-[#F5F6F8] cursor-pointer"
                    >
                      <HiOutlineArrowTopRightOnSquare className="size-3.5 text-[#F81B00]" />
                      <span>Досье</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTicket.status === "resolved" ? "outline" : "secondary"}
                      disabled={togglingStatus}
                      onClick={handleToggleTicketStatus}
                      className="rounded-xl text-xs gap-1.5 h-8 border-[#E2E5EB] hover:bg-[#F5F6F8] cursor-pointer"
                    >
                      {selectedTicket.status === "resolved" ? (
                        <>
                          <HiOutlineArrowPath className={`size-3.5 ${togglingStatus ? "animate-spin" : ""}`} />
                          <span>Возобновить</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineCheck className="size-3.5 text-emerald-600" />
                          <span>Закрыть тикет</span>
                        </>
                      )}
                    </Button>
                    <span className="text-xs font-semibold text-[#4B5563] flex items-center gap-1.5 ml-1">
                      <span
                        className={`size-2 rounded-full ${
                          selectedTicket.status === "resolved" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span>{selectedTicket.status === "resolved" ? "Закрыто" : "В работе"}</span>
                    </span>
                  </div>
                </div>

                {/* Данные заявителя */}
                <div className="p-3.5 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl text-xs flex flex-wrap gap-4 text-[#4B5563]">
                  <span>Заявитель: <strong className="text-[#111111]">{selectedTicket.user_name}</strong></span>
                  <span>Email: <strong className="text-[#111111]">{selectedTicket.user_email}</strong></span>
                  <span className="text-[#9CA3AF]">
                    Дата: {new Date(selectedTicket.created_at).toLocaleString("ru-RU")}
                  </span>
                </div>

                {/* Резюме сути обращения (без слопа и градиентов) */}
                <div className="p-4 bg-white border border-[#E2E5EB] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]">
                      Краткое содержание вопроса:
                    </span>
                    {!selectedTicket.ai_summary && (
                      <button
                        type="button"
                        onClick={handleAnalyzeSummary}
                        disabled={analyzingAi}
                        className="text-xs font-semibold text-[#F81B00] hover:underline cursor-pointer"
                      >
                        {analyzingAi ? "Формирование..." : "Сформировать выжимку"}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#374151] leading-relaxed">
                    {selectedTicket.ai_summary || selectedTicket.description}
                  </p>
                  {selectedTicket.ai_suggested_action && (
                    <div className="pt-2 border-t border-[#F5F6F8] flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">Предложение: {selectedTicket.ai_suggested_action}</span>
                      <button
                        type="button"
                        onClick={() => setReplyText(selectedTicket.ai_suggested_action || "")}
                        className="font-semibold text-[#F81B00] hover:underline cursor-pointer ml-2 shrink-0"
                      >
                        Вставить в ответ
                      </button>
                    </div>
                  )}
                </div>

                {/* Живой диалог и история сообщений */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                      <HiOutlineChatBubbleLeftRight className="size-3.5 text-[#F81B00]" />
                      <span>Диалог обращения</span>
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      {messages.length} {messages.length === 1 ? "сообщение" : "сообщений"}
                    </span>
                  </div>

                  <div className="min-h-[180px] max-h-[340px] overflow-y-auto p-3.5 bg-[#FBFBFC] border border-[#E2E5EB] rounded-xl space-y-3">
                    {/* Исходное сообщение пользователя, если сообщений еще нет */}
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-start space-y-1">
                        <div className="text-[10px] font-semibold text-[#6B7280]">
                          {selectedTicket.user_name || selectedTicket.user_email}
                        </div>
                        <div className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs bg-white border border-[#E2E5EB] text-[#111111] shadow-2xs whitespace-pre-wrap">
                          {selectedTicket.description}
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isCurator = msg.is_admin_reply
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isCurator ? "items-end" : "items-start"} space-y-1`}
                          >
                            <span className="text-[10px] font-semibold text-[#6B7280]">
                              {isCurator ? "Служба заботы" : msg.sender_name || selectedTicket.user_name}
                            </span>
                            <div
                              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                                isCurator
                                  ? "bg-[#111111] text-white rounded-br-xs"
                                  : "bg-white border border-[#E2E5EB] text-[#111111] rounded-bl-xs shadow-2xs"
                              }`}
                            >
                              <p>{msg.content}</p>
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                  isCurator ? "text-white/70" : "text-[#9CA3AF]"
                                }`}
                              >
                                {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              {/* Форма ответа куратора */}
              <div className="pt-4 border-t border-[#E2E5EB] space-y-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Введите сообщение заявителю в реальном времени..."
                  className="w-full h-20 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white focus:border-[#F81B00] outline-none resize-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleSendReply(false)
                    }
                  }}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[#9CA3AF]">
                    Ctrl + Enter для быстрой отправки
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingReply || !replyText.trim()}
                      onClick={() => handleSendReply(false)}
                      className="gap-1.5 text-xs font-semibold rounded-xl border-[#E2E5EB] hover:bg-[#F5F6F8] cursor-pointer px-3.5"
                    >
                      <HiOutlinePaperAirplane className="size-3.5 text-[#111111]" />
                      <span>{sendingReply ? "Отправка..." : "Отправить в чат"}</span>
                    </Button>
                    <Button
                      size="sm"
                      disabled={sendingReply || !replyText.trim()}
                      onClick={() => handleSendReply(true)}
                      className="gap-1.5 text-xs font-semibold rounded-xl bg-[#111111] hover:bg-[#2A2A2A] text-white cursor-pointer px-4"
                    >
                      <HiOutlineCheck className="size-3.5 text-emerald-400" />
                      <span>Ответить и закрыть</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-xs text-[#9CA3AF] border border-dashed border-[#E2E5EB] rounded-2xl bg-white">
              Выберите обращение из списка для просмотра деталей
            </div>
          )}
        </div>
      </div>

      {/* ДИАЛОГ: СОЗДАНИЕ ТИКЕТА ПО ПОЛЬЗОВАТЕЛЮ (БЕЗ РУЧНОГО ВВОДА ID) */}
      <Dialog open={outboundOpen} onOpenChange={setOutboundOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Написать пользователю</DialogTitle>
            <DialogDescription>
              Создание официального обращения от службы поддержки платформы «Точка Роста».
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOutbound} className="space-y-4 py-2 text-xs">
            {/* ВЫБОР ПОЛЬЗОВАТЕЛЯ ПО ИМЕНИ / EMAIL (НЕ ЧИСЛОВОЙ ID!) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase text-[#374151]">
                Получатель:
              </label>

              {selectedUser ? (
                <div className="p-3 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#111111] text-xs flex items-center gap-2">
                      <span>{selectedUser.full_name}</span>
                      <span className="text-[10px] font-normal text-[#6B7280]">
                        ({selectedUser.role === "lab" ? "НИИ / Лаборатория" : "Инвестор"})
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5">
                      {selectedUser.email}
                      {selectedUser.organization_name ? ` • ${selectedUser.organization_name}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null)
                      setUserSearchQuery("")
                    }}
                    className="p-1.5 text-[#6B7280] hover:text-[#F81B00] rounded-lg transition-colors cursor-pointer"
                    title="Выбрать другого пользователя"
                  >
                    <HiOutlineXMark className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#9CA3AF]" />
                    <Input
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Начните вводить имя, email или организацию..."
                      className="pl-8 h-9 text-xs rounded-xl border-[#E2E5EB]"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-[#E2E5EB] rounded-xl divide-y divide-[#E2E5EB] bg-white">
                    {loadingUsers ? (
                      <div className="p-3 text-center text-[11px] text-[#9CA3AF]">
                        Загрузка базы пользователей...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-3 text-center text-[11px] text-[#9CA3AF]">
                        Пользователи не найдены
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="p-2.5 hover:bg-[#F5F6F8] cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-[#111111] text-xs">{u.full_name}</div>
                            <div className="text-[10px] text-[#6B7280]">
                              {u.email} {u.organization_name ? `• ${u.organization_name}` : ""}
                            </div>
                          </div>
                          <span className="text-[10px] text-[#6B7280] font-medium">
                            {u.role === "lab" ? "НИИ" : "Инвестор"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[#374151]">Категория обращения:</label>
              <select
                value={outboundCategory}
                onChange={(e) => setOutboundCategory(e.target.value)}
                className="w-full h-9 border border-[#E2E5EB] rounded-xl px-3 text-xs bg-[#F5F6F8] focus:bg-white outline-none"
              >
                <option value="Общие вопросы">Общие вопросы</option>
                <option value="Верификация НИИ">Верификация НИИ</option>
                <option value="Финансы и Эскроу">Финансы и Эскроу</option>
                <option value="Модерация разработки">Модерация разработки</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[#374151]">Тема сообщения:</label>
              <Input
                required
                value={outboundSubject}
                onChange={(e) => setOutboundSubject(e.target.value)}
                placeholder="Например: Запрос документов по договору НИОКР"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[#374151]">Текст обращения:</label>
              <textarea
                required
                value={outboundMessage}
                onChange={(e) => setOutboundMessage(e.target.value)}
                placeholder="Введите текст обращения..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white outline-none resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOutboundOpen(false)} className="rounded-xl">
                Отмена
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingOutbound || !selectedUser || !outboundSubject.trim() || !outboundMessage.trim()}
                className="bg-[#111111] hover:bg-[#2A2A2A] text-white rounded-xl font-semibold cursor-pointer"
              >
                {submittingOutbound ? "Отправка..." : "Отправить пользователю"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminTicketsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-16 text-center space-y-2">
          <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs text-[#6B7280]">Загрузка службы заботы...</div>
        </div>
      }
    >
      <AdminTicketsContent />
    </React.Suspense>
  )
}
