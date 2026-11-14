"use client"

import * as React from "react"
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlineShieldCheck,
  HiOutlineCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineUserGroup,
  HiOutlineDocumentText,
  HiOutlineArrowDownTray,
  HiOutlineXMark,
  HiOutlinePhoto,
  HiOutlineEye,
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
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { User } from "@/lib/auth-context"
import { ChatItem, MessageItem, ChatMemberItem, MessageAttachmentItem } from "./dashboard-types"
import { CounterpartyModal } from "@/components/profile/counterparty-modal"

interface MessagesTabProps {
  user: User | null
  token: string | null
  chats: ChatItem[]
  loadingChats: boolean
  onRefreshChats: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

interface StagedAttachment {
  file: File
  uploadedId?: number
  uploading: boolean
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б"
  const k = 1024
  const sizes = ["Б", "КБ", "МБ", "ГБ"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
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
  const [mobileShowChat, setMobileShowChat] = React.useState(false)
  const [counterpartyModalId, setCounterpartyModalId] = React.useState<number | null>(null)

  // Групповые участники и файлы
  const [membersModalOpen, setMembersModalOpen] = React.useState(false)
  const [chatMembers, setChatMembers] = React.useState<ChatMemberItem[]>([])
  const [loadingMembers, setLoadingMembers] = React.useState(false)
  const [stagedFiles, setStagedFiles] = React.useState<StagedAttachment[]>([])
  const [isSending, setIsSending] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastTypingSentRef = React.useRef<number>(0)
  const wsRef = React.useRef<WebSocket | null>(null)

  React.useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id)
    }
  }, [chats, activeChatId])

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

  // Fetch chat members
  const fetchChatMembers = React.useCallback(
    async (chatId: number) => {
      setLoadingMembers(true)
      try {
        const res = await authFetch(`/api/v1/chats/${chatId}/members`)
        if (res.ok) {
          const data: ChatMemberItem[] = await res.json()
          setChatMembers(data)
        }
      } catch (err) {
        console.error("fetchChatMembers error:", err)
      } finally {
        setLoadingMembers(false)
      }
    },
    [authFetch]
  )

  // WebSocket connection & background sync
  React.useEffect(() => {
    if (!activeChatId) return

    fetchMessages(activeChatId)
    fetchChatMembers(activeChatId)

    let isDisposed = false
    let reconnectTimeout: NodeJS.Timeout | null = null
    let ws: WebSocket | null = null

    const connectWs = () => {
      if (isDisposed) return
      try {
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:"
        const host = window.location.host
        const wsUrl = `${wsProto}//${host}/api/v1/realtime/chat/${activeChatId}?token=${encodeURIComponent(token || "")}`

        ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "message") {
              const newMsg: MessageItem = {
                id: data.id,
                chat_id: data.chat_id,
                sender_id: data.sender_id,
                content: data.content,
                is_read: false,
                is_system: data.is_system || false,
                created_at: data.created_at || new Date().toISOString(),
                sender_name: data.sender_name,
                sender_role: data.sender_role,
                attachments: data.attachments || [],
              }
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev
                return [...prev.filter((m) => m.id > 0), newMsg]
              })
              setTimeout(scrollToBottom, 50)
            } else if (data.type === "typing") {
              if (data.user_id !== user?.id) {
                setPartnerTyping(true)
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
                typingTimerRef.current = setTimeout(() => {
                  setPartnerTyping(false)
                }, 2500)
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
  }, [activeChatId, token, user?.id, fetchMessages, fetchChatMembers])

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

  // Staging files
  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const newStaged: StagedAttachment[] = files.map((f) => ({
      file: f,
      uploading: false,
    }))

    setStagedFiles((prev) => [...prev, ...newStaged])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Send message with optional staged files
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!messageText.trim() && stagedFiles.length === 0) || !activeChatId || isSending) return

    const text = messageText.trim()
    setIsSending(true)

    try {
      // 1. Upload any staged files first
      const attachmentIds: number[] = []
      for (const staged of stagedFiles) {
        if (staged.uploadedId) {
          attachmentIds.push(staged.uploadedId)
          continue
        }

        const formData = new FormData()
        formData.append("file", staged.file)

        const uploadRes = await authFetch(`/api/v1/chats/${activeChatId}/upload-attachment`, {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}))
          throw new Error(errData.detail || `Ошибка загрузки файла ${staged.file.name}`)
        }

        const uploadData = await uploadRes.json()
        attachmentIds.push(uploadData.id)
      }

      // 2. Optimistic message
      const tempId = -Date.now()
      const optimisticMsg: MessageItem = {
        id: tempId,
        chat_id: activeChatId,
        sender_id: user?.id || 0,
        content: text,
        is_read: true,
        created_at: new Date().toISOString(),
        sender_name: user?.full_name || "Вы",
        attachments: stagedFiles.map((s, idx) => ({
          id: attachmentIds[idx] || -(idx + 1),
          message_id: tempId,
          file_name: s.file.name,
          file_path: "#",
          file_size: s.file.size,
          mime_type: s.file.type || "application/octet-stream",
          created_at: new Date().toISOString(),
        })),
      }
      setMessages((prev) => [...prev, optimisticMsg])
      setMessageText("")
      setStagedFiles([])
      setTimeout(scrollToBottom, 50)

      // 3. Post to REST API
      const res = await authFetch(`/api/v1/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          attachment_ids: attachmentIds,
        }),
      })

      if (res.ok) {
        const newMsg: MessageItem = await res.json()
        setMessages((prev) => prev.map((m) => (m.id === tempId ? newMsg : m)))
        setTimeout(scrollToBottom, 50)
      } else {
        const errJson = await res.json().catch(() => ({}))
        error(errJson.detail || "Не удалось доставить сообщение", "Ошибка")
      }
    } catch (err: any) {
      error(err.message || "Ошибка отправки", "Ошибка")
    } finally {
      setIsSending(false)
    }
  }

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]
  const isGroupChat = activeChat?.chat_type === "project"

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
            Сообщения и синдикаты
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Групповые чаты соинвесторов, обмен файлами и арбитражный аудит соглашений
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
            Групповой чат проекта создаётся автоматически при открытии инвестиционного синдиката или отклике на задачу.
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
                  placeholder="Поиск диалогов и синдикатов..."
                  className="pl-8 h-8 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F3F5]">
              {filteredChats.map((chat) => {
                const isSelected = chat.id === activeChat?.id
                const isChatGroup = chat.chat_type === "project"

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
                        {isChatGroup ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md">
                            <HiOutlineUserGroup className="size-3" />
                            Группа проекта
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-[#6B7280] bg-[#E2E5EB]/60 px-1.5 py-0.2 rounded-sm shrink-0">
                            {chat.other_party_role || "Участник"}
                          </span>
                        )}

                        <span className="text-xs font-bold text-[#111111] truncate">
                          {isChatGroup ? chat.title : (chat.other_party_name || "Собеседник")}
                        </span>
                      </div>

                      <p className="text-[11px] font-medium text-[#4B5563] truncate">
                        {isChatGroup ? (chat.last_message || "Групповой диалог соинвесторов") : chat.title}
                      </p>

                      {isChatGroup && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#9CA3AF]">
                          <span>👥 {chat.members_count || 2} участников</span>
                        </div>
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
              {/* Chat Header */}
              <div className="p-3.5 border-b border-[#E2E5EB] bg-[#FAFAFA] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="lg:hidden p-1 -ml-1 text-xs font-semibold text-[#6B7280] hover:text-[#111111] rounded-lg shrink-0"
                    >
                      ← Назад
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isGroupChat ? (
                          <div className="flex items-center gap-1.5">
                            <span className="size-7 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                              <HiOutlineUserGroup className="size-4" />
                            </span>
                            <span className="text-xs font-bold text-[#111111] truncate">
                              {activeChat.title}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = activeChat.other_party_id || (user?.id === activeChat.investor_id ? activeChat.lab_id : activeChat.investor_id)
                              setCounterpartyModalId(targetId ?? null)
                            }}
                            className="text-xs font-bold text-[#111111] hover:text-[#F81B00] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                            title="Посмотреть карточку организации"
                          >
                            {activeChat.other_party_name}
                            <span className="text-[10px] text-neutral-400 font-normal">↗</span>
                          </button>
                        )}

                        <span className="text-[10px] text-[#6B7280]">
                          • {isGroupChat ? "Синдикат проекта" : activeChat.other_party_role}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#6B7280] truncate">
                        {isGroupChat ? "Совместный чат инвесторов и исполнителя НИОКР" : activeChat.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Кнопка участников группы */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchChatMembers(activeChat.id)
                        setMembersModalOpen(true)
                      }}
                      className="h-8 text-xs font-semibold border-[#E2E5EB] rounded-xl flex items-center gap-1.5 bg-white hover:bg-[#F5F6F8]"
                    >
                      <HiOutlineUserGroup className="size-3.5 text-[#6B7280]" />
                      <span>{chatMembers.length || activeChat.members_count || 2} уч.</span>
                    </Button>

                    {activeChat.project_id && (
                      <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB] bg-white hidden sm:inline-flex">
                        Проект #{activeChat.project_id}
                      </Badge>
                    )}
                  </div>
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

                    // Системное оповещение
                    if (msg.is_system) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[#4B5563] text-[11px] font-medium max-w-md text-center shadow-2xs">
                            {msg.content}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                      >
                        {/* Имя отправителя в групповом чате */}
                        {!isMine && (
                          <span className="text-[10px] font-semibold text-[#6B7280] mb-0.5 px-1 flex items-center gap-1">
                            {msg.sender_name || "Участник"}
                            {msg.sender_role && (
                              <span className="text-[8px] bg-slate-100 text-slate-600 px-1 rounded-sm">
                                {msg.sender_role === "lab" ? "Лаборатория" : "Инвестор"}
                              </span>
                            )}
                          </span>
                        )}

                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isMine
                              ? "bg-[#111111] text-white rounded-br-xs"
                              : "bg-white border border-[#E2E5EB] text-[#111111] rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                          {/* Вложения сообщений (картинки, файлы) */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5 pt-1 border-t border-white/10">
                              {msg.attachments.map((att) => {
                                const isImage = att.mime_type.startsWith("image/")
                                return (
                                  <div key={att.id} className="rounded-xl overflow-hidden">
                                    {isImage ? (
                                      <a
                                        href={att.file_path}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block rounded-lg overflow-hidden border border-white/20 hover:opacity-90 transition-opacity"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={att.file_path}
                                          alt={att.file_name}
                                          className="max-h-48 w-auto rounded-lg object-contain bg-black/5"
                                        />
                                        <div className="text-[10px] mt-1 opacity-80 flex items-center justify-between">
                                          <span className="truncate max-w-[150px]">{att.file_name}</span>
                                          <span>{formatBytes(att.file_size)}</span>
                                        </div>
                                      </a>
                                    ) : (
                                      <a
                                        href={att.file_path}
                                        download={att.file_name}
                                        className={`flex items-center justify-between gap-3 p-2 rounded-xl text-xs font-medium transition-colors ${
                                          isMine
                                            ? "bg-white/10 hover:bg-white/20 text-white"
                                            : "bg-[#F5F6F8] hover:bg-[#ECEEF2] text-[#111111]"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <HiOutlineDocumentText className="size-4 shrink-0 text-[#F81B00]" />
                                          <div className="min-w-0">
                                            <p className="truncate font-semibold text-[11px]">{att.file_name}</p>
                                            <p className="text-[9px] opacity-70">{formatBytes(att.file_size)}</p>
                                          </div>
                                        </div>
                                        <HiOutlineArrowDownTray className="size-4 shrink-0 opacity-80" />
                                      </a>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

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

              {/* Staged files bar */}
              {stagedFiles.length > 0 && (
                <div className="px-3 pt-2 bg-white border-t border-[#E2E5EB] flex flex-wrap gap-2">
                  {stagedFiles.map((staged, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs text-[#111111]"
                    >
                      <HiOutlineDocumentText className="size-3.5 text-[#F81B00]" />
                      <span className="max-w-[140px] truncate text-[11px] font-medium">{staged.file.name}</span>
                      <span className="text-[9px] text-[#6B7280]">({formatBytes(staged.file.size)})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStagedFile(idx)}
                        className="text-[#9CA3AF] hover:text-black ml-1 p-0.5"
                      >
                        <HiOutlineXMark className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-[#E2E5EB] bg-white flex items-center gap-2"
              >
                {/* File Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleSelectFiles}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Прикрепить файлы (PDF, DOCX, сметы, изображения)"
                >
                  <HiOutlinePaperClip className="size-4" />
                </button>

                <Input
                  value={messageText}
                  onChange={handleInputChange}
                  placeholder={stagedFiles.length > 0 ? "Добавьте комментарий к файлам..." : "Введите сообщение..."}
                  className="flex-1 h-9 text-xs rounded-xl bg-[#F8FAFC] border-[#E2E5EB]"
                />

                <Button
                  type="submit"
                  disabled={(!messageText.trim() && stagedFiles.length === 0) || isSending}
                  className="size-9 p-0 rounded-xl bg-[#111111] hover:bg-black text-white shrink-0 shadow-xs"
                >
                  <HiOutlinePaperAirplane className="size-4" />
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Modal: Список участников группового чата */}
      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border-[#E2E5EB]">
          <DialogHeader className="pb-3 border-b border-[#E2E5EB]">
            <DialogTitle className="text-base font-bold text-[#111111] flex items-center gap-2">
              <HiOutlineUserGroup className="size-5 text-[#F81B00]" />
              <span>Участники проектного чата</span>
            </DialogTitle>
            <p className="text-xs text-[#6B7280] mt-1">
              Реестр инвесторов синдиката и представителей исследовательской лаборатории
            </p>
          </DialogHeader>

          <div className="py-3 divide-y divide-[#F1F3F5] max-h-80 overflow-y-auto">
            {loadingMembers ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">Загрузка участников...</div>
            ) : chatMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#9CA3AF]">Список участников пуст</div>
            ) : (
              chatMembers.map((member) => {
                const isLab = member.role === "lab" || member.user_role === "lab"
                const isLead = member.role === "lead_investor"

                return (
                  <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="size-9 rounded-xl bg-[#F5F6F8] border border-[#E2E5EB] flex items-center justify-center font-bold text-xs text-[#111111] shrink-0">
                          {member.full_name?.charAt(0) || "U"}
                        </div>
                        {member.is_online && (
                          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#111111] truncate">
                            {member.organization_name || member.full_name}
                          </span>

                          {isLab ? (
                            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200">
                              НИИ / Лаборатория
                            </Badge>
                          ) : isLead ? (
                            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-900 border-amber-200">
                              Лид-инвестор
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-800 border-blue-200">
                              Соинвестор
                            </Badge>
                          )}
                        </div>

                        {member.organization_name && member.full_name && (
                          <p className="text-[11px] text-[#6B7280] truncate">{member.full_name}</p>
                        )}

                        {member.share_percent !== null && member.share_percent !== undefined && (
                          <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                            Доля: <span className="font-bold">{member.share_percent}%</span>
                            {member.invested_amount ? ` • Вложено: ${member.invested_amount.toLocaleString("ru-RU")} ₽` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMembersModalOpen(false)
                        setCounterpartyModalId(member.user_id)
                      }}
                      className="text-xs h-7 px-2 text-[#6B7280] hover:text-[#111111] shrink-0"
                    >
                      <HiOutlineEye className="size-3.5 mr-1" />
                      Досье
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dossier */}
      <CounterpartyModal
        userId={counterpartyModalId}
        isOpen={!!counterpartyModalId}
        onClose={() => setCounterpartyModalId(null)}
      />
    </div>
  )
}
