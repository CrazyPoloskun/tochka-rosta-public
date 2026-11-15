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
  HiOutlineBanknotes,
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowRight,
  HiOutlineClipboardDocumentCheck,
  HiXMark,
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
import { TableSkeleton, AiShineSkeleton } from "@/components/ui/skeleton-loader"
import { SyndicateModal } from "./syndicate-modal"
import { EnableSyndicateModal } from "./enable-syndicate-modal"
import { ProfitDistributionModal } from "./profit-distribution-modal"
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

  // Syndication & Profit Modals
  const [userAvailableBalance, setUserAvailableBalance] = React.useState<number>(0)
  const [syndicateModalProject, setSyndicateModalProject] = React.useState<Project | null>(null)
  const [enableSyndicateProject, setEnableSyndicateProject] = React.useState<Project | null>(null)
  const [profitModalProject, setProfitModalProject] = React.useState<Project | null>(null)

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
  const [reportFiles, setReportFiles] = React.useState<{ name: string; url: string; size?: number }[]>([])
  const [uploadingReportFile, setUploadingReportFile] = React.useState(false)
  const reportFileInputRef = React.useRef<HTMLInputElement>(null)
  const [submittingReport, setSubmittingReport] = React.useState(false)

  // File Download Handler
  const [downloadingFile, setDownloadingFile] = React.useState<string | null>(null)
  const handleDownloadFile = async (url: string, filename: string) => {
    setDownloadingFile(url)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      let targetUrl = url
      if (token && !url.includes("token=")) {
        targetUrl += (url.includes("?") ? "&" : "?") + `token=${encodeURIComponent(token)}`
      }

      const res = await authFetch(targetUrl)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Не удалось скачать файл")
      }
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename || "file"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      success(`Файл «${filename}» успешно скачан`, "Загрузка завершена")
    } catch (err: any) {
      error(err.message || "Ошибка при скачивании файла", "Ошибка")
    } finally {
      setDownloadingFile(null)
    }
  }

  // Report Review Modal (Investor & Lab)
  const [viewingReport, setViewingReport] = React.useState<{
    projectId: number
    milestoneId: number
    title: string
    raw: string
    ai?: string
    hasGostDocx?: boolean
    hasGostPdf?: boolean
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

  // Upload attached report files (Lab)
  const handleReportFileUpload = async (files: FileList | null) => {
    if (!files || !reportModal) return
    setUploadingReportFile(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append("file", file)
        const res = await authFetch(`/api/v1/projects/${reportModal.projectId}/files`, {
          method: "POST",
          body: fd,
        })
        if (res.ok) {
          const uploaded = await res.json()
          const fileUrl = `/api/v1/projects/${reportModal.projectId}/files/${uploaded.id}`
          setReportFiles((prev) => [
            ...prev,
            { name: uploaded.file_name || file.name, url: fileUrl, size: uploaded.file_size || file.size },
          ])
          success(`Файл «${file.name}» успешно прикреплён`, "Файл загружен")
        } else {
          error(`Не удалось загрузить файл ${file.name}`, "Ошибка загрузки")
        }
      }
    } catch {
      error("Сетевая ошибка при загрузке файлов", "Ошибка")
    } finally {
      setUploadingReportFile(false)
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
      let finalReportText = rawReportText.trim()
      if (reportFiles.length > 0) {
        finalReportText +=
          "\n\n### Прикреплённые файлы и материалы этапа:\n" +
          reportFiles.map((f) => `- [${f.name}](${f.url})`).join("\n")
      }

      const res = await authFetch(
        `/api/v1/projects/${reportModal.projectId}/milestones/${reportModal.milestoneId}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_report: finalReportText }),
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

  const activeProject = projects.find((p) => p.id === expandedProjectId) || projects[0]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Мои проекты и сделки
          </h1>
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
                const completedCount = p.milestones.filter((m) => m.status === "completed" || m.status === "approved").length
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
                            Соинвестиции
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

                {/* Коллективное соинвестирование */}
                {activeProject.is_syndicated ? (
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E5EB] space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-[#111111] text-white">
                          <HiOutlineUserGroup className="size-5 text-[#F81B00]" />
                        </span>
                        <div>
                          <span className="text-sm font-bold text-[#111111] block">
                            Коллективное соинвестирование
                          </span>
                          <span className="text-xs text-[#6B7280]">
                            Участников соинвестирования: <strong>{activeProject.syndicate_members_count || 1}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        <Button
                          size="sm"
                          onClick={() => setSyndicateModalProject(activeProject)}
                          className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs gap-1.5 h-9 px-4 cursor-pointer"
                        >
                          <HiOutlineUserGroup className="size-4 text-[#F81B00]" />
                          <span>
                            {activeProject.investor_id === user?.id
                              ? "Реестр долей участников"
                              : "Соинвестировать в проект"}
                          </span>
                        </Button>

                        {(activeProject.lab_id === user?.id || user?.is_admin) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setProfitModalProject(activeProject)}
                            className="text-xs font-bold border-[#E2E5EB] bg-white hover:bg-[#F5F6F8] text-[#111111] rounded-xl shadow-xs gap-1.5 h-9 px-3.5 cursor-pointer"
                            title="Выплатить прибыль соинвесторам пропорционально долям"
                          >
                            <HiOutlineBanknotes className="size-4 text-emerald-600" />
                            <span>Распределить прибыль</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            window.location.href = `/dashboard?tab=messages`
                          }}
                          className="text-xs font-semibold text-[#4B5563] hover:text-[#111111] h-9 px-3 rounded-xl gap-1"
                          title="Открыть групповой чат проекта"
                        >
                          <HiOutlineChatBubbleLeftRight className="size-4 text-[#6B7280]" />
                          <span>Чат</span>
                        </Button>
                      </div>
                    </div>

                    {/* Большие ключевые финансовые показатели */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                      <div className="bg-white p-3.5 rounded-xl border border-[#E2E5EB] shadow-2xs">
                        <span className="text-xs font-medium text-[#6B7280] block">Собрано на эскроу-счёте</span>
                        <span className="text-xl sm:text-2xl font-black text-[#111111] font-mono tracking-tight block mt-0.5">
                          {Number(activeProject.syndication_total_raised || 0).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-[#E2E5EB] shadow-2xs">
                        <span className="text-xs font-medium text-[#6B7280] block">Целевой объём финансирования</span>
                        <span className="text-xl sm:text-2xl font-black text-[#111111] font-mono tracking-tight block mt-0.5">
                          {Number(activeProject.syndication_soft_cap || activeProject.total_budget || 0).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Syndication */}
                    <div className="space-y-1 pt-1">
                      <div className="w-full bg-[#E2E5EB] h-2.5 rounded-full overflow-hidden">
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

                    {/* Proportional Shares Summary Quick Bar */}
                    <div className="pt-2 border-t border-[#E2E5EB]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#6B7280]">
                        <HiOutlineSparkles className="size-3.5 text-[#F81B00]" />
                        <span>
                          Доли участников и прибыль начисляются автоматически пропорционально внесённому объёму
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSyndicateModalProject(activeProject)}
                        className="text-xs font-semibold text-[#111111] hover:text-[#F81B00] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Сводка долей участников</span>
                        <HiOutlineArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  activeProject.investor_id === user?.id && activeProject.status === "active" && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <HiOutlineUserGroup className="size-4 text-blue-700 shrink-0" />
                        <span className="text-blue-950 font-medium">
                          Хотите привлечь партнёров-соинвесторов для разделения сметы и рисков НИОКР?
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setEnableSyndicateProject(activeProject)}
                        className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0 h-8 gap-1.5 cursor-pointer shadow-xs border-0 px-3.5"
                      >
                        <HiOutlineSparkles className="size-3.5 text-blue-100" />
                        <span>Открыть соинвестирование</span>
                      </Button>
                    </div>
                  )
                )}

                {/* Milestones Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-[#F1F3F5]">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#6B7280]">Прогресс выполнения этапов</span>
                    <span className="font-bold text-[#111111]">
                      {activeProject.milestones.filter((m) => m.status === "completed" || m.status === "approved").length} из{" "}
                      {activeProject.milestones.length} сдано
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E5EB] h-2 rounded-full overflow-hidden flex">
                    {activeProject.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className={`h-full border-r border-white/40 transition-all ${
                          m.status === "completed" || m.status === "approved"
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

                <div className="relative pl-8 space-y-4">
                  {/* Continuous vertical timeline chain line connecting all stages */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#F81B00] via-[#E2E5EB] to-[#E2E5EB]" />

                  {activeProject.milestones.map((m, idx) => {
                    const isPendingFunds = m.status === "pending_funds"
                    const isEscrowFunded = m.status === "escrow_funded"
                    const isInReview = m.status === "in_review"
                    const isCompleted = m.status === "completed" || m.status === "approved"
                    const isDisputed = m.status === "disputed"

                    return (
                      <div key={m.id} className="relative flex items-start gap-3 group">
                        {/* Connected Step Node on Chain Line */}
                        <div
                          className={`absolute -left-8 size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 border-2 transition-all duration-200 group-hover:scale-110 ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/40 ring-4 ring-emerald-100/90"
                              : isInReview
                              ? "bg-blue-500 border-white text-white animate-pulse shadow-md shadow-blue-500/30 ring-4 ring-blue-100"
                              : isEscrowFunded
                              ? "bg-amber-500 border-white text-white shadow-xs"
                              : isDisputed
                              ? "bg-red-500 border-white text-white shadow-xs ring-4 ring-red-100"
                              : "bg-white border-[#E2E5EB] text-slate-700 shadow-xs"
                          }`}
                        >
                          {isCompleted ? <HiOutlineCheck className="size-4.5 stroke-[2.5] text-white" /> : m.step_number || idx + 1}
                        </div>

                        {/* Milestone Card */}
                        <Card
                          className={`flex-1 rounded-2xl p-4 sm:p-5 transition-all bg-white shadow-2xs ${
                            isCompleted
                              ? "border-emerald-300 ring-1 ring-emerald-100/70"
                              : isInReview
                              ? "border-blue-300 ring-1 ring-blue-100"
                              : isEscrowFunded
                              ? "border-amber-300"
                              : isDisputed
                              ? "border-red-300 ring-1 ring-red-100"
                              : "border-[#E2E5EB]"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-[#111111]">{m.title}</h4>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                    isCompleted
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
                                  {isCompleted && <HiOutlineCheck className="size-3 text-emerald-600 stroke-[2.5]" />}
                                  {isCompleted
                                    ? "Этап завершен"
                                    : isInReview
                                    ? "Отчёт на приёмке"
                                    : isEscrowFunded
                                    ? "Средства на эскроу"
                                    : isDisputed
                                    ? "Арбитражный спор"
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
                                        ai: m.ai_summary || "",
                                        hasGostDocx: !!m.gost_docx_path,
                                        hasGostPdf: !!m.gost_pdf_path,
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
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setReportModal({
                                          projectId: activeProject.id,
                                          milestoneId: m.id,
                                          title: m.title,
                                        })
                                        setRawReportText("")
                                        setReportFiles([])
                                      }}
                                      className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
                                    >
                                      <HiOutlinePaperClip className="size-3.5 mr-1 text-[#F81B00]" />
                                      Сдать отчёт с файлами
                                    </Button>
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
                                      Отчёт ГОСТ 7.32
                                    </Button>
                                  </>
                                )}
                                {isInReview && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                      Отчёт на проверке у инвестора
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setViewingReport({
                                          projectId: activeProject.id,
                                          milestoneId: m.id,
                                          title: m.title,
                                          raw: m.raw_report || "Текст отчёта не найден",
                                          ai: m.ai_summary || "",
                                          hasGostDocx: !!m.gost_docx_path,
                                          hasGostPdf: !!m.gost_pdf_path,
                                        })
                                      }
                                      className="text-xs font-bold border-[#E2E5EB] text-[#111111] hover:bg-[#F5F6F8] rounded-xl cursor-pointer"
                                    >
                                      <HiOutlineEye className="size-3.5 mr-1 text-[#F81B00]" />
                                      Смотреть мой отчёт
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ГОСТ 7.32 Downloads for Both Parties */}
                            {(m.gost_docx_path || m.gost_pdf_path || m.raw_report) && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadFile(
                                      `/api/v1/projects/${activeProject.id}/milestones/${m.id}/gost-download?format=docx`,
                                      `ГОСТ_7.32_Проект_${activeProject.id}_Этап_${m.step_number}.docx`
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#E2E5EB] border border-[#E2E5EB] rounded-lg text-[10px] font-mono text-[#111111] transition-colors cursor-pointer"
                                  title="Скачать официальный отчет ГОСТ 7.32 (DOCX)"
                                >
                                  <HiOutlineArrowDownTray className="size-3 text-[#F81B00]" />
                                  <span>DOCX</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadFile(
                                      `/api/v1/projects/${activeProject.id}/milestones/${m.id}/gost-download?format=pdf`,
                                      `ГОСТ_7.32_Проект_${activeProject.id}_Этап_${m.step_number}.pdf`
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F6F8] hover:bg-[#E2E5EB] border border-[#E2E5EB] rounded-lg text-[10px] font-mono text-[#111111] transition-colors cursor-pointer"
                                  title="Скачать официальный отчет ГОСТ 7.32 (PDF)"
                                >
                                  <HiOutlineArrowDownTray className="size-3 text-[#F81B00]" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}

                            {/* Both: View Report if completed or report already submitted */}
                            {(isCompleted || m.raw_report || m.ai_summary) && !isInReview && (
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
                                    hasGostDocx: !!m.gost_docx_path,
                                    hasGostPdf: !!m.gost_pdf_path,
                                  })
                                }
                                className="text-xs border-[#E2E5EB] text-[#111111] rounded-xl cursor-pointer hover:bg-[#F5F6F8]"
                              >
                                <HiOutlineEye className="size-3.5 mr-1" />
                                {isLab ? "Посмотреть мой отчёт" : "Просмотр отчёта"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )
                })}
              </div>
              </div>
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
                Научный отчёт и описание результатов (raw_report) *
              </label>
              <textarea
                value={rawReportText}
                onChange={(e) => setRawReportText(e.target.value)}
                placeholder="Опишите полученные научные результаты, проведённые испытания, характеристики полученных образцов..."
                className="w-full h-32 border border-[#E2E5EB] rounded-xl p-3 text-xs text-[#111111] focus:ring-1 focus:ring-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            {/* Блок прикрепления файлов */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                  <HiOutlinePaperClip className="size-4 text-[#F81B00]" />
                  <span>Прикреплённые файлы и материалы</span>
                </label>
                <input
                  ref={reportFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleReportFileUpload(e.target.files)
                    e.target.value = ""
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingReportFile}
                  onClick={() => reportFileInputRef.current?.click()}
                  className="h-7 text-[11px] font-bold border-[#E2E5EB] rounded-lg gap-1.5 cursor-pointer hover:bg-[#F5F6F8]"
                >
                  <HiOutlinePaperClip className="size-3.5" />
                  <span>{uploadingReportFile ? "Загрузка..." : "Прикрепить файлы"}</span>
                </Button>
              </div>

              {reportFiles.length > 0 ? (
                <div className="space-y-1.5 p-2.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl max-h-36 overflow-y-auto">
                  {reportFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-1.5 bg-white border border-[#E2E5EB] rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <HiOutlineDocumentText className="size-4 text-[#F81B00] shrink-0" />
                        <span className="font-medium text-[#111111] truncate">{f.name}</span>
                        {f.size && (
                          <span className="text-[10px] text-[#6B7280] font-mono shrink-0">
                            ({Math.round(f.size / 1024)} КБ)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[#6B7280] hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Удалить файл"
                      >
                        <HiXMark className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => reportFileInputRef.current?.click()}
                  className="p-3 border border-dashed border-[#D1D5DB] rounded-xl text-center bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                >
                  <p className="text-[11px] text-[#6B7280]">
                    Нажмите, чтобы прикрепить PDF, DOCX, таблицы измерений, протоколы стендовых тестов или архивы
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-xs text-[#6B7280] flex items-center gap-2">
              <HiOutlineSparkles className="size-4 text-[#F81B00] shrink-0" />
              <span>После отправки нейросеть подготовит executive summary для ускоренной приёмки этапа инвестором.</span>
            </div>

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReportModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingReport || uploadingReportFile}
                className="text-xs font-semibold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs cursor-pointer"
              >
                {submittingReport ? "Отправка..." : "Отправить отчёт на приёмку"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Review Modal (Investor & Lab) */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Научный отчёт: {viewingReport?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              {isLab
                ? "Официальные материалы сдачи этапа и полный исходный текст отчёта."
                : "Ознакомьтесь с прикреплёнными файлами и исходным текстом этапа перед приёмкой."}
            </DialogDescription>
          </DialogHeader>

          {/* Files & Source Content */}
          <div className="py-3 space-y-4">
            {/* Download Attached Files */}
            {(() => {
              if (!viewingReport) return null
              const fileList: { name: string; url: string }[] = []

              if (viewingReport.hasGostDocx) {
                fileList.push({
                  name: `Отчёт_ГОСТ_7.32_${viewingReport.title}.docx`,
                  url: `/api/v1/projects/${viewingReport.projectId}/milestones/${viewingReport.milestoneId}/gost-download?format=docx`,
                })
              }
              if (viewingReport.hasGostPdf) {
                fileList.push({
                  name: `Отчёт_ГОСТ_7.32_${viewingReport.title}.pdf`,
                  url: `/api/v1/projects/${viewingReport.projectId}/milestones/${viewingReport.milestoneId}/gost-download?format=pdf`,
                })
              }

              if (viewingReport.raw) {
                const fileRegex = /\[([^\]]+)\]\(([^)]+)\)/g
                let match
                while ((match = fileRegex.exec(viewingReport.raw)) !== null) {
                  const fName = match[1]
                  const fUrl = match[2]
                  if (!fileList.some((item) => item.url === fUrl)) {
                    fileList.push({ name: fName, url: fUrl })
                  }
                }
              }

              if (fileList.length === 0) {
                return (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <HiOutlineDocumentText className="size-4 shrink-0 text-amber-600" />
                    <span>Файлы к этапу не прикреплены. Ниже представлен полный исходный научно-технический текст сдачи.</span>
                  </div>
                )
              }

              return (
                <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlinePaperClip className="size-4 text-blue-600" />
                      <span>Прикреплённые файлы и материалы этапа:</span>
                    </span>
                    <span className="text-[11px] text-blue-700 font-semibold bg-blue-100 px-2.5 py-0.5 rounded-full">
                      {fileList.length} {fileList.length === 1 ? "файл" : "файла(ов)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {fileList.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDownloadFile(file.url, file.name)}
                        disabled={downloadingFile === file.url}
                        className="flex items-center justify-between gap-3 p-3 bg-white hover:bg-blue-50/70 border border-blue-200/90 hover:border-blue-400 rounded-xl transition-all shadow-xs group text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            <HiOutlineArrowDownTray className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#111111] truncate group-hover:text-blue-700">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-[#6B7280]">
                              {downloadingFile === file.url ? "Скачивание..." : "Нажмите для скачивания"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
                          Скачать
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Complete Source Text directly beneath files */}
            {(() => {
              if (!viewingReport?.raw) return null
              let cleanText = viewingReport.raw
              const attachmentIdx = cleanText.indexOf("\n\n### Прикреплённые файлы и материалы этапа:")
              if (attachmentIdx !== -1) {
                cleanText = cleanText.substring(0, attachmentIdx).trim()
              }
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlineDocumentText className="size-3.5 text-[#F81B00]" />
                      <span>Полный исходник отчёта:</span>
                    </span>
                    <CopyButton text={cleanText} />
                  </div>
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl text-xs text-[#1E293B] max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono shadow-inner select-text">
                    {cleanText}
                  </div>
                </div>
              )
            })()}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#E2E5EB]">
            {!isLab ? (
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
                className="w-full sm:w-auto text-xs border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium cursor-pointer"
              >
                <HiOutlineScale className="size-3.5 mr-1" />
                Передать на арбитраж
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingReport(null)}
                className="text-xs border-[#E2E5EB] rounded-xl cursor-pointer"
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
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
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

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisputeModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
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

      {/* Модальное окно коллективного соинвестирования */}
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

      {/* Profit Distribution Modal (Lab / Admin) */}
      <ProfitDistributionModal
        project={profitModalProject}
        open={!!profitModalProject}
        onOpenChange={(open) => !open && setProfitModalProject(null)}
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

          {generatingGost ? (
            <div className="py-4 space-y-4">
              <AiShineSkeleton
                title="Нейросетевая вёрстка отчёта по ГОСТ 7.32-2017"
                subtitle="Формирование нормативной структуры документа, таблиц сметы, реферата и компиляция файлов DOCX и PDF"
              />
              <p className="text-center text-xs text-[#6B7280]">Пожалуйста, подождите. Это может занять несколько секунд...</p>
            </div>
          ) : (
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

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGostModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
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
          )}
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
