"use client"

import * as React from "react"
import {
  HiOutlineLifebuoy,
  HiOutlinePlusCircle,
  HiOutlinePaperAirplane,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineUser,
  HiOutlinePencilSquare,
  HiOutlineArrowPath,
  HiOutlineXCircle,
  HiOutlinePaperClip,
  HiOutlineDocumentText,
  HiOutlineArrowDownTray,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { User } from "@/lib/auth-context"
import { TicketItem, TicketMessageItem } from "./dashboard-types"

interface SupportTabProps {
  user: User | null
  token: string | null
  tickets: TicketItem[]
  loading: boolean
  onRefresh: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function SupportTab({
  user,
  token,
  tickets,
  loading,
  onRefresh,
  authFetch,
}: SupportTabProps) {
  const { success, error, info } = useToast()

  const [activeTicketId, setActiveTicketId] = React.useState<number | null>(
    tickets.length > 0 ? tickets[0].id : null
  )

  // Ticket messages
  const [messages, setMessages] = React.useState<TicketMessageItem[]>([])
  const [replyText, setReplyText] = React.useState("")
  const [partnerTyping, setPartnerTyping] = React.useState(false)
  const [mobileShowTicket, setMobileShowTicket] = React.useState(false)

  // New ticket modal
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false)
  const [ticketSubject, setTicketSubject] = React.useState("")
  const [ticketCategory, setTicketCategory] = React.useState("Модерация и документы")
  const [ticketPriority, setTicketPriority] = React.useState("normal")
  const [ticketDesc, setTicketDesc] = React.useState("")
  const [submittingTicket, setSubmittingTicket] = React.useState(false)

  // Edit ticket modal
  const [isEditTicketOpen, setIsEditTicketOpen] = React.useState(false)
  const [editSubject, setEditSubject] = React.useState("")
  const [editCategory, setEditCategory] = React.useState("Модерация и документы")
  const [editDesc, setEditDesc] = React.useState("")
  const [submittingEdit, setSubmittingEdit] = React.useState(false)
  const [togglingStatus, setTogglingStatus] = React.useState(false)
  const [uploadingSupportFile, setUploadingSupportFile] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const wsRef = React.useRef<WebSocket | null>(null)

  React.useEffect(() => {
    if (tickets.length > 0 && !activeTicketId) {
      setActiveTicketId(tickets[0].id)
    }
  }, [tickets, activeTicketId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Fetch ticket messages
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

  // WebSocket inside ticket with auto-reconnect
  React.useEffect(() => {
    if (!activeTicketId) return

    fetchTicketMessages(activeTicketId)

    const currentToken =
      token || (typeof window !== "undefined" ? localStorage.getItem("tochka_access_token") : "")
    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let isDisposed = false

    const connectWs = () => {
      if (isDisposed || !currentToken || typeof window === "undefined") return

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/tickets/${activeTicketId}?token=${encodeURIComponent(
          currentToken
        )}`
        ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          // Connected successfully
        }

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
              setPartnerTyping(false)
              setTimeout(scrollToBottom, 50)
            } else if (payload.type === "typing") {
              if (payload.user_id !== user?.id) {
                setPartnerTyping(true)
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
                typingTimerRef.current = setTimeout(() => setPartnerTyping(false), 2500)
              }
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
      fetchTicketMessages(activeTicketId)
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
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [activeTicketId, token, user?.id, fetchTicketMessages])

  // Create ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingTicket(true)
    try {
      const res = await authFetch("/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: ticketCategory,
          priority: ticketPriority,
          subject: ticketSubject.trim(),
          description: ticketDesc.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success("Обращение создано! Куратор платформы уже назначен.", "Тикет открыт")
        setIsNewTicketOpen(false)
        setTicketSubject("")
        setTicketDesc("")
        onRefresh()
      } else {
        error(data.detail || "Ошибка создания тикета", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Send message in ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !activeTicketId) return

    const text = replyText.trim()
    setReplyText("")

    // 1. Optimistic UI update
    const tempId = -Date.now()
    const optimisticMsg: TicketMessageItem = {
      id: tempId,
      ticket_id: activeTicketId,
      sender_id: user?.id || 0,
      is_admin_reply: user?.is_admin || false,
      content: text,
      created_at: new Date().toISOString(),
      sender_name: user?.full_name || "Вы",
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(scrollToBottom, 50)

    // 2. Try WS
    let sentViaWs = false
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "message", content: text }))
        sentViaWs = true
      } catch (err) {
        console.warn("WS send failed, fallback to REST", err)
      }
    }

    // 3. REST fallback if WS is unavailable
    if (!sentViaWs) {
      try {
        const res = await authFetch(`/api/v1/support/tickets/${activeTicketId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        })
        if (res.ok) {
          const newMsg: TicketMessageItem = await res.json()
          setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)))
          setTimeout(scrollToBottom, 50)
        }
      } catch {
        error("Не удалось отправить сообщение куратору", "Ошибка")
      }
    }
  }

  // Attach file to support ticket
  const handleAttachSupportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeTicketId || uploadingSupportFile) return

    setUploadingSupportFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await authFetch(`/api/v1/support/tickets/${activeTicketId}/upload-attachment`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || "Ошибка загрузки файла")
      }

      success(`Файл ${file.name} прикреплён к обращению`, "Файл отправлен")
      fetchTicketMessages(activeTicketId)
    } catch (err: any) {
      error(err.message || "Не удалось прикрепить файл", "Ошибка")
    } finally {
      setUploadingSupportFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Toggle ticket status (close / reopen)
  const handleToggleStatus = async () => {
    if (!activeTicket) return
    setTogglingStatus(true)
    const isResolved = activeTicket.status === "resolved"
    const endpoint = isResolved ? "reopen" : "close"
    try {
      const res = await authFetch(`/api/v1/support/tickets/${activeTicket.id}/${endpoint}`, {
        method: "PATCH",
      })
      if (res.ok) {
        success(
          isResolved ? "Обращение возобновлено и возвращено в работу" : "Обращение успешно закрыто",
          "Статус обновлён"
        )
        onRefresh()
      } else {
        const err = await res.json()
        error(err.detail || "Не удалось изменить статус", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при изменении статуса", "Ошибка")
    } finally {
      setTogglingStatus(false)
    }
  }

  // Open edit modal
  const handleOpenEdit = () => {
    if (!activeTicket) return
    setEditSubject(activeTicket.subject)
    setEditCategory(activeTicket.category)
    setEditDesc(activeTicket.description)
    setIsEditTicketOpen(true)
  }

  // Save edited ticket
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTicket || !editSubject.trim() || !editDesc.trim()) return
    setSubmittingEdit(true)
    try {
      const res = await authFetch(`/api/v1/support/tickets/${activeTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editSubject.trim(),
          category: editCategory,
          description: editDesc.trim(),
        }),
      })
      if (res.ok) {
        success("Обращение успешно обновлено", "Сохранено")
        setIsEditTicketOpen(false)
        onRefresh()
      } else {
        const err = await res.json()
        error(err.detail || "Не удалось сохранить изменения", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при сохранении", "Ошибка")
    } finally {
      setSubmittingEdit(false)
    }
  }

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Служба заботы и кураторы
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Консультации по модерации, сопровождение эскроу-счетов и оперативное разрешение технических вопросов
          </p>
        </div>

        <Button
          onClick={() => setIsNewTicketOpen(true)}
          className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer"
        >
          <HiOutlinePlusCircle className="size-4 mr-1.5" />
          + Задать вопрос
        </Button>
      </div>

      {loading && tickets.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#6B7280]">Загрузка обращений...</div>
      ) : tickets.length === 0 ? (
        <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center space-y-3 bg-white">
          <div className="size-12 rounded-2xl bg-[#F5F6F8] flex items-center justify-center mx-auto text-[#9CA3AF]">
            <HiOutlineLifebuoy className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">У вас пока нет обращений</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Если у вас возник вопрос по модерации документов, резервному счёту или сопровождению сделки — нажмите «+ Задать вопрос».
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left Column: Tickets List (4 cols) */}
          <Card className={`lg:col-span-4 rounded-2xl border-[#E2E5EB] bg-white flex flex-col overflow-hidden ${mobileShowTicket ? "hidden lg:flex" : "flex"}`}>
            <div className="p-3 border-b border-[#E2E5EB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Все обращения ({tickets.length})
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F3F5]">
              {tickets.map((ticket) => {
                const isSelected = ticket.id === activeTicket?.id
                const isCuratorInbound = ticket.initiated_by_admin

                return (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setActiveTicketId(ticket.id)
                      setMobileShowTicket(true)
                    }}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                      isSelected ? "bg-[#F5F6F8]" : "hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {isCuratorInbound ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#F81B00] border border-red-200">
                          Запрос от куратора
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#6B7280] bg-[#E2E5EB]/60 px-2 py-0.5 rounded-md">
                          {ticket.category}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          ticket.status === "resolved"
                            ? "bg-emerald-100 text-emerald-800"
                            : ticket.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ticket.status === "resolved"
                          ? "Решён"
                          : ticket.status === "in_progress"
                          ? "В работе"
                          : "Открыт"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#111111] line-clamp-1">{ticket.subject}</h4>
                    <p className="text-[11px] text-[#6B7280] line-clamp-2 leading-snug">
                      {ticket.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Right Column: Ticket Live Conversation (8 cols) */}
          {activeTicket && (
            <Card className={`lg:col-span-8 rounded-2xl border-[#E2E5EB] bg-white flex flex-col overflow-hidden ${mobileShowTicket ? "flex" : "hidden lg:flex"}`}>
              {/* Ticket Details Header */}
              <div className="p-4 border-b border-[#E2E5EB] bg-[#FAFAFA] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileShowTicket(false)}
                      className="lg:hidden p-1 -ml-1 text-xs font-semibold text-[#6B7280] hover:text-[#111111] rounded-lg"
                    >
                      ← Назад
                    </button>
                    <span className="text-xs font-bold text-[#111111]">
                      Тикет #{activeTicket.id}
                    </span>
                    {activeTicket.initiated_by_admin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#F81B00]">
                        Запрос от куратора
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEdit}
                      className="h-7 text-[11px] font-semibold gap-1 rounded-lg border-[#E2E5EB] bg-white hover:bg-[#F5F6F8] cursor-pointer"
                      title="Отредактировать обращение"
                    >
                      <HiOutlinePencilSquare className="size-3.5" />
                      <span>Правка</span>
                    </Button>
                    <Button
                      variant={activeTicket.status === "resolved" ? "outline" : "secondary"}
                      size="sm"
                      disabled={togglingStatus}
                      onClick={handleToggleStatus}
                      className="h-7 text-[11px] font-semibold gap-1 rounded-lg border-[#E2E5EB] cursor-pointer"
                    >
                      {activeTicket.status === "resolved" ? (
                        <>
                          <HiOutlineArrowPath className={`size-3.5 ${togglingStatus ? "animate-spin" : ""}`} />
                          <span>Возобновить</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineCheckCircle className="size-3.5 text-emerald-600" />
                          <span>Закрыть вопрос</span>
                        </>
                      )}
                    </Button>
                    <Badge
                      variant={activeTicket.status === "resolved" ? "default" : "secondary"}
                      className="text-[10px] font-bold uppercase"
                    >
                      {activeTicket.status === "resolved"
                        ? "Вопрос решён"
                        : activeTicket.status === "in_progress"
                        ? "Куратор подключен"
                        : "Ожидает ответа"}
                    </Badge>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[#111111]">{activeTicket.subject}</h3>
                <p className="text-[11px] text-[#6B7280]">
                  Категория: {activeTicket.category} • Приоритет: {activeTicket.priority}
                </p>
              </div>

              {/* Messages Flow */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBFBFC]">
                {/* Initial ticket text */}
                <div className="p-3 bg-white border border-[#E2E5EB] rounded-2xl text-xs text-[#111111] leading-relaxed shadow-2xs">
                  <span className="font-bold text-[#6B7280] block mb-1">Суть обращения:</span>
                  {activeTicket.description}
                </div>

                {/* Messages Stream */}
                {messages.map((msg) => {
                  const isAdmin = msg.is_admin_reply
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isAdmin
                            ? "bg-red-50/80 border border-red-200 text-[#111111] rounded-bl-xs"
                            : "bg-[#111111] text-white rounded-br-xs"
                        }`}
                      >
                        <div
                          className={`text-[10px] font-bold mb-1 ${
                            isAdmin ? "text-[#F81B00]" : "text-white/70"
                          }`}
                        >
                          {isAdmin ? "Служба заботы / Куратор" : "Вы"}
                        </div>
                        {msg.content.startsWith("[Файл:") ? (
                          <div className="py-1">
                            <a
                              href={msg.content.match(/\((.*?)\)/)?.[1] || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ${
                                isAdmin
                                  ? "bg-white border border-red-200 text-[#111111] hover:bg-red-50"
                                  : "bg-white/10 hover:bg-white/20 text-white"
                              }`}
                            >
                              <HiOutlineDocumentText className="size-4 text-[#F81B00]" />
                              <span className="truncate">
                                {msg.content.match(/\[Файл:\s*(.*?)\]/)?.[1] || "Вложение"}
                              </span>
                              <HiOutlineArrowDownTray className="size-3.5 ml-auto opacity-70" />
                            </a>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <span
                          className={`block text-[9px] mt-1 text-right ${
                            isAdmin ? "text-[#6B7280]" : "text-white/60"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Partner typing */}
              {partnerTyping && (
                <div className="px-4 py-1 text-[11px] text-[#6B7280] italic flex items-center gap-1.5 bg-[#FBFBFC]">
                  <span className="size-1.5 rounded-full bg-[#F81B00] animate-pulse" />
                  <span>Куратор поддержки печатает ответ...</span>
                </div>
              )}

              {/* Reply Form */}
              <form
                onSubmit={handleSendReply}
                className="p-3 border-t border-[#E2E5EB] bg-white flex items-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  disabled={uploadingSupportFile}
                  onChange={handleAttachSupportFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingSupportFile}
                  className="p-2 text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Прикрепить файл к обращению (скриншот, документ, акт)"
                >
                  <HiOutlinePaperClip className="size-4" />
                </button>

                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ответить куратору или прикрепить пояснения..."
                  className="flex-1 h-9 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                />
                <Button
                  type="submit"
                  disabled={!replyText.trim() || uploadingSupportFile}
                  className="size-9 p-0 rounded-xl bg-[#111111] hover:bg-black text-white shrink-0 shadow-xs"
                >
                  <HiOutlinePaperAirplane className="size-4" />
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* New Ticket Modal */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Новое обращение в службу поддержки
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Опишите вопрос. Наш специалист подключится к диалогу в реальном времени.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Категория</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
              >
                <option value="Модерация и документы">Модерация и документы</option>
                <option value="Резервный счёт и финансы">Резервный счёт и финансы</option>
                <option value="Спор по проекту">Спор по проекту (Арбитраж)</option>
                <option value="Технический вопрос">Технический вопрос</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Приоритет</label>
              <select
                value={ticketPriority}
                onChange={(e) => setTicketPriority(e.target.value)}
                className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
              >
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
                <option value="urgent">Критический</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Тема обращения
              </label>
              <Input
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Например: Уточнение по выписке ЕГРЮЛ"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Подробное описание вопроса
              </label>
              <textarea
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                placeholder="Опишите вопрос или приложите текст сообщения от модератора..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewTicketOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingTicket}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {submittingTicket ? "Открытие..." : "Создать тикет"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Modal */}
      <Dialog open={isEditTicketOpen} onOpenChange={setIsEditTicketOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Редактирование обращения #{activeTicket?.id}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Вы можете уточнить тему, изменить категорию или скорректировать описание.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Категория</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
              >
                <option value="Модерация и документы">Модерация и документы</option>
                <option value="Резервный счёт и финансы">Резервный счёт и финансы</option>
                <option value="Спор по проекту">Спор по проекту (Арбитраж)</option>
                <option value="Технический вопрос">Технический вопрос</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Тема обращения
              </label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Тема обращения..."
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Описание вопроса
              </label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Подробное описание..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTicketOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingEdit}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer"
              >
                {submittingEdit ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
