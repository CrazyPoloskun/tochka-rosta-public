"use client"

import * as React from "react"
import {
  HiOutlineFolderOpen,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineArrowDownTray,
  HiOutlineEye,
  HiOutlinePaperClip,
  HiOutlineSparkles,
  HiOutlineExclamationTriangle,
  HiOutlineScale,
  HiOutlineCheck,
  HiOutlineUserGroup,
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
import { CopyButton } from "@/components/ui/copy-button"
import { TableSkeleton } from "@/components/ui/skeleton-loader"
import { SyndicateModal } from "./syndicate-modal"
import { EnableSyndicateModal } from "./enable-syndicate-modal"
import { CounterpartyModal } from "@/components/profile/counterparty-modal"
import { User } from "@/lib/auth-context"
import { Project, ProjectMilestone, ProjectFile } from "./dashboard-types"

interface ProjectsTabProps {
  user: User | null
  projects: Project[]
  loading: boolean
  onRefresh: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  onNavigateToIdeas?: () => void
}

export function ProjectsTab({
  user,
  projects,
  loading,
  onRefresh,
  authFetch,
  onNavigateToIdeas,
}: ProjectsTabProps) {
  const { success, error, info } = useToast()
  const isLab = user?.role === "lab"

  const [expandedProjectId, setExpandedProjectId] = React.useState<number | null>(
    projects.length > 0 ? projects[0].id : null
  )

  // Syndication Modals
  const [userAvailableBalance, setUserAvailableBalance] = React.useState<number>(0)
  const [syndicateModalProject, setSyndicateModalProject] = React.useState<Project | null>(null)
  const [enableSyndicateProject, setEnableSyndicateProject] = React.useState<Project | null>(null)

  React.useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await authFetch("/api/v1/finances/account")
        if (res.ok) {
          const acc = await res.json()
          setUserAvailableBalance(Number(acc.available_balance || 0))
        }
      } catch {
        // ignore
      }
    }
    fetchBalance()
  }, [authFetch, onRefresh])

  // Report Modal (Lab)
  const [reportModal, setReportModal] = React.useState<{
    projectId: number
    milestoneId: number
    title: string
  } | null>(null)
  const [rawReportText, setRawReportText] = React.useState("")
  const [reportFiles, setReportFiles] = React.useState<string[]>([])
  const [submittingReport, setSubmittingReport] = React.useState(false)

  // Report Review Modal (Investor)
  const [viewingReport, setViewingReport] = React.useState<{
    projectId: number
    milestoneId: number
    title: string
    raw: string
    ai: string
    mode: "ai" | "raw"
  } | null>(null)

  // GOST 7.32 Report Modal (Lab)
  const [gostModal, setGostModal] = React.useState<{
    projectId: number
    milestoneId: number
    title: string
  } | null>(null)
  const [gostAbstract, setGostAbstract] = React.useState("")
  const [gostIntro, setGostIntro] = React.useState("")
  const [gostMainResearch, setGostMainResearch] = React.useState("")
  const [gostConclusion, setGostConclusion] = React.useState("")
  const [gostReferences, setGostReferences] = React.useState("")
  const [generatingGost, setGeneratingGost] = React.useState(false)

  // Counterparty Modal State
  const [counterpartyModalId, setCounterpartyModalId] = React.useState<number | null>(null)

  // Dispute Modal
  const [disputeModal, setDisputeModal] = React.useState<{
    projectId: number
    milestoneId: number
    title: string
  } | null>(null)
  const [disputeReason, setDisputeReason] = React.useState("")
  const [submittingDispute, setSubmittingDispute] = React.useState(false)

  // File Viewer
  const [selectedFile, setSelectedFile] = React.useState<ProjectFile | null>(null)
  const [uploadingFile, setUploadingFile] = React.useState(false)
  const [fundingMilestoneId, setFundingMilestoneId] = React.useState<number | null>(null)

  // Confirm approve modal
  const [confirmApprove, setConfirmApprove] = React.useState<{
    projectId: number
    milestoneId: number
  } | null>(null)

  React.useEffect(() => {
    if (projects.length > 0 && !expandedProjectId) {
      setExpandedProjectId(projects[0].id)
    }
  }, [projects, expandedProjectId])

  // Reserve milestone funds (Investor)
  const handleFundMilestone = async (projectId: number, milestoneId: number) => {
    setFundingMilestoneId(milestoneId)
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/milestones/${milestoneId}/fund`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok) {
        success("Средства успешно зарезервированы на эскроу-счёте этапа!", "Резерв сформирован")
        onRefresh()
      } else {
        error(data.detail || "Недостаточно средств на балансе", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при резервировании средств", "Ошибка")
    } finally {
      setFundingMilestoneId(null)
    }
  }

  // Submit milestone report (Lab)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportModal) return
    if (rawReportText.trim().length < 10) {
      error("Введите подробный текст научного отчёта", "Ошибка")
      return
    }

    setSubmittingReport(true)
    try {
      const res = await authFetch(
        `/api/v1/projects/${reportModal.projectId}/milestones/${reportModal.milestoneId}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_report: rawReportText.trim() }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        success(
          "Отчёт успешно отправлен инвестору! ИИ сгенерировал краткую сводку для согласования.",
          "Отчёт сдан"
        )
        setReportModal(null)
        setRawReportText("")
        setReportFiles([])
        onRefresh()
      } else {
        error(data.detail || "Ошибка отправки отчёта", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при сдаче отчёта", "Ошибка")
    } finally {
      setSubmittingReport(false)
    }
  }

  // Approve milestone (Investor)
  const handleApproveMilestone = async (projectId: number, milestoneId: number) => {
    try {
      const res = await authFetch(
        `/api/v1/projects/${projectId}/milestones/${milestoneId}/approve`,
        { method: "POST" }
      )
      const data = await res.json()
      if (res.ok) {
        success("Этап успешно принят! Средства с эскроу-счёта выплачены лаборатории.", "Приёмка завершена")
        setConfirmApprove(null)
        setViewingReport(null)
        onRefresh()
      } else {
        error(data.detail || "Ошибка при приёмке этапа", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  // Open dispute
  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disputeModal || !disputeReason.trim()) return

    setSubmittingDispute(true)
    try {
      const res = await authFetch(
        `/api/v1/projects/${disputeModal.projectId}/milestones/${disputeModal.milestoneId}/dispute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: disputeReason.trim() }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        success(
          "Претензия зафиксирована. Выплата заморожена, администратор платформы подключен к арбитражу.",
          "Спор открыт"
        )
        setDisputeModal(null)
        setDisputeReason("")
        setViewingReport(null)
        onRefresh()
      } else {
        error(data.detail || "Ошибка открытия спора", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingDispute(false)
    }
  }

  // Generate GOST 7.32 Report
  const handleGenerateGostReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gostModal) return
    if (!gostMainResearch.trim()) {
      error("Заполните основную научно-техническую часть отчёта", "Требуются данные")
      return
    }

    setGeneratingGost(true)
    try {
      const res = await authFetch(
        `/api/v1/projects/${gostModal.projectId}/milestones/${gostModal.milestoneId}/generate-gost-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            executors: [],
            abstract_text: gostAbstract.trim(),
            intro_text: gostIntro.trim(),
            main_research_text: gostMainResearch.trim(),
            conclusion_text: gostConclusion.trim(),
            references: gostReferences
              .split("\n")
              .map((r) => r.trim())
              .filter(Boolean),
          }),
        }
      )

      if (res.ok) {
        success("Отчёт по ГОСТ 7.32-2017 успешно сформирован в DOCX и PDF!", "Отчёт готов")
        setGostModal(null)
        setGostAbstract("")
        setGostIntro("")
        setGostMainResearch("")
        setGostConclusion("")
        setGostReferences("")
        onRefresh()
      } else {
        const err = await res.json().catch(() => ({}))
        error(err.detail || "Ошибка при генерации отчёта", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при генерации отчёта", "Ошибка")
    } finally {
      setGeneratingGost(false)
    }
  }

  // Upload project file
  const handleUploadProjectFile = async (projectId: number, file: File) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await authFetch(`/api/v1/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        success(`Файл «${file.name}» успешно прикреплен к сделке`, "Файл загружен")
        onRefresh()
      } else {
        const data = await res.json()
        error(data.detail || "Ошибка загрузки файла", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при загрузке файла", "Ошибка")
    } finally {
      setUploadingFile(false)
    }
  }

  const activeProject = projects.find((p) => p.id === expandedProjectId) || projects[0]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Мои проекты и сделки
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {isLab
              ? "Управление этапами разработки, сдача научной отчётности и приёмка выплат"
              : "Контроль выполнения НИОКР, резервирование средств на эскроу и приёмка результатов"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-white border-[#E2E5EB]">
            Всего проектов: {projects.length}
          </Badge>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : projects.length === 0 ? (
        <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center space-y-3 bg-white">
          <div className="size-12 rounded-2xl bg-[#F5F6F8] flex items-center justify-center mx-auto text-[#9CA3AF]">
            <HiOutlineFolderOpen className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">У вас пока нет активных сделок</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto leading-relaxed">
            {isLab
              ? "Откликайтесь на R&D-задачи инвесторов или публикуйте свои разработки в каталоге, чтобы запускать совместные проекты."
              : "Выберите технологию в каталоге разработок или разместите задачу на бирже, чтобы начать сотрудничество с НИИ."}
          </p>
          {onNavigateToIdeas && (
            <div className="pt-2">
              <Button
                onClick={onNavigateToIdeas}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                Перейти в каталог разработок
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Projects Selector List (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              Список проектов ({projects.length})
            </p>
            <div className="space-y-2">
              {projects.map((p) => {
                const isSelected = p.id === activeProject?.id
                const completedCount = p.milestones.filter((m) => m.status === "approved").length
                return (
                  <button
                    key={p.id}
                    onClick={() => setExpandedProjectId(p.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-white border-[#111111] shadow-sm ring-1 ring-[#111111]"
                        : "bg-white border-[#E2E5EB] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                          #{p.id} • {p.status === "active" ? "В работе" : "Завершён"}
                        </span>
                        {p.is_syndicated && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#F81B00] bg-[#F81B00]/10 px-1.5 py-0.5 rounded-md">
                            <HiOutlineUserGroup className="size-2.5" />
                            Синдикат
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#111111]">
                        {Number(p.total_budget || 0).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#111111] line-clamp-1">{p.title}</h4>
                    <p className="text-[11px] text-[#6B7280] mt-1 truncate">
                      {isLab ? `Инвестор: ${p.investor_name || "Частный инвестор"}` : `НИИ: ${p.lab_name || "Научная лаборатория"}`}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-[#6B7280]">
                      <span>Этапы: {completedCount} из {p.milestones.length}</span>
                      <span className="font-semibold text-[#111111]">
                        {p.milestones.length > 0 ? Math.round((completedCount / p.milestones.length) * 100) : 0}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Project Details (Right 8 cols) */}
          {activeProject && (
            <div className="lg:col-span-8 space-y-6">
              {/* Project Card Header */}
              <Card className="rounded-2xl border-[#E2E5EB] p-5 sm:p-6 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] font-bold border-[#E2E5EB]">
                        Сделка #{activeProject.id}
                      </Badge>
                      <CopyButton text={String(activeProject.id)} label="ID" title="Копировать ID сделки" />
                      <Badge
                        variant={activeProject.status === "active" ? "default" : "secondary"}
                        className="text-[10px] font-bold uppercase"
                      >
                        {activeProject.status === "active" ? "Активный проект" : "Завершён"}
                      </Badge>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-[#111111] leading-snug">
                      {activeProject.title}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-[#6B7280]">
                      <span>{isLab ? "Заказчик сделки:" : "Исполнитель НИОКР:"}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCounterpartyModalId(
                            isLab ? activeProject.investor_id : activeProject.lab_id
                          )
                        }
                        className="font-semibold text-[#111111] hover:text-[#F81B00] hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Посмотреть карточку организации"
                      >
                        {isLab
                          ? activeProject.investor_name || "Инвестор"
                          : activeProject.lab_name || "Научный институт"}
                        <span className="text-[10px] text-neutral-400">↗</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Общий бюджет
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-[#111111] mt-0.5">
                      {Number(activeProject.total_budget || 0).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>

                {/* Синдикация и софинансирование */}
                {activeProject.is_syndicated ? (
                  <div className="p-3.5 bg-[#F5F6F8] rounded-xl border border-[#E2E5EB] space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-[#111111] text-white">
                          <HiOutlineUserGroup className="size-4 text-[#F81B00]" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#111111]">
                              Клубная сделка (Синдикат)
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold ${
                                activeProject.syndication_status === "funded"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : "border-amber-300 bg-amber-50 text-amber-800"
                              }`}
                            >
                              {activeProject.syndication_status === "funded" ? "Цель достигнута" : "Сбор открыт"}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-[#6B7280]">
                            Соинвесторов в пуле: <strong>{activeProject.syndicate_members_count || 1}</strong>
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setSyndicateModalProject(activeProject)}
                        className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs gap-1.5 h-8 px-3.5 cursor-pointer self-start sm:self-auto"
                      >
                        <HiOutlineUserGroup className="size-3.5 text-[#F81B00]" />
                        <span>Cap Table / Соинвестировать</span>
                      </Button>
                    </div>

                    {/* Progress Bar of Syndication */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-[#4B5563]">
                        <span>
                          Собрано на эскроу:{" "}
                          <strong>{Number(activeProject.syndication_total_raised || 0).toLocaleString("ru-RU")} ₽</strong>
                        </span>
                        <span>
                          Цель (Soft Cap):{" "}
                          <strong>
                            {Number(activeProject.syndication_soft_cap || activeProject.total_budget || 0).toLocaleString("ru-RU")} ₽
                          </strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E5EB] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#111111] h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              (activeProject.syndication_soft_cap || activeProject.total_budget || 1) > 0
                                ? ((activeProject.syndication_total_raised || 0) /
                                    (activeProject.syndication_soft_cap || activeProject.total_budget || 1)) *
                                    100
                                : 0
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  activeProject.investor_id === user?.id && activeProject.status === "active" && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <HiOutlineUserGroup className="size-4 text-amber-700 shrink-0" />
                        <span className="text-amber-950">
                          Хотите привлечь партнёров-соинвесторов для разделения сметы и рисков НИОКР?
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEnableSyndicateProject(activeProject)}
                        className="text-xs font-bold border-amber-300 bg-white hover:bg-amber-100 text-amber-900 rounded-xl shrink-0 h-8 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <HiOutlineSparkles className="size-3.5 text-amber-600" />
                        <span>Открыть синдикацию</span>
                      </Button>
                    </div>
                  )
                )}

                {/* Milestones Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-[#F1F3F5]">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#6B7280]">Прогресс выполнения этапов</span>
                    <span className="font-bold text-[#111111]">
                      {activeProject.milestones.filter((m) => m.status === "approved").length} из{" "}
                      {activeProject.milestones.length} сдано
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E5EB] h-2 rounded-full overflow-hidden flex">
                    {activeProject.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className={`h-full border-r border-white/40 transition-all ${
                          m.status === "approved"
                            ? "bg-emerald-500"
                            : m.status === "in_review"
                            ? "bg-blue-500"
                            : m.status === "escrow_funded"
                            ? "bg-amber-400"
                            : m.status === "disputed"
                            ? "bg-red-500"
                            : "bg-slate-200"
                        }`}
                        style={{ width: `${100 / activeProject.milestones.length}%` }}
                      />
                    ))}
                  </div>
                </div>
              </Card>

              {/* Milestones Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                    Этапы выполнения и финансирования
                  </h3>
                  <span className="text-xs text-[#6B7280]">
                    Эскроу-защита каждого этапа
                  </span>
                </div>

                <div className="space-y-3">
                  {activeProject.milestones.map((m, idx) => {
                    const isPendingFunds = m.status === "pending_funds"
                    const isEscrowFunded = m.status === "escrow_funded"
                    const isInReview = m.status === "in_review"
                    const isApproved = m.status === "approved"
                    const isDisputed = m.status === "disputed"

                    return (
                      <Card
                        key={m.id}
                        className={`rounded-2xl p-4 sm:p-5 transition-all bg-white ${
                          isInReview
                            ? "border-blue-300 ring-1 ring-blue-100"
                            : isEscrowFunded
                            ? "border-amber-300"
                            : isApproved
                            ? "border-emerald-200"
                            : isDisputed
                            ? "border-red-300 ring-1 ring-red-100"
                            : "border-[#E2E5EB]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isInReview
                                  ? "bg-blue-100 text-blue-800"
                                  : isEscrowFunded
                                  ? "bg-amber-100 text-amber-800"
                                  : isDisputed
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isApproved ? <HiOutlineCheck className="size-4" /> : m.step_number || idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-[#111111]">{m.title}</h4>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isApproved
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : isInReview
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : isEscrowFunded
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : isDisputed
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-slate-50 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {isApproved
                                    ? "Выполнено и выплачено"
                                    : isInReview
                                    ? "Отчёт на приёмке"
                                    : isEscrowFunded
                                    ? "Средства на эскроу"
                                    : isDisputed
                                    ? "Арбитраж (Спор)"
                                    : "Ожидает резервирования"}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#111111] mt-1">
                                {Number(m.amount).toLocaleString("ru-RU")} ₽
                              </p>
                            </div>
                          </div>

                          {/* Role Actions */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Investor Actions */}
                            {!isLab && (
                              <>
                                {isPendingFunds && (
                                  <Button
                                    size="sm"
                                    disabled={fundingMilestoneId === m.id}
                                    onClick={() => handleFundMilestone(activeProject.id, m.id)}
                                    className="text-xs font-bold bg-[#111111] text-white hover:bg-black rounded-xl"
                                  >
                                    {fundingMilestoneId === m.id ? "Резервирование..." : "Зарезервировать средства"}
                                  </Button>
                                )}
                                {isInReview && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setViewingReport({
                                        projectId: activeProject.id,
                                        milestoneId: m.id,
                                        title: m.title,
                                        raw: m.raw_report || "Текст отчёта не найден",
                                        ai: m.ai_summary || "ИИ-сводка генерируется...",
                                        mode: "ai",
                                      })
                                    }
                                    className="text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
                                  >
                                    <HiOutlineEye className="size-3.5 mr-1" />
                                    Проверить отчёт
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Lab Actions */}
                            {isLab && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {isEscrowFunded && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setGostModal({
                                        projectId: activeProject.id,
                                        milestoneId: m.id,
                                        title: m.title,
                                      })
                                    }
                                    className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
                                  >
                                    <HiOutlineDocumentText className="size-3.5 mr-1" />
                                    Отчёт ГОСТ 7.32 (Сдать этап)
                                  </Button>
                                )}
                                {isInReview && (
                                  <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                    Отчёт на проверке у инвестора
                                  </span>
                                )}
                              </div>
                            )}

                            {/* ГОСТ 7.32 Downloads for Both Parties */}
                            {(m.gost_docx_path || m.gost_pdf_path || m.raw_report) && (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`/api/v1/projects/${activeProject.id}/milestones/${m.id}/gost-download?format=docx`}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#E2E5EB] border border-[#E2E5EB] rounded-lg text-[10px] font-mono text-[#111111] transition-colors"
                                  title="Скачать официальный отчет ГОСТ 7.32 (DOCX)"
                                >
                                  <HiOutlineArrowDownTray className="size-3 text-[#F81B00]" />
                                  <span>DOCX</span>
                                </a>
                                <a
                                  href={`/api/v1/projects/${activeProject.id}/milestones/${m.id}/gost-download?format=pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#E2E5EB] border border-[#E2E5EB] rounded-lg text-[10px] font-mono text-[#111111] transition-colors"
                                  title="Скачать официальный отчет ГОСТ 7.32 (PDF)"
                                >
                                  <HiOutlineArrowDownTray className="size-3 text-[#F81B00]" />
                                  <span>PDF</span>
                                </a>
                              </div>
                            )}

                            {/* Both: View Report if completed */}
                            {isApproved && (m.raw_report || m.ai_summary) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setViewingReport({
                                    projectId: activeProject.id,
                                    milestoneId: m.id,
                                    title: m.title,
                                    raw: m.raw_report || "",
                                    ai: m.ai_summary || "",
                                    mode: "ai",
                                  })
                                }
                                className="text-xs border-[#E2E5EB] text-[#111111] rounded-xl"
                              >
                                Просмотр отчёта
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Project Files Manager */}
              <Card className="rounded-2xl border-[#E2E5EB] p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiOutlinePaperClip className="size-4 text-[#6B7280]" />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#111111]">
                      Файловый менеджер сделки
                    </h3>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F5F6F8] hover:bg-[#E2E5EB] text-[#111111] rounded-xl transition-colors">
                    <span>+ Загрузить документ</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadProjectFile(activeProject.id, file)
                      }}
                      disabled={uploadingFile}
                    />
                  </label>
                </div>

                {!activeProject.files || activeProject.files.length === 0 ? (
                  <p className="text-xs text-[#6B7280] italic">
                    К сделке пока не прикреплены документы (ТЗ, сметы, протоколы испытаний).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeProject.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl hover:border-[#CBD5E1] transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <HiOutlineDocumentText className="size-4 text-[#F81B00] shrink-0" />
                          <span className="text-xs font-medium text-[#111111] truncate">
                            {file.file_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(file)}
                            className="h-7 px-2 text-[10px] text-[#4B5563]"
                          >
                            <HiOutlineEye className="size-3.5" />
                          </Button>
                          <a
                            href={file.file_path}
                            download={file.file_name}
                            className="p-1.5 text-[#6B7280] hover:text-[#111111] transition-colors"
                          >
                            <HiOutlineArrowDownTray className="size-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Lab Report Submission Modal */}
      <Dialog open={!!reportModal} onOpenChange={(open) => !open && setReportModal(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Сдача отчёта по этапу: {reportModal?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Опишите проведённые исследования и результаты. Система автоматически сгенерирует краткую бизнес-сводку для инвестора.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReport} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Научный отчёт и описание результатов (raw_report)
              </label>
              <textarea
                value={rawReportText}
                onChange={(e) => setRawReportText(e.target.value)}
                placeholder="Опишите полученные научные результаты, проведённые испытания, характеристики полученных образцов..."
                className="w-full h-36 border border-[#E2E5EB] rounded-xl p-3 text-xs text-[#111111] focus:ring-1 focus:ring-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-xs text-[#6B7280] flex items-center gap-2">
              <HiOutlineSparkles className="size-4 text-[#F81B00] shrink-0" />
              <span>После отправки ИИ подготовит executive summary для ускоренной приёмки этапа.</span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingReport}
                className="text-xs font-semibold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                {submittingReport ? "Отправка..." : "Отправить отчёт на приёмку"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Investor Report Review Modal */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-[#111111]">
                Приёмка отчёта: {viewingReport?.title}
              </DialogTitle>
              {/* Toggle Mode */}
              <div className="flex bg-[#F5F6F8] p-1 rounded-xl border border-[#E2E5EB]">
                <button
                  type="button"
                  onClick={() => setViewingReport((prev) => prev ? { ...prev, mode: "ai" } : null)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewingReport?.mode === "ai"
                      ? "bg-white text-[#111111] shadow-xs"
                      : "text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  ✨ ИИ-сводка
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReport((prev) => prev ? { ...prev, mode: "raw" } : null)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    viewingReport?.mode === "raw"
                      ? "bg-white text-[#111111] shadow-xs"
                      : "text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Полный научный отчёт
                </button>
              </div>
            </div>
            <DialogDescription className="text-xs text-[#6B7280]">
              Ознакомьтесь с результатами этапа перед подтверждением перевода средств из эскроу.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {viewingReport?.mode === "ai" ? (
              <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl text-xs text-[#111111] space-y-2 leading-relaxed">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F81B00]">
                  <HiOutlineSparkles className="size-4" />
                  <span>Аналитическое резюме для инвестора (AI Summary)</span>
                </div>
                <p className="whitespace-pre-line text-[#262626]">{viewingReport.ai}</p>
              </div>
            ) : (
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl text-xs text-[#111111] max-h-72 overflow-y-auto whitespace-pre-line leading-relaxed font-mono">
                {viewingReport?.raw}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#E2E5EB]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (viewingReport) {
                  setDisputeModal({
                    projectId: viewingReport.projectId,
                    milestoneId: viewingReport.milestoneId,
                    title: viewingReport.title,
                  })
                }
              }}
              className="w-full sm:w-auto text-xs border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium"
            >
              <HiOutlineScale className="size-3.5 mr-1" />
              Открыть спор (Арбитраж)
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingReport(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Закрыть
              </Button>
              {!isLab && (
                <Button
                  type="button"
                  onClick={() => {
                    if (viewingReport) {
                      setConfirmApprove({
                        projectId: viewingReport.projectId,
                        milestoneId: viewingReport.milestoneId,
                      })
                    }
                  }}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  <HiOutlineCheckCircle className="size-4 mr-1" />
                  Подтвердить и перевести средства
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={!!disputeModal} onOpenChange={(open) => !open && setDisputeModal(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <HiOutlineScale className="size-5" />
              Открытие арбитража по этапу
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Средства будут заморожены на эскроу-счёте, а куратор платформы «Точка Роста» проведёт независимую техническую экспертизу.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenDispute} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Суть претензии или несоответствия ТЗ
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Укажите, какие именно требования ТЗ не были выполнены или какие протоколы отсутствуют..."
                className="w-full h-28 border border-[#E2E5EB] rounded-xl p-3 text-xs text-[#111111] focus:ring-1 focus:ring-red-500 outline-hidden resize-none"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisputeModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingDispute}
                className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs"
              >
                {submittingDispute ? "Фиксация..." : "Заморозить и уведомить арбитраж"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Approve Dialog */}
      <ConfirmDialog
        open={!!confirmApprove}
        onOpenChange={(open) => !open && setConfirmApprove(null)}
        title="Подтвердить успешное завершение этапа?"
        description="Средства будут немедленно переведены с эскроу-счёта на расчётный баланс лаборатории. Это действие необратимо."
        confirmText="Да, перевести средства"
        onConfirm={() => {
          if (confirmApprove) {
            handleApproveMilestone(confirmApprove.projectId, confirmApprove.milestoneId)
          }
        }}
      />

      {/* File Viewer Modal */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] truncate">
              {selectedFile?.file_name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Предпросмотр документа сделки
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center space-y-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E5EB] my-2">
            <HiOutlineDocumentText className="size-12 text-[#F81B00] mx-auto" />
            <p className="text-xs font-semibold text-[#111111]">{selectedFile?.file_name}</p>
            <a
              href={selectedFile?.file_path}
              download={selectedFile?.file_name}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
            >
              <HiOutlineArrowDownTray className="size-4" />
              Скачать файл
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Syndicate Modal (Cap Table & Co-investing) */}
      <SyndicateModal
        project={syndicateModalProject}
        open={!!syndicateModalProject}
        onOpenChange={(open) => !open && setSyndicateModalProject(null)}
        onSuccess={() => {
          onRefresh()
        }}
        authFetch={authFetch}
        userAvailableBalance={userAvailableBalance}
        currentUserId={user?.id}
      />

      {/* Enable Syndicate Modal (Lead Investor) */}
      <EnableSyndicateModal
        project={enableSyndicateProject}
        open={!!enableSyndicateProject}
        onOpenChange={(open) => !open && setEnableSyndicateProject(null)}
        onSuccess={() => {
          onRefresh()
        }}
        authFetch={authFetch}
      />

      {/* GOST 7.32 R&D Report Modal (Lab) */}
      <Dialog open={!!gostModal} onOpenChange={(open) => !open && setGostModal(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] flex items-center gap-2">
              <HiOutlineDocumentText className="size-5 text-[#F81B00]" />
              Генератор отчёта о НИОКР по ГОСТ 7.32-2017
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Формирование официального промежуточного отчёта с автоматической вёрсткой титульного листа,
              полей 30/15/20/20 мм, шрифта Times New Roman 14pt и разделов сметы для этапа «{gostModal?.title}».
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerateGostReport} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Реферат этапа
              </label>
              <textarea
                value={gostAbstract}
                onChange={(e) => setGostAbstract(e.target.value)}
                placeholder="Краткая характеристика объекта исследований, цель работы, полученные научно-технические результаты..."
                rows={2}
                className="w-full border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Введение (актуальность и цели этапа)
              </label>
              <textarea
                value={gostIntro}
                onChange={(e) => setGostIntro(e.target.value)}
                placeholder="Цель выполнения этапа, связь с техническим заданием заказчика, оценка современного состояния проблемы..."
                rows={2}
                className="w-full border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Основная научно-техническая часть (описание исследований и результатов) *
              </label>
              <textarea
                value={gostMainResearch}
                onChange={(e) => setGostMainResearch(e.target.value)}
                placeholder="Подробное описание проведенных теоретических и экспериментальных исследований, методик измерений, полученных характеристик образцов и результатов испытаний..."
                rows={6}
                required
                className="w-full border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-y leading-relaxed font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Заключение (соответствие ТЗ и выводы)
              </label>
              <textarea
                value={gostConclusion}
                onChange={(e) => setGostConclusion(e.target.value)}
                placeholder="Краткие выводы по результатам выполненного этапа, подтверждение полноты решения задач ТЗ..."
                rows={2}
                className="w-full border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Список использованных источников и стандартов (по одному на строке)
              </label>
              <textarea
                value={gostReferences}
                onChange={(e) => setGostReferences(e.target.value)}
                placeholder="ГОСТ 15.016-2016. Система разработки и постановки продукции на производство...&#10;Патент РФ № 2741234 C1..."
                rows={2}
                className="w-full border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed font-mono"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGostModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={generatingGost || !gostMainResearch.trim()}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                {generatingGost ? "Вёрстка DOCX и PDF..." : "Сгенерировать отчёт и сдать этап"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Counterparty Dossier Modal */}
      <CounterpartyModal
        userId={counterpartyModalId}
        isOpen={!!counterpartyModalId}
        onClose={() => setCounterpartyModalId(null)}
      />
    </div>
  )
}
