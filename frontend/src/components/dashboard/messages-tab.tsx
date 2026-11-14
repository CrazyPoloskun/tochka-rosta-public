"use client"

import * as React from "react"
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineFolderOpen,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { User } from "@/lib/auth-context"
import { ChatItem, MessageItem } from "./dashboard-types"
import { CounterpartyModal } from "@/components/profile/counterparty-modal"

interface MessagesTabProps {
  user: User | null
  token: string | null
  chats: ChatItem[]
  loadingChats: boolean
  onRefreshChats: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

export function MessagesTab({
  user,
  token,
  chats,
  loadingChats,
  onRefreshChats,
  authFetch,
}: MessagesTabProps) {
  const { success, error, info } = useToast()

  const [activeChatId, setActiveChatId] = React.useState<number | null>(
    chats.length > 0 ? chats[0].id : null
  )
  const [messages, setMessages] = React.useState<MessageItem[]>([])
  const [messageText, setMessageText] = React.useState("")
  const [partnerTyping, setPartnerTyping] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [uploadingAttachment, setUploadingAttachment] = React.useState(false)
  const [mobileShowChat, setMobileShowChat] = React.useState(false)
  const [counterpartyModalId, setCounterpartyModalId] = React.useState<number | null>(null)

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastTypingSentRef = React.useRef<number>(0)
  const wsRef = React.useRef<WebSocket | null>(null)

  React.useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id)
    }
  }, [chats, activeChatId])

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Fetch messages
  const fetchMessages = React.useCallback(
    async (chatId: number) => {
      try {
        const res = await authFetch(`/api/v1/chats/${chatId}/messages`)
        if (res.ok) {
          const data: MessageItem[] = await res.json()
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
        console.error("fetchMessages error:", err)
      }
    },
    [authFetch]
  )

  // WebSocket connection & background sync with auto-reconnect
  React.useEffect(() => {
    if (!activeChatId) return

    fetchMessages(activeChatId)

    const currentToken =
      token || (typeof window !== "undefined" ? localStorage.getItem("tochka_access_token") : "")
    let ws: WebSocket | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let isDisposed = false

    const connectWs = () => {
      if (isDisposed || !currentToken || typeof window === "undefined") return

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/chats/${activeChatId}?token=${encodeURIComponent(
          currentToken
        )}`
        ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          // Connected
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            if (payload.type === "message") {
              setMessages((prev) => {
                const filtered = prev.filter((m) => !(m.id < 0 && m.content === payload.content))
                if (filtered.some((m) => m.id === payload.id)) return filtered
                return [
                  ...filtered,
                  {
                    id: payload.id,
                    chat_id: payload.chat_id,
                    sender_id: payload.sender_id,
                    content: payload.content,
                    is_read: true,
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
            console.error("WS message parse error:", err)
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
      fetchMessages(activeChatId)
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
  }, [activeChatId, token, user?.id, fetchMessages])

  // Handle typing event to WS
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)
    const now = Date.now()
    if (now - lastTypingSentRef.current > 2000 && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "typing" }))
        lastTypingSentRef.current = now
      } catch {
        // ignore
      }
    }
  }

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !activeChatId) return

    const text = messageText.trim()
    setMessageText("")

    // 1. Optimistic UI update
    const tempId = -Date.now()
    const optimisticMsg: MessageItem = {
      id: tempId,
      chat_id: activeChatId,
      sender_id: user?.id || 0,
      content: text,
      is_read: true,
      created_at: new Date().toISOString(),
      sender_name: user?.full_name || "Вы",
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(scrollToBottom, 50)

    // 2. Try WebSocket immediate send
    let sentViaWs = false
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "message", content: text }))
        sentViaWs = true
      } catch (err) {
        console.warn("WS send failed, fallback to REST", err)
      }
    }

    // 3. Fallback to REST API if WS not open
    if (!sentViaWs) {
      try {
        const res = await authFetch(`/api/v1/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        })
        if (res.ok) {
          const newMsg: MessageItem = await res.json()
          setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)))
          setTimeout(scrollToBottom, 50)
        }
      } catch (err) {
        error("Не удалось доставить сообщение", "Ошибка")
      }
    }
  }

  // Attach file to chat
  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return

    setUploadingAttachment(true)
    try {
      if (activeChat.project_id) {
        const formData = new FormData()
        formData.append("file", file)
        const res = await authFetch(`/api/v1/projects/${activeChat.project_id}/files`, {
          method: "POST",
          body: formData,
        })
        if (res.ok) {
          const fileData = await res.json()
          const fileMsg = `[Документ сделки: ${file.name}](${fileData.file_path})`
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "message", content: fileMsg }))
          } else {
            await authFetch(`/api/v1/chats/${activeChat.id}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: fileMsg }),
            })
            fetchMessages(activeChat.id)
          }
          success("Файл прикреплен и добавлен в файловый менеджер проекта", "Файл отправлен")
        }
      } else {
        // Plain attachment notice
        const plainMsg = `[Файл: ${file.name}]`
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "message", content: plainMsg }))
        }
      }
    } catch {
      error("Ошибка отправки файла", "Ошибка")
    } finally {
      setUploadingAttachment(false)
    }
  }

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      (c.other_party_name && c.other_party_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Сообщения и сделки
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Real-Time мессенджер согласований, прикрепления документов и арбитражного аудита
          </p>
        </div>
      </div>

      {loadingChats && chats.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#6B7280]">Загрузка диалогов...</div>
      ) : chats.length === 0 ? (
        <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center space-y-3 bg-white">
          <div className="size-12 rounded-2xl bg-[#F5F6F8] flex items-center justify-center mx-auto text-[#9CA3AF]">
            <HiOutlineChatBubbleLeftRight className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Нет активных диалогов</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Диалоги по проектам создаются автоматически при оформлении заказа на разработку или выборе исполнителя на бирже.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left Column: Chats List (4 cols) */}
          <Card className={`lg:col-span-4 rounded-2xl border-[#E2E5EB] bg-white flex flex-col overflow-hidden ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
            {/* Search */}
            <div className="p-3 border-b border-[#E2E5EB]">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск диалогов..."
                  className="pl-8 h-8 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F3F5]">
              {filteredChats.map((chat) => {
                const isSelected = chat.id === activeChat?.id
                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id)
                      setMobileShowChat(true)
                    }}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected ? "bg-[#F5F6F8]" : "hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-[#111111] truncate">
                          {chat.other_party_name || "Собеседник"}
                        </span>
                        <span className="text-[9px] font-semibold text-[#6B7280] bg-[#E2E5EB]/60 px-1.5 py-0.2 rounded-sm shrink-0">
                          {chat.other_party_role || "Участник"}
                        </span>
                        {chat.context_type === "task_bid" && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded-sm">
                            Отклик
                          </span>
                        )}
                        {chat.context_type === "idea_proposal" && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-purple-50 text-purple-800 border border-purple-200 rounded-sm">
                            Предложение
                          </span>
                        )}
                        {chat.context_type === "idea_order" && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-blue-50 text-blue-800 border border-blue-200 rounded-sm">
                            Заказ R&D
                          </span>
                        )}
                        {chat.context_type === "donation" && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-sm">
                            Донат
                          </span>
                        )}
                        {chat.project_id && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded-sm">
                            Проект
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-[#4B5563] truncate">
                        {chat.title}
                      </p>
                      {chat.last_message && (
                        <p className="text-[11px] text-[#9CA3AF] truncate mt-1">
                          {chat.last_message}
                        </p>
                      )}
                    </div>
                    {chat.unread_count > 0 && (
                      <span className="size-5 rounded-full bg-[#F81B00] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Right Column: Active Chat (8 cols) */}
          {activeChat && (
            <Card className={`lg:col-span-8 rounded-2xl border-[#E2E5EB] bg-white flex flex-col overflow-hidden ${mobileShowChat ? "flex" : "hidden lg:flex"}`}>
              {/* Chat Header with Legal Disclaimer */}
              <div className="p-3.5 border-b border-[#E2E5EB] bg-[#FAFAFA] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="lg:hidden p-1 -ml-1 text-xs font-semibold text-[#6B7280] hover:text-[#111111] rounded-lg"
                    >
                      ← Назад
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const targetId = activeChat.other_party_id || (user?.id === activeChat.investor_id ? activeChat.lab_id : activeChat.investor_id)
                            setCounterpartyModalId(targetId)
                          }}
                          className="text-xs font-bold text-[#111111] hover:text-[#F81B00] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                          title="Посмотреть карточку организации"
                        >
                          {activeChat.other_party_name}
                          <span className="text-[10px] text-neutral-400 font-normal">↗</span>
                        </button>
                        <span className="text-[10px] text-[#6B7280]">
                          • {activeChat.other_party_role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] truncate">{activeChat.title}</p>
                    </div>
                  </div>
                  {activeChat.project_id && (
                    <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB] bg-white shrink-0">
                      Проект #{activeChat.project_id}
                    </Badge>
                  )}
                </div>

                {/* Arbitration Disclaimer Banner */}
                <div className="p-2 bg-slate-100/90 border border-slate-200 rounded-xl text-[10px] text-[#4B5563] flex items-center gap-1.5 font-medium">
                  <HiOutlineShieldCheck className="size-3.5 text-slate-700 shrink-0" />
                  <span>
                    Все согласования и договорённости в чате фиксируются и имеют юридическую силу при разрешении споров в арбитраже.
                  </span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBFBFC]">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#9CA3AF] italic">
                    История сообщений пуста. Напишите первое сообщение по сделке.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isMine
                              ? "bg-[#111111] text-white rounded-br-xs"
                              : "bg-white border border-[#E2E5EB] text-[#111111] rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isMine ? "text-white/70" : "text-[#9CA3AF]"
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {/* Read ticks */}
                            {isMine && (
                              <span className="inline-flex items-center">
                                <HiOutlineCheck className="size-2.5" />
                                {msg.is_read && <HiOutlineCheck className="size-2.5 -ml-1.5" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Partner Typing Indicator */}
              {partnerTyping && (
                <div className="px-4 py-1 text-[11px] text-[#6B7280] italic flex items-center gap-1.5 bg-[#FBFBFC]">
                  <span className="size-1.5 rounded-full bg-[#F81B00] animate-pulse" />
                  <span>Собеседник печатает...</span>
                </div>
              )}

              {/* Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-[#E2E5EB] bg-white flex items-center gap-2"
              >
                {/* File Attachment Button */}
                <label className="p-2 text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8] rounded-xl transition-colors cursor-pointer shrink-0">
                  <HiOutlinePaperClip className="size-4" />
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingAttachment}
                    onChange={handleAttachFile}
                  />
                </label>

                <Input
                  value={messageText}
                  onChange={handleInputChange}
                  placeholder="Введите сообщение..."
                  className="flex-1 h-9 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                />

                <Button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="size-9 p-0 rounded-xl bg-[#111111] hover:bg-black text-white shrink-0 shadow-xs"
                >
                  <HiOutlinePaperAirplane className="size-4" />
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Modal Dossier */}
      <CounterpartyModal
        userId={counterpartyModalId}
        isOpen={!!counterpartyModalId}
        onClose={() => setCounterpartyModalId(null)}
      />
    </div>
  )
}
