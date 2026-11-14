"use client"

import * as React from "react"
import {
  HiOutlineBriefcase,
  HiOutlinePlusCircle,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineBuildingLibrary,
  HiOutlineCalendar,
  HiOutlinePaperClip,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineDocumentArrowDown,
  HiOutlineChatBubbleLeftRight,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineTrash,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { CopyButton } from "@/components/ui/copy-button"
import { TableSkeleton } from "@/components/ui/skeleton-loader"
import { AiTaskAssistantModal } from "./ai-task-assistant-modal"
import { CounterpartyModal } from "@/components/profile/counterparty-modal"
import { User } from "@/lib/auth-context"
import { TaskItem, TaskBid, MatchingInvitationItem, RecommendedLabItem } from "./dashboard-types"
import { MilestonesChainView, MilestonesChainEditor, MilestoneItemData } from "./milestones-chain"

interface TasksTabProps {
  user: User | null
  tasks: TaskItem[]
  loading: boolean
  onRefresh: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  onNavigateToProjects: () => void
  onNavigateToMessages: () => void
}

export function TasksTab({
  user,
  tasks,
  loading,
  onRefresh,
  authFetch,
  onNavigateToProjects,
  onNavigateToMessages,
}: TasksTabProps) {
  const { success, error, info } = useToast()
  const isLab = user?.role === "lab"
  const isVerifiedLab = isLab && user?.verification_status === "verified"

  // AI Matchmaking & Counterparty Modals
  const [labTab, setLabTab] = React.useState<"all" | "invitations">("all")
  const [counterpartyModalId, setCounterpartyModalId] = React.useState<number | null>(null)
  const [invitations, setInvitations] = React.useState<MatchingInvitationItem[]>([])
  const [loadingInvitations, setLoadingInvitations] = React.useState(false)
  const [recommendedLabsMap, setRecommendedLabsMap] = React.useState<Record<number, RecommendedLabItem[]>>({})
  const [loadingRecsForTask, setLoadingRecsForTask] = React.useState<number | null>(null)

  // Load invitations for Lab
  const loadLabInvitations = React.useCallback(async () => {
    if (!isLab) return
    setLoadingInvitations(true)
    try {
      const res = await authFetch("/api/v1/tasks/lab/invitations")
      if (res.ok) {
        const data = await res.json()
        setInvitations(data)
      }
    } catch (e) {
      console.error("Failed to load invitations", e)
    } finally {
      setLoadingInvitations(false)
    }
  }, [isLab, authFetch])

  React.useEffect(() => {
    if (isLab) {
      loadLabInvitations()
    }
  }, [isLab, loadLabInvitations])

  // Load recommended labs for investor task
  const loadRecommendedLabs = async (taskId: number) => {
    if (recommendedLabsMap[taskId]) return
    setLoadingRecsForTask(taskId)
    try {
      const res = await authFetch(`/api/v1/tasks/${taskId}/recommended-labs`)
      if (res.ok) {
        const data: RecommendedLabItem[] = await res.json()
        setRecommendedLabsMap((prev) => ({ ...prev, [taskId]: data }))
      }
    } catch (e) {
      console.error("Failed to load recommendations", e)
    } finally {
      setLoadingRecsForTask(null)
    }
  }

  // Investor: New Task Modal
  const [isNewTaskOpen, setIsNewTaskOpen] = React.useState(false)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = React.useState(false)
  const [taskTitle, setTaskTitle] = React.useState("")
  const [taskBudget, setTaskBudget] = React.useState("")
  const [taskDeadline, setTaskDeadline] = React.useState("6 месяцев")
  const [taskDesc, setTaskDesc] = React.useState("")
  const [taskMilestones, setTaskMilestones] = React.useState<MilestoneItemData[]>([
    { step: 1, title: "Аналитическое исследование и эскизное проектирование", amount: 300000 },
    { step: 2, title: "Разработка макета и стендовые испытания", amount: 400000 },
    { step: 3, title: "Создание опытного образца и приёмочные испытания", amount: 300000 },
  ])
  const [submittingTask, setSubmittingTask] = React.useState(false)
  const [generatingTz, setGeneratingTz] = React.useState(false)

  // Task View Modal
  const [viewTaskModal, setViewTaskModal] = React.useState<TaskItem | null>(null)

  // Task Edit Modal
  const [editTaskModal, setEditTaskModal] = React.useState<TaskItem | null>(null)
  const [editTaskTitle, setEditTaskTitle] = React.useState("")
  const [editTaskBudget, setEditTaskBudget] = React.useState("")
  const [editTaskDeadline, setEditTaskDeadline] = React.useState("6 месяцев")
  const [editTaskDesc, setEditTaskDesc] = React.useState("")
  const [editTaskMilestones, setEditTaskMilestones] = React.useState<MilestoneItemData[]>([])
  const [savingTaskEdit, setSavingTaskEdit] = React.useState(false)

  // Task Delete State
  const [deletingTaskId, setDeletingTaskId] = React.useState<number | null>(null)
  const [deletingTask, setDeletingTask] = React.useState(false)

  const handleOpenEditTask = (task: TaskItem) => {
    setEditTaskModal(task)
    setEditTaskTitle(task.title)
    setEditTaskBudget(String(task.budget || 0))
    setEditTaskDeadline(task.deadline || "6 месяцев")
    setEditTaskDesc(task.description || "")
    setEditTaskMilestones(
      (task.milestones && task.milestones.length > 0)
        ? task.milestones.map((m: any, i: number) => ({
            step: m.step || i + 1,
            title: m.title || `Этап ${i + 1}`,
            amount: Number(m.amount) || 0,
          }))
        : [
            { step: 1, title: "Аналитическое исследование и эскизное проектирование", amount: Math.round(Number(task.budget) * 0.3) },
            { step: 2, title: "Разработка макета и стендовые испытания", amount: Math.round(Number(task.budget) * 0.4) },
            { step: 3, title: "Создание опытного образца и приёмочные испытания", amount: Math.round(Number(task.budget) * 0.3) },
          ]
    )
  }

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTaskModal) return
    setSavingTaskEdit(true)
    try {
      const res = await authFetch(`/api/v1/tasks/${editTaskModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim(),
          budget: Number(editTaskBudget) || 0,
          deadline: editTaskDeadline.trim(),
          milestones: editTaskMilestones,
        }),
      })
      if (res.ok) {
        success(
          "R&D-задача успешно обновлена! Свидетельство депонирования ТЗ синхронизировано.",
          "Задача обновлена"
        )
        const updated = await res.json()
        setEditTaskModal(null)
        if (viewTaskModal?.id === editTaskModal.id) {
          setViewTaskModal(updated)
        }
        onRefresh()
      } else {
        const data = await res.json()
        error(data.detail || "Ошибка при обновлении задачи", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSavingTaskEdit(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return
    setDeletingTask(true)
    try {
      const res = await authFetch(`/api/v1/tasks/${deletingTaskId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        success("Задача успешно удалена с биржи R&D.", "Задача удалена")
        if (viewTaskModal?.id === deletingTaskId) {
          setViewTaskModal(null)
        }
        setDeletingTaskId(null)
        onRefresh()
      } else {
        const data = await res.json()
        error(data.detail || "Ошибка при удалении задачи", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setDeletingTask(false)
    }
  }

  const handleApplyAiTz = (tzData: {
    title: string
    category?: string
    budget: string
    deadline: string
    description: string
    stages?: { step?: number; title: string; amount?: number }[]
  }) => {
    setTaskTitle(tzData.title)
    setTaskBudget(tzData.budget)
    setTaskDeadline(tzData.deadline)
    setTaskDesc(tzData.description)
    if (tzData.stages && tzData.stages.length > 0) {
      setTaskMilestones(
        tzData.stages.map((s, i) => ({
          step: s.step || i + 1,
          title: s.title || `Этап ${i + 1}`,
          amount: Number(s.amount) || Math.round(Number(tzData.budget) / tzData.stages.length) || 200000,
        }))
      )
    }
    setIsNewTaskOpen(true)
  }

  // AI Assist for Tender TZ
  const handleGenerateTzWithAi = async () => {
    const query = taskDesc.trim() || taskTitle.trim()
    if (!query || query.length < 5) {
      info("Укажите хотя бы краткую идею в названии или описании, чтобы ИИ мог составить спецификацию", "Подсказка")
      return
    }
    setGeneratingTz(true)
    try {
      const res = await authFetch("/api/v1/ai/generate-tz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          query: query,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.title && (!taskTitle || taskTitle.length < 15)) setTaskTitle(data.title)
        if (data.suggested_budget) setTaskBudget(String(data.suggested_budget))
        if (data.suggested_deadline) setTaskDeadline(data.suggested_deadline)
        if (data.description) setTaskDesc(data.description)
        success("Техническое задание сформировано нейросетью по ГОСТ 15.016!", "ИИ составил ТЗ")
      } else {
        error("Не удалось сгенерировать ТЗ", "Ошибка ИИ")
      }
    } catch {
      error("Сетевая ошибка при генерации ТЗ", "Ошибка")
    } finally {
      setGeneratingTz(false)
    }
  }

  // Lab: Bid Modal
  const [bidModalTask, setBidModalTask] = React.useState<TaskItem | null>(null)
  const [bidBudget, setBidBudget] = React.useState("")
  const [bidDeadline, setBidDeadline] = React.useState("4 месяца")
  const [bidPlan, setBidPlan] = React.useState("")
  const [selectedPatents, setSelectedPatents] = React.useState<string[]>([])
  const [submittingBid, setSubmittingBid] = React.useState(false)

  // Investor: Confirm Accept Bid
  const [confirmAcceptBid, setConfirmAcceptBid] = React.useState<{
    taskId: number
    bidId: number
    labName: string
  } | null>(null)

  // Create Task (Investor)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingTask(true)
    try {
      const res = await authFetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          budget: Number(taskBudget) || 1000000,
          deadline: taskDeadline.trim(),
          description: taskDesc.trim(),
          milestones: taskMilestones,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success("R&D-тендер успешно опубликован! Лаборатории смогут подавать отклики.", "Задача создана")
        setIsNewTaskOpen(false)
        setTaskTitle("")
        setTaskBudget("")
        setTaskDesc("")
        onRefresh()
      } else {
        error(data.detail || "Ошибка публикации задачи", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingTask(false)
    }
  }

  // Submit Bid (Lab)
  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bidModalTask) return
    if (!isVerifiedLab) {
      error("Отклики на задачи доступны только после подтверждения верификации НИИ", "Требуется верификация")
      return
    }

    setSubmittingBid(true)
    try {
      const res = await authFetch(`/api/v1/tasks/${bidModalTask.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_budget: Number(bidBudget) || bidModalTask.budget,
          proposed_deadline: bidDeadline.trim(),
          work_plan: bidPlan.trim(),
          attached_patents: selectedPatents,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success("Отклик лаборатории успешно отправлен заказчику с подтверждёнными патентами!", "Отклик отправлен")
        setBidModalTask(null)
        setBidPlan("")
        setSelectedPatents([])
        onRefresh()
      } else {
        error(data.detail || "Ошибка подачи отклика", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingBid(false)
    }
  }

  // Accept Bid (Investor)
  const handleAcceptBid = async (taskId: number, bidId: number) => {
    try {
      const res = await authFetch(`/api/v1/tasks/${taskId}/bids/${bidId}/accept`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok) {
        success(
          "Исполнитель выбран! Сделка переведена в статус активного проекта, чат сделки создан.",
          "Проект запущен"
        )
        setConfirmAcceptBid(null)
        onRefresh()
        onNavigateToProjects()
      } else {
        error(data.detail || "Ошибка выбора исполнителя", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  // User's confirmed patents list from auth context
  const labPatents: any[] = user?.patents_info || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Биржа R&D-задач и тендеров
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {isLab
              ? "Актуальные производственные и технологические задачи от бизнеса с открытым конкурсом исполнителей"
              : "Разместите требования к разработке и выберите лабораторию с наилучшими компетенциями и патентами"}
          </p>
        </div>

        {!isLab && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiAssistantOpen(true)}
              className="text-xs font-bold border-[#E2E5EB] bg-white hover:bg-[#F5F6F8] text-[#111111] rounded-xl shadow-xs cursor-pointer gap-1.5"
            >
              <HiOutlineSparkles className="size-4 text-[#F81B00]" />
              <span>ИИ-помощник ТЗ</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsNewTaskOpen(true)}
              className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer"
            >
              <HiOutlinePlusCircle className="size-4 mr-1.5" />
              + Разместить R&D-задачу
            </Button>
          </div>
        )}
      </div>

      {/* Sub-tabs for Lab */}
      {isLab && (
        <div className="flex items-center gap-2 border-b border-[#E2E5EB] pb-3">
          <button
            onClick={() => setLabTab("all")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              labTab === "all"
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
            }`}
          >
            Все открытые тендеры ({tasks.length})
          </button>
          <button
            onClick={() => {
              setLabTab("invitations")
              loadLabInvitations()
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              labTab === "invitations"
                ? "bg-[#111111] text-white shadow-xs"
                : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
            }`}
          >
            <HiOutlineSparkles className="size-3.5 text-[#F81B00]" />
            <span>Персональные приглашения ({invitations.length})</span>
          </button>
        </div>
      )}

      {/* Invitations View for Lab */}
      {isLab && labTab === "invitations" ? (
        <div className="space-y-4">
          {loadingInvitations ? (
            <TableSkeleton rows={3} />
          ) : invitations.length === 0 ? (
            <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center space-y-3 bg-white">
              <div className="size-12 rounded-2xl bg-[#F5F6F8] flex items-center justify-center mx-auto text-[#9CA3AF]">
                <HiOutlineSparkles className="size-6 text-[#F81B00]" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Нет персональных рекомендаций</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Система AI Matchmaking подбирает тендеры на основе ваших патентов, уставных документов и профиля исследований.
              </p>
            </Card>
          ) : (
            invitations.map((inv) => (
              <Card
                key={inv.invitation_id}
                className="rounded-2xl border-2 border-purple-200 bg-white p-5 sm:p-6 space-y-4 hover:border-purple-300 transition-colors shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-purple-600 text-white rounded-md flex items-center gap-1">
                        <HiOutlineSparkles className="size-3.5" />
                        {inv.match_percent}% совпадение компетенций
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB]">
                        Тендер #{inv.task_id}
                      </Badge>
                      <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                        <HiOutlineCalendar className="size-3.5" />
                        Срок: {inv.deadline}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#111111] leading-snug">
                      {inv.title}
                    </h3>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Заказчик: {inv.investor_name}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Бюджет
                    </p>
                    <p className="text-lg font-bold text-[#111111] mt-0.5">
                      {Number(inv.budget).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {inv.description}
                </p>

                {inv.matched_reasons && inv.matched_reasons.length > 0 && (
                  <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-900 block">
                      Совпадающие научные компетенции и патенты:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inv.matched_reasons.map((reason, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-white border border-purple-200 text-purple-800 text-[10px] font-medium rounded-md"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[#F1F3F5] flex items-center justify-between">
                  <a
                    href={`/api/v1/certificates/task/${inv.task_id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[#111111] hover:text-[#F81B00] flex items-center gap-1"
                  >
                    <HiOutlineDocumentArrowDown className="size-4 text-[#F81B00]" />
                    <span>Свидетельство ТЗ (PDF)</span>
                  </a>

                  <Button
                    size="sm"
                    onClick={() => {
                      const matchedTask = tasks.find((t) => t.id === inv.task_id) || {
                        id: inv.task_id,
                        title: inv.title,
                        budget: inv.budget,
                        deadline: inv.deadline,
                        description: inv.description,
                        creator_id: 0,
                        status: "open" as const,
                        created_at: "",
                      }
                      setBidModalTask(matchedTask)
                      setBidBudget(String(inv.budget))
                    }}
                    className="text-xs font-bold bg-[#111111] hover:bg-[#F81B00] text-white rounded-xl shadow-xs"
                  >
                    Подать предложение от НИИ
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : loading && tasks.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : tasks.length === 0 ? (
        <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center space-y-3 bg-white">
          <div className="size-12 rounded-2xl bg-[#F5F6F8] flex items-center justify-center mx-auto text-[#9CA3AF]">
            <HiOutlineBriefcase className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Нет активных R&D-задач</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            {isLab
              ? "В данный момент на бирже нет открытых тендеров от бизнеса. Новые задачи публикуются регулярно."
              : "Вы пока не разместили ни одной задачи. Нажмите «+ Разместить R&D-задачу», чтобы опубликовать техническое задание."}
          </p>
          <div className="pt-2">
            {isLab ? (
              <Button
                onClick={onNavigateToProjects}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                Мои активные проекты
              </Button>
            ) : (
              <Button
                onClick={() => setIsNewTaskOpen(true)}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                + Разместить R&D-задачу
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const isCreator = task.creator_id === user?.id || task.investor_id === user?.id || user?.is_admin
            const bidsCount = task.bids?.length || 0
            const hasMyBid = isLab && task.bids?.some((b) => b.lab_id === user?.id)

            return (
              <Card
                key={task.id}
                className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-4 hover:shadow-xs transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB]">
                        Тендер #{task.id}
                      </Badge>
                      <CopyButton text={String(task.id)} label="ID" title="Копировать номер задачи" />
                      <Badge
                        variant={task.status === "open" ? "default" : "secondary"}
                        className="text-[10px] font-bold uppercase"
                      >
                        {task.status === "open" ? "Открыт сбор заявок" : "Исполнитель выбран"}
                      </Badge>
                      <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                        <HiOutlineCalendar className="size-3.5" />
                        Срок: {task.deadline}
                      </span>
                    </div>
                    <h3
                      onClick={() => setViewTaskModal(task)}
                      className="text-base font-bold text-[#111111] leading-snug cursor-pointer hover:text-[#F81B00] transition-colors"
                      title="Нажмите, чтобы посмотреть полное ТЗ и цепочку этапов"
                    >
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#6B7280]">Заказчик:</span>
                      <button
                        type="button"
                        onClick={() => setCounterpartyModalId(task.creator_id || task.investor_id || 0)}
                        className="text-[11px] font-semibold text-[#111111] hover:text-[#F81B00] hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Посмотреть карточку организации"
                      >
                        {task.creator_name || task.investor_name || "Корпоративный партнёр"}
                        <span className="text-[9px] text-neutral-400">↗</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Максимальный бюджет
                    </p>
                    <p className="text-lg font-bold text-[#111111]">
                      {Number(task.budget).toLocaleString("ru-RU")} ₽
                    </p>
                    <a
                      href={`/api/v1/certificates/task/${task.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#111111] hover:text-[#F81B00] transition-colors"
                      title="Скачать цифровое свидетельство депонирования ТЗ с QR-кодом"
                    >
                      <HiOutlineDocumentArrowDown className="size-3.5 text-[#F81B00]" />
                      <span>Свидетельство ТЗ (PDF)</span>
                    </a>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#4B5563] leading-relaxed line-clamp-3">
                  {task.description}
                </p>

                {/* Milestones count and Details button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F3F5]">
                  <div className="flex items-center gap-3 text-[11px] text-[#6B7280]">
                    <span>
                      Этапов реализации: <strong className="text-[#111111]">{task.milestones?.length || 3}</strong>
                    </span>
                    <span>
                      Откликов НИИ: <strong className="text-[#111111]">{bidsCount}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewTaskModal(task)}
                      className="text-xs font-bold border-[#E2E5EB] text-[#111111] hover:bg-[#F5F6F8] rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <HiOutlineEye className="size-3.5 text-[#6B7280]" />
                      <span>Подробнее</span>
                    </Button>

                    {isCreator && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditTask(task)}
                          className="px-2.5 text-xs font-bold border-[#E2E5EB] text-[#111111] hover:border-[#111111] rounded-xl cursor-pointer"
                          title="Редактировать задачу и этапы"
                        >
                          <HiOutlinePencilSquare className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingTaskId(task.id)}
                          className="px-2.5 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                          title="Удалить задачу"
                        >
                          <HiOutlineTrash className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Lab Action */}
                {isLab && task.status === "open" && (
                  <div className="pt-3 border-t border-[#F1F3F5] flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">
                      Подано откликов от лабораторий: <strong>{bidsCount}</strong>
                    </span>
                    {hasMyBid ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                        <HiOutlineCheck className="size-4" />
                        Ваш отклик отправлен заказчику
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!isVerifiedLab}
                        onClick={() => {
                          setBidModalTask(task)
                          setBidBudget(String(task.budget))
                        }}
                        title={!isVerifiedLab ? "Доступно после верификации НИИ" : ""}
                        className={`text-xs font-bold rounded-xl shadow-xs ${
                          isVerifiedLab
                            ? "bg-[#F81B00] hover:bg-[#e01800] text-white cursor-pointer"
                            : "bg-slate-200 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        Откликнуться от имени НИИ
                      </Button>
                    )}
                  </div>
                )}

                {/* Investor View: Managing Bids & AI Matchmaking */}
                {isCreator && (
                  <div className="pt-3 border-t border-[#F1F3F5] space-y-4">
                    {/* Recommended Labs (AI Matchmaking) */}
                    <div className="p-3.5 bg-gradient-to-r from-purple-50/70 to-slate-50 border border-purple-200/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <HiOutlineSparkles className="size-4 text-purple-700" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950">
                            Рекомендованные научные центры (AI Matchmaking)
                          </h4>
                        </div>
                        {!recommendedLabsMap[task.id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadRecommendedLabs(task.id)}
                            disabled={loadingRecsForTask === task.id}
                            className="text-[11px] h-7 px-2.5 border-purple-200 bg-white hover:bg-purple-100/50 text-purple-900 rounded-lg cursor-pointer"
                          >
                            {loadingRecsForTask === task.id ? "Подбор..." : "Показать Топ-3 НИИ"}
                          </Button>
                        )}
                      </div>

                      {recommendedLabsMap[task.id] && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          {recommendedLabsMap[task.id].map((lab) => (
                            <div
                              key={lab.lab_id}
                              className="p-3 bg-white border border-purple-100 rounded-xl space-y-1.5 shadow-2xs flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-purple-100 text-purple-800 rounded">
                                    {lab.match_percent}% совпадение
                                  </span>
                                  {lab.patents_count > 0 && (
                                    <span className="text-[9px] text-[#6B7280]">
                                      {lab.patents_count} пат.
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCounterpartyModalId(lab.lab_id)}
                                  className="text-xs font-bold text-[#111111] hover:text-[#F81B00] hover:underline text-left line-clamp-2 cursor-pointer"
                                  title="Посмотреть карточку организации"
                                >
                                  {lab.organization_name}
                                  <span className="text-[10px] text-neutral-400 font-normal ml-0.5">↗</span>
                                </button>
                                {lab.matched_reasons && lab.matched_reasons.length > 0 && (
                                  <p className="text-[10px] text-[#6B7280] line-clamp-2 mt-1">
                                    {lab.matched_reasons.slice(0, 3).join(", ")}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setCounterpartyModalId(lab.lab_id)
                                }}
                                className="w-full text-center py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer mt-1"
                              >
                                Досье лаборатории
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bids List */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                        Отклики научных лабораторий ({bidsCount})
                      </h4>
                      <span className="text-[11px] text-[#6B7280]">
                        Сравните сметы и прикреплённые патенты
                      </span>
                    </div>

                    {bidsCount === 0 ? (
                      <p className="text-xs text-[#6B7280] italic">
                        Пока нет откликов. Лаборатории изучают ваше техническое задание.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {task.bids?.map((bid) => (
                          <div
                            key={bid.id}
                            className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setCounterpartyModalId(bid.lab_id)}
                                  className="text-xs font-bold text-[#111111] hover:text-[#F81B00] hover:underline flex items-center gap-0.5 cursor-pointer"
                                  title="Посмотреть карточку организации"
                                >
                                  {bid.lab_org || bid.lab_name || "Научный институт"}
                                  <span className="text-[9px] text-neutral-400">↗</span>
                                </button>
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <HiOutlineShieldCheck className="size-3" />
                                  НИИ верифицирован
                                </span>
                              </div>
                              <p className="text-xs text-[#4B5563]">{bid.work_plan}</p>
                              {bid.attached_patents && bid.attached_patents.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[10px] font-bold text-[#6B7280]">Патенты:</span>
                                  {bid.attached_patents.map((pat, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-medium bg-white px-2 py-0.5 rounded-md border border-[#E2E5EB] text-[#111111]"
                                    >
                                      {pat}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-[11px] text-[#6B7280]">
                                Предлагаемый срок: <strong className="text-[#111111]">{bid.proposed_deadline}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                              <span className="text-sm font-bold text-[#111111] mr-2">
                                {Number(bid.proposed_budget).toLocaleString("ru-RU")} ₽
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={onNavigateToMessages}
                                className="text-xs border-[#E2E5EB] hover:bg-neutral-100 flex items-center gap-1"
                              >
                                <HiOutlineChatBubbleLeftRight className="size-3.5 text-[#F81B00]" />
                                <span>Диалог</span>
                              </Button>
                              {task.status === "open" && !bid.is_accepted && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setConfirmAcceptBid({
                                      taskId: task.id,
                                      bidId: bid.id,
                                      labName: bid.lab_org || bid.lab_name || "НИИ",
                                    })
                                  }
                                  className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
                                >
                                  Выбрать исполнителя
                                </Button>
                              )}
                              {bid.is_accepted && (
                                <Badge className="bg-emerald-600 text-white font-bold text-xs">
                                  Исполнитель утверждён
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Investor New Task Modal */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Размещение R&D-задачи (Тендера)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Опубликуйте требования к НИОКР и этапы сметы. Аккредитованные лаборатории предложат решение.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название задачи
              </label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Например: Синтез термостойкого антикоррозийного покрытия"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Макс. бюджет (₽)
                </label>
                <Input
                  type="number"
                  value={taskBudget}
                  onChange={(e) => setTaskBudget(e.target.value)}
                  placeholder="2000000"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Требуемый дедлайн
                </label>
                <Input
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  placeholder="6 месяцев"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#111111]">
                  Техническое задание и требования к результату
                </label>
                <button
                  type="button"
                  onClick={() => setIsAiAssistantOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#F81B00] hover:text-[#d01700] transition-colors cursor-pointer"
                >
                  <HiOutlineSparkles className="size-3.5" />
                  <span>ИИ-помощник ТЗ (ГОСТ 15.016)</span>
                </button>
              </div>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Подробно опишите технические условия, ГОСТы, диапазоны температур, требования к протоколам..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            {/* Stages Timeline Chain Editor */}
            <MilestonesChainEditor
              milestones={taskMilestones}
              onChange={setTaskMilestones}
              onSyncBudget={(tot) => setTaskBudget(String(tot))}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewTaskOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingTask}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {submittingTask ? "Публикация..." : "Разместить тендер"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
                disabled={submittingTask}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {submittingTask ? "Публикация..." : "Разместить тендер"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lab Bid Modal */}
      <Dialog open={!!bidModalTask} onOpenChange={(open) => !open && setBidModalTask(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Отклик на тендер от имени НИИ
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Предложите смету, сроки и прикрепите подтверждённые патенты вашей лаборатории.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitBid} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Предлагаемый бюджет (₽)
                </label>
                <Input
                  type="number"
                  value={bidBudget}
                  onChange={(e) => setBidBudget(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Срок выполнения
                </label>
                <Input
                  value={bidDeadline}
                  onChange={(e) => setBidDeadline(e.target.value)}
                  placeholder="4 месяца"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                План работ и научная методология лаборатории
              </label>
              <textarea
                value={bidPlan}
                onChange={(e) => setBidPlan(e.target.value)}
                placeholder="Опишите предлагаемый подход к решению задачи, наличие испытательного оборудования..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            {/* Patent Selector */}
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1.5">
                Прикрепить подтверждённые патенты по теме задачи
              </label>
              {labPatents.length === 0 ? (
                <p className="text-[11px] text-[#6B7280] italic">
                  В профиле организации пока нет добавленных патентов. Их можно внести во вкладке «Настройки и Реквизиты».
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {labPatents.map((pat: any, i: number) => {
                    const patLabel = `${pat.number || "Патент"} — ${pat.title || ""}`
                    const isChecked = selectedPatents.includes(patLabel)
                    return (
                      <label
                        key={i}
                        className="flex items-center gap-2 text-xs text-[#111111] p-1.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-lg cursor-pointer hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatents([...selectedPatents, patLabel])
                            } else {
                              setSelectedPatents(selectedPatents.filter((p) => p !== patLabel))
                            }
                          }}
                          className="rounded-xs text-[#F81B00]"
                        />
                        <span className="truncate">{patLabel}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBidModalTask(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingBid}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                {submittingBid ? "Отправка..." : "Отправить отклик"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Accept Bid Dialog */}
      <ConfirmDialog
        open={!!confirmAcceptBid}
        onOpenChange={(open) => !open && setConfirmAcceptBid(null)}
        title="Выбрать лабораторию исполнителем?"
        description={`Вы утверждаете исполнителя «${confirmAcceptBid?.labName}». Будет мгновенно создан активный проект со сметой и открыт чат сделки.`}
        confirmText="Да, утвердить исполнителя"
        onConfirm={() => {
          if (confirmAcceptBid) {
            handleAcceptBid(confirmAcceptBid.taskId, confirmAcceptBid.bidId)
          }
        }}
      />

      {/* AI Technical Spec Assistant Modal */}
      <AiTaskAssistantModal
        open={isAiAssistantOpen}
        onOpenChange={setIsAiAssistantOpen}
        onApplyTz={handleApplyAiTz}
        authFetch={authFetch}
      />

      {/* Counterparty Dossier Modal */}
      <CounterpartyModal
        userId={counterpartyModalId}
        isOpen={!!counterpartyModalId}
        onClose={() => setCounterpartyModalId(null)}
        onOpenChat={() => {
          onNavigateToMessages()
        }}
      />

      {/* View Full Task Modal */}
      <Dialog open={!!viewTaskModal} onOpenChange={(open) => !open && setViewTaskModal(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB]">
                Тендер #{viewTaskModal?.id}
              </Badge>
              <Badge
                variant={viewTaskModal?.status === "open" ? "default" : "secondary"}
                className="text-[10px] font-bold uppercase"
              >
                {viewTaskModal?.status === "open" ? "Открыт сбор заявок" : "Исполнитель выбран"}
              </Badge>
              <span className="text-xs text-[#6B7280] flex items-center gap-1">
                <HiOutlineCalendar className="size-3.5" />
                Срок: {viewTaskModal?.deadline}
              </span>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-[#111111] leading-snug">
              {viewTaskModal?.title}
            </DialogTitle>
            <div className="flex items-center gap-2 pt-1 text-xs text-[#6B7280]">
              <span>Заказчик:</span>
              <button
                type="button"
                onClick={() => {
                  if (viewTaskModal) {
                    setCounterpartyModalId(viewTaskModal.creator_id || viewTaskModal.investor_id || 0)
                  }
                }}
                className="font-bold text-[#111111] hover:text-[#F81B00] hover:underline cursor-pointer flex items-center gap-1"
              >
                {viewTaskModal?.creator_name || viewTaskModal?.investor_name || "Корпоративный заказчик"}
                <span className="text-[10px] text-neutral-400">↗</span>
              </button>
            </div>
          </DialogHeader>

          {/* Full Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
              Полное техническое задание и требования к результатам:
            </span>
            <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
              {viewTaskModal?.description}
            </div>
          </div>

          {/* Budget & Certificate */}
          <div className="p-4 bg-white border border-[#E2E5EB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Максимальный бюджет тендера
              </span>
              <span className="text-lg font-bold text-[#111111] font-mono">
                {Number(viewTaskModal?.budget || 0).toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div>
              <a
                href={`/api/v1/certificates/task/${viewTaskModal?.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] hover:bg-[#F81B00] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <HiOutlineDocumentArrowDown className="size-4" />
                <span>Свидетельство ТЗ (PDF)</span>
              </a>
            </div>
          </div>

          {/* Milestones Connected Chain */}
          <div className="space-y-2">
            <MilestonesChainView
              milestones={viewTaskModal?.milestones || []}
              title="Календарная цепочка этапов ТЗ"
              emptyText="Этапы ТЗ не были предварительно разбиты заказчиком"
            />
          </div>

          {/* Footer actions */}
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#E2E5EB]">
            {(viewTaskModal?.creator_id === user?.id || viewTaskModal?.investor_id === user?.id || user?.is_admin) && (
              <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = viewTaskModal
                    setViewTaskModal(null)
                    if (target) handleOpenEditTask(target)
                  }}
                  className="text-xs font-bold border-[#E2E5EB] rounded-xl hover:border-[#111111] cursor-pointer"
                >
                  <HiOutlinePencilSquare className="size-4 mr-1 text-[#111111]" />
                  Редактировать
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const id = viewTaskModal?.id
                    if (id) setDeletingTaskId(id)
                  }}
                  className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                >
                  <HiOutlineTrash className="size-4 mr-1 text-red-600" />
                  Удалить задачу
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewTaskModal(null)}
              className="text-xs border-[#E2E5EB] rounded-xl cursor-pointer"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={!!editTaskModal} onOpenChange={(open) => !open && setEditTaskModal(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Редактирование R&D-задачи (Тендера)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Измените требования, сроки, бюджет или цепочку этапов выполнения.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTaskEdit} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название задачи
              </label>
              <Input
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Название задачи..."
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Макс. бюджет (₽)
                </label>
                <Input
                  type="number"
                  value={editTaskBudget}
                  onChange={(e) => setEditTaskBudget(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Требуемый дедлайн
                </label>
                <Input
                  value={editTaskDeadline}
                  onChange={(e) => setEditTaskDeadline(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Техническое задание и требования
              </label>
              <textarea
                value={editTaskDesc}
                onChange={(e) => setEditTaskDesc(e.target.value)}
                placeholder="Подробно опишите технические условия..."
                className="w-full h-28 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            {/* Stages Timeline Chain Editor */}
            <MilestonesChainEditor
              milestones={editTaskMilestones}
              onChange={setEditTaskMilestones}
              onSyncBudget={(tot) => setEditTaskBudget(String(tot))}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTaskModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={savingTaskEdit}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs cursor-pointer"
              >
                {savingTaskEdit ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        open={deletingTaskId !== null}
        onOpenChange={(open) => !open && setDeletingTaskId(null)}
        title="Удалить R&D-задачу?"
        description="Вы уверены, что хотите удалить эту задачу? Она будет снята с биржи тендеров. Это действие нельзя отменить."
        confirmText="Да, удалить задачу"
        cancelText="Отмена"
        onConfirm={handleDeleteTask}
        loading={deletingTask}
        variant="destructive"
      />
    </div>
  )
}
