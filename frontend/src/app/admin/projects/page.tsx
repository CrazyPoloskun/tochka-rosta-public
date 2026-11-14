"use client"

import * as React from "react"
import {
  HiOutlineScale,
  HiOutlineChatBubbleLeftRight,
  HiOutlineFolder,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineArrowUturnLeft,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineIdentification,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/lib/auth-context"
import { useDossier } from "@/app/admin/layout"

interface MilestoneItem {
  id: number
  step_number: number
  title: string
  amount: number
  status: string
  raw_report?: string | null
  ai_summary?: string | null
}

interface ProjectFileItem {
  id: number
  file_name: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

interface AdminProject {
  id: number
  title: string
  investor_id: number
  investor_name: string
  lab_id: number
  lab_name: string
  total_budget: number
  status: "active" | "completed" | "disputed"
  created_at: string
  milestones: MilestoneItem[]
  files: ProjectFileItem[]
}

interface ChatMessage {
  id: number
  sender_name: string
  content: string
  created_at: string
}

export default function AdminProjectsArbitrationPage() {
  const { authFetch } = useAuth()
  const { success, error } = useToast()
  const { openDossier } = useDossier()
  const [projects, setProjects] = React.useState<AdminProject[]>([])
  const [initialLoading, setInitialLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"disputed" | "in_review" | "active" | "completed" | "all">("disputed")
  const [selectedProject, setSelectedProject] = React.useState<AdminProject | null>(null)

  // Просмотр чата сделки
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([])
  const [isChatOpen, setIsChatOpen] = React.useState(false)

  // Арбитраж по этапу
  const [disputeMilestone, setDisputeMilestone] = React.useState<MilestoneItem | null>(null)
  const [arbitrationAction, setArbitrationAction] = React.useState<"release" | "refund" | null>(null)
  const [arbitrationComment, setArbitrationComment] = React.useState("")

  const loadProjects = React.useCallback(async (isSilent = false) => {
    if (!isSilent && projects.length === 0) {
      setInitialLoading(true)
    } else {
      setRefreshing(true)
    }
    try {
      const res = await authFetch(`/api/v1/admin/projects?tab=${activeTab}`)
      if (res.ok) {
        const data: AdminProject[] = await res.json()
        setProjects(data)
        setSelectedProject((prev) => {
          if (!prev) return data[0] || null
          const found = data.find((p) => p.id === prev.id)
          return found || data[0] || null
        })
      }
    } catch (e) {
      console.error("loadProjects error:", e)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [authFetch, activeTab, projects.length])

  React.useEffect(() => {
    loadProjects(false)
  }, [loadProjects])

  const openChat = async (projectId: number) => {
    try {
      const res = await authFetch(`/api/v1/admin/chats/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setChatMessages(data)
        setIsChatOpen(true)
      }
    } catch {
      error("Не удалось загрузить историю сообщений", "Ошибка")
    }
  }

  const handleResolveMilestone = async () => {
    if (!disputeMilestone || !arbitrationAction) return
    try {
      const res = await authFetch(`/api/v1/admin/milestones/${disputeMilestone.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: arbitrationAction,
          reason: arbitrationComment.trim() || "Решение арбитража администратором платформы",
        }),
      })
      if (res.ok) {
        success(
          arbitrationAction === "release"
            ? "Средства успешно перечислены исполнителю."
            : "Средства этапа возвращены на баланс заказчика.",
          "Решение арбитража принято"
        )
        setDisputeMilestone(null)
        setArbitrationAction(null)
        setArbitrationComment("")
        loadProjects(true)
      } else {
        const err = await res.json()
        error(err.detail || "Ошибка арбитража", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E5EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-purple-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Мониторинг сделок и разрешение споров
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111] mt-1">
            Проекты и Арбитраж
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Контроль исполнения этапов, аудит сырых отчётов против нейровыжимок и принудительное распределение эскроу
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadProjects(true)}
          disabled={refreshing}
          className="self-start sm:self-auto gap-2 text-xs font-semibold rounded-xl border-[#E2E5EB] bg-white shadow-xs hover:bg-[#F5F6F8] transition-all cursor-pointer"
        >
          <HiOutlineArrowPath className={`size-3.5 ${refreshing ? "animate-spin text-[#F81B00]" : ""}`} />
          <span>{refreshing ? "Обновление..." : "Обновить список"}</span>
        </Button>
      </div>

      {/* Фильтры-табы */}
      <div className="inline-flex flex-wrap p-1 bg-white border border-[#E2E5EB] rounded-xl shadow-xs gap-1">
        {[
          { id: "disputed", label: "Требуют арбитража" },
          { id: "in_review", label: "На проверке инвестором" },
          { id: "active", label: "Активные контракты" },
          { id: "completed", label: "Завершённые" },
          { id: "all", label: "Все сделки" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[550px]">
        {/* Список проектов */}
        <div className="lg:col-span-2 space-y-3">
          {initialLoading && projects.length === 0 ? (
            <div className="p-12 text-center space-y-2 border border-[#E2E5EB] rounded-2xl bg-white">
              <div className="size-6 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-[#6B7280]">Загрузка контрактов...</div>
            </div>
          ) : projects.length === 0 ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-8 text-center text-xs text-[#6B7280] bg-white shadow-xs">
              Сделок в данном статусе не обнаружено
            </Card>
          ) : (
            projects.map((p) => {
              const isSelected = selectedProject?.id === p.id
              return (
                <Card
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-[#F81B00]/50 ring-2 ring-[#F81B00]/15 bg-white shadow-md -translate-y-0.5"
                      : "border-[#E2E5EB] bg-white hover:border-[#111111]/20 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-[#111111]">
                          <span
                            className={`size-2 rounded-full ${
                              p.status === "disputed"
                                ? "bg-red-500"
                                : p.status === "completed"
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                            }`}
                          />
                          <span>
                            {p.status === "disputed"
                              ? "Арбитраж / Спор"
                              : p.status === "completed"
                              ? "Завершён"
                              : "В работе"}
                          </span>
                        </span>
                        <span className="text-[#6B7280]">
                          Бюджет: <strong className="text-[#111111] font-mono">{Number(p.total_budget).toLocaleString("ru-RU")} ₽</strong>
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#111111] truncate">
                        {p.title}
                      </h4>

                      <div className="text-xs text-[#6B7280] flex flex-wrap gap-4 pt-1">
                        <span className="flex items-center gap-1.5">
                          Заказчик:
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDossier(p.investor_id)
                            }}
                            className="font-bold text-[#111111] hover:text-[#F81B00] underline decoration-dotted underline-offset-2 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{p.investor_name}</span>
                            <HiOutlineIdentification className="size-3 text-[#9CA3AF]" />
                          </button>
                        </span>
                        <span className="flex items-center gap-1.5">
                          Исполнитель:
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDossier(p.lab_id)
                            }}
                            className="font-bold text-[#111111] hover:text-[#F81B00] underline decoration-dotted underline-offset-2 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{p.lab_name}</span>
                            <HiOutlineIdentification className="size-3 text-[#9CA3AF]" />
                          </button>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          openChat(p.id)
                        }}
                        className="rounded-xl text-xs gap-1.5 h-8 border-[#E2E5EB] bg-white hover:bg-[#F5F6F8] cursor-pointer"
                      >
                        <HiOutlineChatBubbleLeftRight className="size-3.5 text-[#F81B00]" />
                        <span>Чат сделки</span>
                      </Button>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">
                        Контракт #{p.id}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Детальный аудит этапов проекта */}
        <div className="lg:col-span-1">
          {selectedProject ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-6 space-y-5 bg-white shadow-xs sticky top-6 max-h-[calc(100vh-140px)] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E2E5EB] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Аудит этапов сделки #{selectedProject.id}
                </h3>
                <span className="text-xs font-bold text-[#111111]">
                  {selectedProject.milestones?.length || 0} этапов
                </span>
              </div>

              <div className="space-y-4">
                {selectedProject.milestones?.map((m) => (
                  <div key={m.id} className="p-4 bg-[#F5F6F8] border border-[#E2E5EB] rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#111111]">
                        Этап {m.step_number}: {m.title}
                      </span>
                      <span className="text-xs font-semibold text-[#4B5563] flex items-center gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${
                            m.status === "in_dispute" ? "bg-red-500" : m.status === "completed" ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                        <span>
                          {m.status === "in_dispute"
                            ? "Спор"
                            : m.status === "completed"
                            ? "Принят"
                            : m.status === "in_progress"
                            ? "В процессе"
                            : m.status === "submitted"
                            ? "На проверке"
                            : m.status}
                        </span>
                      </span>
                    </div>

                    <div className="text-[11px] text-[#6B7280] font-mono font-bold">
                      Сумма эскроу: {Number(m.amount).toLocaleString("ru-RU")} ₽
                    </div>

                    {/* Резюме отчета */}
                    {m.ai_summary && (
                      <div className="p-3 bg-white border border-[#E2E5EB] rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#111111] flex items-center gap-1">
                          <HiOutlineDocumentText className="size-3 text-[#F81B00]" />
                          <span>Краткое резюме отчёта:</span>
                        </span>
                        <p className="text-[11px] text-[#4B5563] leading-relaxed">
                          {m.ai_summary}
                        </p>
                      </div>
                    )}

                    {m.raw_report && (
                      <div className="p-3 bg-white border border-[#E2E5EB] rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#9CA3AF] flex items-center gap-1">
                          <HiOutlineDocumentText className="size-3" />
                          <span>Текст отчёта исполнителя:</span>
                        </span>
                        <p className="text-[11px] text-[#4B5563] leading-relaxed">
                          {m.raw_report}
                        </p>
                      </div>
                    )}

                    {/* Кнопка арбитража */}
                    <div className="pt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                        onClick={() => {
                          setDisputeMilestone(m)
                          setArbitrationAction("release")
                        }}
                      >
                        Выплатить исполнителю
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                        onClick={() => {
                          setDisputeMilestone(m)
                          setArbitrationAction("refund")
                        }}
                      >
                        Вернуть заказчику
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="p-8 text-center text-xs text-[#9CA3AF] border border-dashed border-[#E2E5EB] rounded-2xl bg-white min-h-[300px] flex items-center justify-center">
              Выберите сделку для аудита этапов
            </div>
          )}
        </div>
      </div>

      {/* SHADCN DIALOG: ПРОСМОТР ЧАТА (READ-ONLY) */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>История переписки сделки</DialogTitle>
            <DialogDescription>
              Режим куратора: аудит договоренностей сторон для разрешения спора.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-[#F5F6F8] rounded-xl my-2 max-h-96">
            {chatMessages.length === 0 ? (
              <div className="text-center text-xs text-[#9CA3AF] py-8">
                Сообщений в чате сделки нет
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="p-3 bg-white border border-[#E2E5EB] rounded-xl text-xs space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
                    <strong className="text-[#111111]">{msg.sender_name}</strong>
                    <span>{new Date(msg.created_at).toLocaleString("ru-RU")}</span>
                  </div>
                  <div className="text-[#374151] whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setIsChatOpen(false)} className="rounded-xl">
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHADCN DIALOG: РЕШЕНИЕ АРБИТРАЖА */}
      <Dialog open={Boolean(disputeMilestone && arbitrationAction)} onOpenChange={() => setDisputeMilestone(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {arbitrationAction === "release"
                ? "Выплата средств исполнителю"
                : "Возврат средств заказчику"}
            </DialogTitle>
            <DialogDescription>
              {arbitrationAction === "release"
                ? "Средства этапа будут перечислены на баланс исполнителя."
                : "Замороженные средства этапа вернутся на доступный баланс заказчика."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label className="text-[11px] font-bold uppercase text-[#374151]">Обоснование вердикта куратора:</label>
            <textarea
              value={arbitrationComment}
              onChange={(e) => setArbitrationComment(e.target.value)}
              placeholder="Укажите результаты проверки отчёта или причину отказа в приёмке..."
              className="w-full h-24 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-[#F5F6F8] focus:bg-white focus:border-[#F81B00] outline-none resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisputeMilestone(null)} className="rounded-xl">
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleResolveMilestone}
              className={`rounded-xl font-bold ${
                arbitrationAction === "release"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              Подтвердить вердикт
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
