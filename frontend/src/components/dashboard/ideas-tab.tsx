"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineLightBulb,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
  HiOutlinePlusCircle,
  HiOutlineArrowUpRight,
  HiOutlineHeart,
  HiOutlineBuildingLibrary,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlineDocumentArrowDown,
  HiOutlinePencilSquare,
  HiOutlineTrash,
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { CopyButton } from "@/components/ui/copy-button"
import { CardGridSkeleton } from "@/components/ui/skeleton-loader"
import { User } from "@/lib/auth-context"
import { IdeaItem, Project } from "./dashboard-types"
import { CounterpartyModal } from "@/components/profile/counterparty-modal"
import { AiTaskAssistantModal } from "@/components/dashboard/ai-task-assistant-modal"
import { AiMarker } from "@/components/ui/ai-elements"
import { MilestonesChainView, MilestonesChainEditor, MilestoneItemData } from "./milestones-chain"

interface IdeasTabProps {
  user: User | null
  ideas: IdeaItem[]
  projects?: Project[]
  loading: boolean
  onRefresh: () => void
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  onNavigateToProjects: () => void
  onNavigateToMessages: () => void
}

const CATEGORIES = [
  "Все",
  "Новые материалы",
  "Биотехнологии",
  "ИИ и робототехника",
  "Энергетика",
  "Приборостроение",
  "Микроэлектроника",
]

export function IdeasTab({
  user,
  ideas,
  projects = [],
  loading,
  onRefresh,
  authFetch,
  onNavigateToProjects,
  onNavigateToMessages,
}: IdeasTabProps) {
  const { success, error, info } = useToast()
  const isLab = user?.role === "lab"
  const isVerifiedLab = isLab && user?.verification_status === "verified"

  // Internal tab: Lab: "my_tech" | "investor_ideas" | "donations"; Investor: "showcase" | "my_ideas" | "donations"
  const [internalTab, setInternalTab] = React.useState<string>(isLab ? "my_tech" : "showcase")
  const [publishedType, setPublishedType] = React.useState<"lab_tech" | "donation_campaign">("lab_tech")
  const [orderedIdeaIds, setOrderedIdeaIds] = React.useState<number[]>([])

  const userActiveIdeaIds = React.useMemo(() => {
    const set = new Set<number>()
    if (projects) {
      for (const p of projects) {
        if ((p as any).idea_id) {
          set.add(Number((p as any).idea_id))
        }
      }
    }
    for (const id of orderedIdeaIds) {
      set.add(id)
    }
    return set
  }, [projects, orderedIdeaIds])
  const [counterpartyModalId, setCounterpartyModalId] = React.useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState("Все")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTrl, setSelectedTrl] = React.useState<number | null>(null)

  // Lab: Publish Tech Modal
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false)
  const [techTitle, setTechTitle] = React.useState("")
  const [techSummary, setTechSummary] = React.useState("")
  const [techCategory, setTechCategory] = React.useState("Новые материалы")
  const [techTrl, setTechTrl] = React.useState(4)
  const [techBudget, setTechBudget] = React.useState("1200000")
  const [parsingPdf, setParsingPdf] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [milestones, setMilestones] = React.useState([
    { step: 1, title: "Лабораторные испытания и прототип", amount: 400000 },
    { step: 2, title: "Опытно-конструкторская документация", amount: 400000 },
    { step: 3, title: "Полнофункциональный образец", amount: 400000 },
  ])

  // Lab: Proposal on Investor Idea Modal
  const [proposalModal, setProposalModal] = React.useState<IdeaItem | null>(null)
  const [proposedBudget, setProposedBudget] = React.useState("")
  const [proposedTimeline, setProposedTimeline] = React.useState("3 месяца")
  const [proposalMessage, setProposalMessage] = React.useState("")
  const [submittingProposal, setSubmittingProposal] = React.useState(false)

  // Investor: Propose Idea Modal
  const [isNewIdeaModalOpen, setIsNewIdeaModalOpen] = React.useState(false)
  const [investorIdeaTitle, setInvestorIdeaTitle] = React.useState("")
  const [investorIdeaSummary, setInvestorIdeaSummary] = React.useState("")
  const [investorIdeaCategory, setInvestorIdeaCategory] = React.useState("Новые материалы")
  const [investorIdeaBudget, setInvestorIdeaBudget] = React.useState("1500000")
  const [investorIdeaMilestones, setInvestorIdeaMilestones] = React.useState<MilestoneItemData[]>([
    { step: 1, title: "Аналитическое исследование и эскизное проектирование", amount: 450000 },
    { step: 2, title: "Разработка лабораторного образца и стендовые испытания", amount: 600000 },
    { step: 3, title: "Приёмочные испытания и регистрация РИД", amount: 450000 },
  ])
  const [selectedBaseIdeaTitle, setSelectedBaseIdeaTitle] = React.useState<string | null>(null)
  const [publishingIdea, setPublishingIdea] = React.useState(false)

  // Investor: Donation Modal
  const [donationModal, setDonationModal] = React.useState<IdeaItem | null>(null)
  const [donationAmount, setDonationAmount] = React.useState("100000")
  const [submittingDonation, setSubmittingDonation] = React.useState(false)

  // AI TZ Assistant Modal (Каталог разработок)
  const [isAiTzModalOpen, setIsAiTzModalOpen] = React.useState(false)
  const [aiTzInitialTitle, setAiTzInitialTitle] = React.useState("")
  const [aiTzInitialQuery, setAiTzInitialQuery] = React.useState("")
  const [aiTzInitialCategory, setAiTzInitialCategory] = React.useState("Автоопределение")
  const [aiTzTarget, setAiTzTarget] = React.useState<"new_idea" | "standalone">("standalone")

  // View Full Description Modal
  const [viewIdeaModal, setViewIdeaModal] = React.useState<IdeaItem | null>(null)

  // Edit Idea Modal
  const [editIdeaModal, setEditIdeaModal] = React.useState<IdeaItem | null>(null)
  const [editTitle, setEditTitle] = React.useState("")
  const [editSummary, setEditSummary] = React.useState("")
  const [editCategory, setEditCategory] = React.useState("Новые материалы")
  const [editTrl, setEditTrl] = React.useState(4)
  const [editBudget, setEditBudget] = React.useState("1000000")
  const [editMilestones, setEditMilestones] = React.useState<MilestoneItemData[]>([])
  const [savingEdit, setSavingEdit] = React.useState(false)

  // Delete Idea State
  const [deletingIdeaId, setDeletingIdeaId] = React.useState<number | null>(null)
  const [deletingIdea, setDeletingIdea] = React.useState(false)

  const handleOpenEdit = (idea: IdeaItem) => {
    setEditIdeaModal(idea)
    setEditTitle(idea.title)
    setEditSummary(idea.summary)
    setEditCategory(idea.category)
    setEditTrl(idea.trl_level)
    setEditBudget(String(idea.budget_total || 0))
    setEditMilestones(
      (idea.milestones || []).map((m: any, i: number) => ({
        step: m.step || i + 1,
        title: m.title || `Этап ${i + 1}`,
        amount: Number(m.amount) || 0,
      }))
    )
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editIdeaModal) return
    setSavingEdit(true)
    try {
      const res = await authFetch(`/api/v1/ideas/${editIdeaModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          summary: editSummary.trim(),
          category: editCategory,
          trl_level: editTrl,
          budget_total: Number(editBudget) || 0,
          milestones: editMilestones,
        }),
      })
      if (res.ok) {
        success(
          "Заявка на разработку успешно обновлена! Свидетельство депонирования и хеш авторства синхронизированы.",
          "Заявка обновлена"
        )
        const updated = await res.json()
        setEditIdeaModal(null)
        if (viewIdeaModal?.id === editIdeaModal.id) {
          setViewIdeaModal(updated)
        }
        onRefresh()
      } else {
        const data = await res.json()
        error(data.detail || "Ошибка при обновлении заявки", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteIdea = async () => {
    if (!deletingIdeaId) return
    setDeletingIdea(true)
    try {
      const res = await authFetch(`/api/v1/ideas/${deletingIdeaId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        success("Заявка успешно удалена из реестра и каталога платформы.", "Заявка удалена")
        if (viewIdeaModal?.id === deletingIdeaId) {
          setViewIdeaModal(null)
        }
        setDeletingIdeaId(null)
        onRefresh()
      } else {
        const data = await res.json()
        error(data.detail || "Ошибка при удалении заявки", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setDeletingIdea(false)
    }
  }

  // Demo Approve Idea
  const [demoApprovingIdeaId, setDemoApprovingIdeaId] = React.useState<number | null>(null)

  const handleDemoApproveIdea = async (ideaId: number) => {
    setDemoApprovingIdeaId(ideaId)
    try {
      const res = await authFetch(`/api/v1/ideas/${ideaId}/demo-approve`, {
        method: "POST",
      })
      if (res.ok) {
        success("Разработка мгновенно одобрена в демо-режиме и опубликована в каталоге", "Успешно (DEMO)")
        if (viewIdeaModal && viewIdeaModal.id === ideaId) {
          setViewIdeaModal((prev) => (prev ? { ...prev, moderation_status: "approved" } : null))
        }
        onRefresh()
      } else {
        const data = await res.json()
        error(data.detail || "Не удалось одобрить разработку", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка при демо-одобрении", "Ошибка")
    } finally {
      setDemoApprovingIdeaId(null)
    }
  }

  const handleApplyAiTz = (data: {
    title: string
    category?: string
    budget: string
    deadline: string
    description: string
    stages?: { step?: number; title: string; amount?: number }[]
  }) => {
    setInvestorIdeaTitle(data.title)
    if (data.category && CATEGORIES.includes(data.category)) {
      setInvestorIdeaCategory(data.category)
    }
    setInvestorIdeaSummary(data.description)
    if (data.budget) {
      setInvestorIdeaBudget(data.budget)
    }
    if (data.stages && data.stages.length > 0) {
      setInvestorIdeaMilestones(
        data.stages.map((s, i) => ({
          step: s.step || i + 1,
          title: s.title || `Этап ${i + 1}`,
          amount: Number(s.amount) || Math.round(Number(data.budget) / data.stages!.length) || 200000,
        }))
      )
    }
    setIsNewIdeaModalOpen(true)
    success("План и ТЗ сформированы нейросетью и перенесены в форму заявки", "План готов")
  }

  // PDF Parser for Lab
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await authFetch("/api/v1/ai/parse-pdf", {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (res.ok && result.data) {
        const d = result.data
        if (d.title) setTechTitle(d.title)
        if (d.summary) setTechSummary(d.summary)
        if (d.category) setTechCategory(d.category)
        if (d.trl_level) setTechTrl(Number(d.trl_level))
        if (d.budget_total) setTechBudget(String(d.budget_total))
        if (d.milestones && Array.isArray(d.milestones)) {
          setMilestones(
            d.milestones.map((m: any, i: number) => ({
              step: m.step || i + 1,
              title: m.title || `Этап ${i + 1}`,
              amount: Number(m.amount || 300000),
            }))
          )
        }
        success("Статья успешно проанализирована! Данные формы заполнены автоматически.", "ИИ-анализ готов")
      } else {
        error(result.detail || "Не удалось извлечь данные из PDF", "Ошибка парсинга")
      }
    } catch {
      error("Сетевая ошибка при анализе PDF", "Ошибка")
    } finally {
      setParsingPdf(false)
    }
  }

  // Lab Publish Tech
  const handlePublishTech = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isVerifiedLab) {
      error("Публикация разработок доступна только после верификации НИИ", "Требуется верификация")
      return
    }

    setPublishing(true)
    try {
      const res = await authFetch("/api/v1/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: publishedType,
          title: techTitle.trim(),
          summary: techSummary.trim(),
          category: techCategory,
          trl_level: techTrl,
          budget_total: Number(techBudget) || 1000000,
          milestones: publishedType === "donation_campaign" ? [] : milestones,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success(
          publishedType === "donation_campaign"
            ? "Сбор пожертвований на исследование успешно опубликован! Авторство зафиксировано: сформирован цифровой хеш SHA-256."
            : "Разработка успешно отправлена на проверку! Авторство зафиксировано: сформирован цифровой хеш SHA-256 и метка времени.",
          "Хеш авторства зафиксирован"
        )
        setIsPublishModalOpen(false)
        setTechTitle("")
        setTechSummary("")
        onRefresh()
      } else {
        error(data.detail || "Ошибка при публикации разработки", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setPublishing(false)
    }
  }

  // Investor Propose Idea
  const handlePublishInvestorIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    setPublishingIdea(true)
    try {
      const res = await authFetch("/api/v1/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "investor_idea",
          title: investorIdeaTitle.trim(),
          summary: investorIdeaSummary.trim(),
          category: investorIdeaCategory,
          trl_level: 3,
          budget_total: Number(investorIdeaBudget) || 1500000,
          milestones: investorIdeaMilestones,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success("Ваше техническое задание и этапы отправлены на модерацию!", "Заявка создана")
        setIsNewIdeaModalOpen(false)
        setInvestorIdeaTitle("")
        setInvestorIdeaSummary("")
        setSelectedBaseIdeaTitle(null)
        onRefresh()
      } else {
        error(data.detail || "Ошибка при создании идеи", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    } finally {
      setPublishingIdea(false)
    }
  }

  // Lab Send Proposal on Investor Idea
  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposalModal) return

    setSubmittingProposal(true)
    try {
      const res = await authFetch(`/api/v1/ideas/${proposalModal.id}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_budget: Number(proposedBudget) || proposalModal.budget_total,
          proposed_timeline: proposedTimeline,
          proposal_message: proposalMessage.trim(),
          order_type: "rnd_order",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setOrderedIdeaIds((prev) => [...prev, proposalModal.id])
        success("Предложение отправлено заказчику! Создана сделка и открыт чат согласования.", "Предложение отправлено")
        setProposalModal(null)
        setProposalMessage("")
        onRefresh()
        onNavigateToMessages()
      } else {
        error(data?.detail || "Ошибка при отправке предложения", "Ошибка")
      }
    } catch (e: any) {
      error(e?.message || "Сетевая ошибка", "Ошибка")
    } finally {
      setSubmittingProposal(false)
    }
  }

  // Investor Order R&D or Donate
  const handleOrderIdea = async (ideaId: number, isDonation: boolean = false) => {
    try {
      const res = await authFetch(`/api/v1/ideas/${ideaId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_type: isDonation ? "donation" : "rnd_order",
          proposed_budget: isDonation ? Number(donationAmount) : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (isDonation) {
          success(
            "Пожертвование успешно направлено на поддержку научного исследования! Средства зачислены лаборатории.",
            "Пожертвование переведено"
          )
          setDonationModal(null)
          onRefresh()
        } else {
          setOrderedIdeaIds((prev) => [...prev, ideaId])
          success(
            "Сделка по разработке успешно инициирована! Создан проект и открыт диалог с научной лабораторией.",
            "Сделка создана"
          )
          setDonationModal(null)
          onRefresh()
          onNavigateToProjects()
        }
      } else {
        error(data?.detail || "Ошибка оформления сделки", "Ошибка")
      }
    } catch (e: any) {
      error(e?.message || "Сетевая ошибка при оформлении", "Ошибка")
    }
  }

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    if (isLab) {
      if (internalTab === "donations") {
        if (idea.type !== "donation_campaign") return false
      } else if (internalTab === "my_tech") {
        if (idea.author_id !== user?.id || idea.type === "donation_campaign") return false
      } else {
        if (idea.type !== "investor_idea") return false
      }
    } else {
      if (internalTab === "donations") {
        if (idea.type !== "donation_campaign") return false
      } else if (internalTab === "showcase") {
        if (idea.type === "investor_idea" || idea.type === "donation_campaign") return false
      } else {
        if (idea.author_id !== user?.id) return false
      }
    }

    if (selectedCategory !== "Все" && idea.category !== selectedCategory) return false
    if (selectedTrl !== null && idea.trl_level < selectedTrl) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = idea.title.toLowerCase().includes(q)
      const matchSummary = idea.summary.toLowerCase().includes(q)
      if (!matchTitle && !matchSummary) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs and Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            Каталог разработок и идей
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {isLab
              ? "Витрина проверенных научных исследований лабораторий и биржа запросов от бизнеса"
              : "Проверенные разработки российских НИИ и возможность предложить свою задачу ученым"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            onClick={() => {
              setAiTzInitialTitle("")
              setAiTzInitialQuery("")
              setAiTzInitialCategory("Автоопределение")
              setAiTzTarget("standalone")
              setIsAiTzModalOpen(true)
            }}
            variant="outline"
            className="text-xs font-bold border-[#F81B00]/30 hover:border-[#F81B00] bg-[#FFF5F5] hover:bg-[#FFEBEB] text-[#F81B00] rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 h-9 px-3.5"
          >
            <HiOutlineSparkles className="size-4 text-[#F81B00]" />
            <span>План реализации (ИИ)</span>
          </Button>

          {isLab ? (
            <Button
              onClick={() => setIsPublishModalOpen(true)}
              disabled={!isVerifiedLab}
              title={!isVerifiedLab ? "Доступно после верификации НИИ" : ""}
              className={`h-9 px-4 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 ${
                isVerifiedLab
                  ? "bg-[#111111] hover:bg-black text-white cursor-pointer"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              <HiOutlinePlusCircle className="size-4" />
              <span>+ Опубликовать разработку</span>
            </Button>
          ) : (
            <Button
              onClick={() => setIsNewIdeaModalOpen(true)}
              className="h-9 px-4 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <HiOutlinePlusCircle className="size-4" />
              <span>+ Предложить свою идею</span>
            </Button>
          )}
        </div>
      </div>

      {/* Internal Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E2E5EB] pb-3 overflow-x-auto">
        {isLab ? (
          <>
            <button
              onClick={() => setInternalTab("my_tech")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                internalTab === "my_tech"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Мои разработки
            </button>
            <button
              onClick={() => setInternalTab("investor_ideas")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                internalTab === "investor_ideas"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Идеи от бизнеса (поиск заказов)
            </button>
            <button
              onClick={() => setInternalTab("donations")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                internalTab === "donations"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              <HiOutlineHeart className="size-3.5 text-rose-500" />
              <span>Пожертвования на науку</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setInternalTab("showcase")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                internalTab === "showcase"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Витрина разработок НИИ
            </button>
            <button
              onClick={() => setInternalTab("my_ideas")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                internalTab === "my_ideas"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Мои идеи для НИИ
            </button>
            <button
              onClick={() => setInternalTab("donations")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                internalTab === "donations"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              <HiOutlineHeart className="size-3.5 text-rose-500" />
              <span>Пожертвования на науку</span>
            </button>
          </>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <HiOutlineMagnifyingGlass className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по технологиям и отраслям..."
            className="pl-9 h-9 text-xs rounded-xl bg-white border-[#E2E5EB]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#111111] text-white"
                  : "bg-white text-[#4B5563] border border-[#E2E5EB] hover:bg-[#F5F6F8]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading && ideas.length === 0 ? (
        <CardGridSkeleton count={6} />
      ) : filteredIdeas.length === 0 ? (
        <Card className="rounded-2xl border-[#E2E5EB] p-12 text-center space-y-3 bg-white">
          <div className="size-12 rounded-2xl bg-[#F5F6F8] flex items-center justify-center mx-auto text-[#9CA3AF]">
            <HiOutlineLightBulb className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Ничего не найдено</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            {isLab && internalTab === "my_tech"
              ? "Вы пока не опубликовали ни одной научной разработки. Нажмите «+ Опубликовать разработку», чтобы разместить технологию."
              : "По выбранным критериям поиска разработок не найдено. Попробуйте сбросить фильтры."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIdeas.map((idea) => {
            const isAuthor = idea.author_id === user?.id
            const isInvestorIdea = idea.type === "investor_idea"

            const isDonationCampaign = idea.type === "donation_campaign"
            const alreadyOrdered = userActiveIdeaIds.has(idea.id)

            return (
              <Card
                key={idea.id}
                className="rounded-2xl border-[#E2E5EB] p-5 bg-white flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div className="space-y-3">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F81B00] bg-red-50 px-2 py-0.5 rounded-md">
                        {idea.category}
                      </span>
                      {isDonationCampaign && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                          <HiOutlineHeart className="size-3 text-rose-600" />
                          Пожертвование на науку
                        </span>
                      )}
                    </div>
                    {isAuthor ? (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          idea.moderation_status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : idea.moderation_status === "rejected"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {idea.moderation_status === "approved"
                          ? "Одобрено"
                          : idea.moderation_status === "rejected"
                          ? "Отклонено"
                          : "На проверке"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <HiOutlineShieldCheck className="size-3" />
                        НИИ и патенты проверены
                      </span>
                    )}
                  </div>

                  {/* Title & Author */}
                  <div>
                    <h3
                      onClick={() => setViewIdeaModal(idea)}
                      className="text-sm font-bold text-[#111111] line-clamp-2 leading-snug cursor-pointer hover:text-[#F81B00] transition-colors"
                      title="Нажмите, чтобы посмотреть полное описание и этапы"
                    >
                      {idea.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCounterpartyModalId(idea.author_id)
                        }}
                        className="text-[11px] font-semibold text-[#111111] hover:text-[#F81B00] hover:underline truncate cursor-pointer transition-colors"
                        title="Посмотреть карточку организации"
                      >
                        {idea.organization_name || idea.author_name || "Научный центр"}
                        <span className="text-[10px] text-neutral-400 font-normal ml-0.5">↗</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-[#4B5563] line-clamp-3 leading-relaxed">
                    {idea.summary}
                  </p>

                  {/* Rejection comment if rejected and author */}
                  {isAuthor && idea.moderation_status === "rejected" && idea.moderation_comment && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 leading-snug">
                      <strong className="block text-red-700 font-bold mb-0.5">Комментарий модератора:</strong>
                      {idea.moderation_comment}
                    </div>
                  )}

                  {/* TRL, Milestones & Certificate */}
                  <div className="pt-2 border-t border-[#F1F3F5] space-y-2">
                    {isDonationCampaign ? (
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span>Формат: <strong className="text-rose-700">Поддержка науки</strong></span>
                        <span>Цель: <strong className="text-[#111111]">{Number(idea.budget_total || 0).toLocaleString("ru-RU")} ₽</strong></span>
                      </div>
                    ) : !isInvestorIdea && (
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span>Готовность технологии: <strong className="text-[#111111]">{idea.trl_level} из 9</strong></span>
                        <span>Этапов сметы: <strong className="text-[#111111]">{idea.milestones?.length || 3}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-dashed border-[#E2E5EB]">
                      <a
                        href={`/api/v1/certificates/idea/${idea.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#111111] hover:text-[#F81B00] transition-colors"
                        title="Скачать официальное свидетельство о депонировании с QR-кодом"
                      >
                        <HiOutlineDocumentArrowDown className="size-3.5 text-[#F81B00]" />
                        <span>Свидетельство (PDF)</span>
                      </a>
                      {idea.file_hash && (
                        <Link
                          href={`/verify/${idea.file_hash}`}
                          target="_blank"
                          className="font-mono text-[#6B7280] hover:text-[#111111] hover:underline"
                          title="Проверить в публичном реестре"
                        >
                          Реестр ↗
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Budget & Buttons */}
                <div className="pt-4 mt-4 border-t border-[#F1F3F5] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                      {isDonationCampaign
                        ? "Цель пожертвований"
                        : isInvestorIdea
                        ? "Целевой бюджет"
                        : "Оценка сметы"}
                    </span>
                    <span className="text-sm font-bold text-[#111111]">
                      {Number(idea.budget_total || 0).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>

                  {/* Actions Row: Details, Edit, Delete */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewIdeaModal(idea)}
                      className="flex-1 text-[11px] font-bold border-[#E2E5EB] text-[#111111] hover:bg-[#F5F6F8] rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <HiOutlineEye className="size-3.5 text-[#6B7280]" />
                      <span>Подробнее</span>
                    </Button>

                    {(isAuthor || user?.is_admin) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(idea)}
                          className="px-2.5 text-[11px] font-bold border-[#E2E5EB] text-[#111111] hover:border-[#111111] rounded-xl cursor-pointer"
                          title="Редактировать заявку"
                        >
                          <HiOutlinePencilSquare className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingIdeaId(idea.id)}
                          className="px-2.5 text-[11px] font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                          title="Удалить заявку"
                        >
                          <HiOutlineTrash className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Action Buttons based on Role & Donation status */}
                  {isDonationCampaign ? (
                    !isAuthor && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setDonationModal(idea)
                          setDonationAmount("100000")
                        }}
                        className="w-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer h-9"
                      >
                        <HiOutlineHeart className="size-4" />
                        <span>Поддержать исследование (Пожертвовать)</span>
                      </Button>
                    )
                  ) : isLab ? (
                    isInvestorIdea ? (
                      alreadyOrdered ? (
                        <div className="text-center py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
                          <HiOutlineCheck className="size-4" />
                          <span>Предложение уже отправлено</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setProposalModal(idea)
                            setProposedBudget(String(idea.budget_total || ""))
                          }}
                          className="w-full text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
                        >
                          Предложить реализацию от НИИ
                        </Button>
                      )
                    ) : (
                      isAuthor && idea.moderation_status === "rejected" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setTechTitle(idea.title)
                            setTechSummary(idea.summary)
                            setTechCategory(idea.category)
                            setTechTrl(idea.trl_level)
                            setTechBudget(String(idea.budget_total))
                            setIsPublishModalOpen(true)
                          }}
                          className="w-full text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
                        >
                          <HiOutlineArrowPath className="size-3.5 mr-1" />
                          Редактировать и отправить снова
                        </Button>
                      )
                    )
                  ) : (
                    // Investor View
                    !isAuthor && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDonationModal(idea)
                              setDonationAmount("100000")
                            }}
                            className="text-[11px] font-semibold border-[#E2E5EB] text-[#111111] hover:bg-[#F5F6F8] rounded-xl"
                          >
                            <HiOutlineHeart className="size-3.5 mr-1 text-[#F81B00]" />
                            Пожертвовать
                          </Button>
                          {alreadyOrdered ? (
                            <Button
                              size="sm"
                              disabled
                              className="text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed shadow-none"
                            >
                              Заказ уже оформлен
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOrderIdea(idea.id, false)}
                              className="text-[11px] font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
                            >
                              Заказать разработку
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setAiTzInitialTitle(idea.title)
                            setAiTzInitialQuery(`Требуется разработка промышленного решения на базе научной разработки «${idea.title}». Исходное описание: ${idea.summary}`)
                            setAiTzInitialCategory(idea.category)
                            setAiTzTarget("new_idea")
                            setSelectedBaseIdeaTitle(idea.title)
                            setIsAiTzModalOpen(true)
                          }}
                          className="w-full text-[11px] font-semibold border-[#F81B00]/30 hover:border-[#F81B00] bg-[#FFF8F8] hover:bg-[#FFF0F0] text-[#F81B00] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <HiOutlineSparkles className="size-3.5 text-[#F81B00]" />
                          <span>Сформировать план реализации</span>
                        </Button>
                      </div>
                    )
                  )}

                  {/* Demo Moderation Action */}
                  {idea.moderation_status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={demoApprovingIdeaId === idea.id}
                      onClick={() => handleDemoApproveIdea(idea.id)}
                      className="w-full text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl cursor-pointer shadow-2xs mt-2"
                    >
                      <HiOutlineCheckCircle className="size-3.5 mr-1 text-amber-600 shrink-0" />
                      {demoApprovingIdeaId === idea.id ? "Одобрение..." : "demo: одобрить модерацию разработки"}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Lab Publish Tech Modal */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-xl w-[95vw] sm:w-full bg-white rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Публикация научной разработки в каталоге
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Карточка будет проверена модератором. При сохранении формируется цифровой хеш SHA-256 для защиты авторского права.
            </DialogDescription>
          </DialogHeader>

          {/* AI PDF Parser Feature Box with shadcn AI Styling */}
          {parsingPdf ? (
            <div className="my-2 p-3.5 sm:p-4 bg-[#F8FAFC] border border-[#E2E5EB] rounded-2xl shadow-xs animate-in fade-in duration-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-2">
                  <AiMarker variant="primary" size="md" />
                  Анализ научной статьи (PDF)...
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#111111] w-2/3 animate-pulse" />
              </div>
              <p className="text-[11px] text-[#4B5563]">
                Извлечение технологических параметров, расчет уровня TRL и формирование этапов сметы по ГОСТ...
              </p>
            </div>
          ) : (
            <div className="my-2 p-3.5 sm:p-4 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F81B00] flex items-center gap-1.5">
                  <HiOutlineSparkles className="size-4" />
                  Заполнить из научной статьи (PDF)
                </span>
              </div>
              <p className="text-[11px] text-[#4B5563] leading-relaxed">
                Загрузите препринт или статью в PDF. Система автоматически сформирует коммерческое название, выделит отрасль, оценит TRL и разобьёт проект на 3 логических этапа сметы.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-white border border-red-300 hover:bg-red-50 rounded-xl text-xs font-semibold text-[#F81B00] transition-colors">
                  <HiOutlineDocumentText className="size-4 shrink-0" />
                  <span className="truncate">Выбрать файл статьи (PDF)</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={parsingPdf}
                    onChange={handlePdfUpload}
                  />
                </label>
                <a
                  href="/sample_project_spec.pdf"
                  download
                  className="text-[11px] text-[#6B7280] hover:text-[#111111] hover:underline flex items-center gap-1 font-medium"
                >
                  📥 Скачать образец спецификации (PDF)
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handlePublishTech} className="space-y-3.5 pt-2">
            {/* Format Selector: Commercial Deal vs Donation */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-[#111111] uppercase tracking-wider block">
                Формат публикации:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPublishedType("lab_tech")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    publishedType === "lab_tech"
                      ? "border-[#111111] bg-white ring-1 ring-[#111111] shadow-2xs"
                      : "border-[#E2E5EB] bg-white/70 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold text-[#111111] block">Целевой коммерческий заказ</span>
                  <span className="text-[10px] text-[#6B7280] block mt-0.5">
                    НИОКР с поэтапной приёмкой и финансированием через эскроу
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPublishedType("donation_campaign")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    publishedType === "donation_campaign"
                      ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500 shadow-2xs"
                      : "border-[#E2E5EB] bg-white/70 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1 block">
                    <HiOutlineHeart className="size-3.5" />
                    Сбор пожертвований
                  </span>
                  <span className="text-[10px] text-[#6B7280] block mt-0.5">
                    Безвозмездная поддержка исследований без контрактов и деления на этапы
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                {publishedType === "donation_campaign"
                  ? "Название научного исследования для сбора средств"
                  : "Название разработки (понятное бизнесу)"}
              </label>
              <Input
                value={techTitle}
                onChange={(e) => setTechTitle(e.target.value)}
                placeholder={
                  publishedType === "donation_campaign"
                    ? "Например: Исследование квантовых эффектов в сверхпроводниках"
                    : "Например: Композитный сверхпрочный полимер для авиастроения"
                }
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Отрасль</label>
                <select
                  value={techCategory}
                  onChange={(e) => setTechCategory(e.target.value)}
                  className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
                >
                  {CATEGORIES.filter((c) => c !== "Все").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Уровень готовности (шкала: 1–9)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={techTrl}
                  onChange={(e) => setTechTrl(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                {publishedType === "donation_campaign"
                  ? "Описание целей исследования и научной значимости"
                  : "Описание коммерческого потенциала и технологии"}
              </label>
              <textarea
                value={techSummary}
                onChange={(e) => setTechSummary(e.target.value)}
                placeholder={
                  publishedType === "donation_campaign"
                    ? "Опишите научную гипотезу, планируемые эксперименты и на что пойдут пожертвования..."
                    : "Опишите суть решения, преимущества перед аналогами и ожидаемый эффект для заказчика..."
                }
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                {publishedType === "donation_campaign"
                  ? "Целевая сумма пожертвований в рублях"
                  : "Общий бюджет разработки в рублях"}
              </label>
              <Input
                type="number"
                value={techBudget}
                onChange={(e) => setTechBudget(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Stages Timeline Chain Editor only for commercial tech, not donations */}
            {publishedType !== "donation_campaign" ? (
              <MilestonesChainEditor
                milestones={milestones}
                onChange={setMilestones}
                onSyncBudget={(tot) => setTechBudget(String(tot))}
              />
            ) : (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-rose-800">
                  <HiOutlineHeart className="size-4" />
                  Безвозмездное пожертвование на науку
                </span>
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  Пожертвования перечисляются напрямую на развитие исследовательской группы без деления на контрактные этапы сдачи и без коммерческих обязательств перед заказчиком.
                </p>
              </div>
            )}

            {/* Authorship Hash Banner */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-[11px] text-[#4B5563] flex items-center gap-2">
              <HiOutlineShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>
                Авторство фиксируется: формируется цифровой хеш SHA-256 и метка времени в реестре платформы.
              </span>
            </div>

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPublishModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={publishing}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                {publishing
                  ? "Сохранение..."
                  : publishedType === "donation_campaign"
                  ? "Опубликовать сбор пожертвований"
                  : "Опубликовать разработку"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lab Proposal Modal */}
      <Dialog open={!!proposalModal} onOpenChange={(open) => !open && setProposalModal(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Предложить реализацию: {proposalModal?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Отправьте предложение инвестору. Будет создана сделка и открыт прямой диалог с заказчиком.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendProposal} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Предлагаемый бюджет НИОКР (₽)
              </label>
              <Input
                type="number"
                value={proposedBudget}
                onChange={(e) => setProposedBudget(e.target.value)}
                placeholder="1500000"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Ориентировочный срок выполнения
              </label>
              <Input
                value={proposedTimeline}
                onChange={(e) => setProposedTimeline(e.target.value)}
                placeholder="Например: 4 месяца"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Сопроводительное письмо и план работ лаборатории
              </label>
              <textarea
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                placeholder="Опишите опыт лаборатории по данной теме, наличие стендовой базы и ключевые этапы..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProposalModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={submittingProposal}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {submittingProposal ? "Отправка..." : "Отправить предложение"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Investor Propose Idea Modal */}
      <Dialog open={isNewIdeaModalOpen} onOpenChange={setIsNewIdeaModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              {selectedBaseIdeaTitle
                ? `Предложить техническое задание: «${selectedBaseIdeaTitle}»`
                : "Предложить техническую задачу для НИИ"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              {selectedBaseIdeaTitle
                ? "Сформируйте требования и этапы разработки на базе выбранной научной идеи."
                : "Опишите производственную задачу, бюджет и этапы. Проверенные НИИ смогут откликнуться и предложить решения."}
            </DialogDescription>
          </DialogHeader>

          {/* AI Assistance in Draft Modal */}
          <div className="mt-2 p-3 bg-[#FFF5F5] rounded-xl border border-[#F81B00]/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HiOutlineSparkles className="size-4 text-[#F81B00] shrink-0" />
              <span className="text-[11px] text-[#4B5563]">
                Сложно сформулировать? Нейросеть составит ТЗ и этапы по ГОСТ
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAiTzInitialTitle(investorIdeaTitle)
                setAiTzInitialQuery(investorIdeaSummary || investorIdeaTitle)
                setAiTzInitialCategory(investorIdeaCategory)
                setAiTzTarget("new_idea")
                setIsAiTzModalOpen(true)
              }}
              className="text-[11px] font-bold bg-[#F81B00] hover:bg-[#d01700] text-white rounded-lg h-7 px-2.5 shrink-0 shadow-xs cursor-pointer"
            >
              Сформировать план
            </Button>
          </div>

          <form onSubmit={handlePublishInvestorIdea} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название задачи или идеи
              </label>
              <Input
                value={investorIdeaTitle}
                onChange={(e) => setInvestorIdeaTitle(e.target.value)}
                placeholder="Например: Разработка биоразлагаемой упаковки для пищевой промышленности"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">Отрасль</label>
              <select
                value={investorIdeaCategory}
                onChange={(e) => setInvestorIdeaCategory(e.target.value)}
                className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
              >
                {CATEGORIES.filter((c) => c !== "Все").map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Описание проблемы и желаемый результат
              </label>
              <textarea
                value={investorIdeaSummary}
                onChange={(e) => setInvestorIdeaSummary(e.target.value)}
                placeholder="Опишите, какую задачу требуется решить, какие технические ограничения или параметры образцов..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Ориентировочный бюджет финансирования (₽)
              </label>
              <Input
                type="number"
                value={investorIdeaBudget}
                onChange={(e) => setInvestorIdeaBudget(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Stages Timeline Chain Editor */}
            <div className="pt-1">
              <MilestonesChainEditor
                milestones={investorIdeaMilestones}
                onChange={setInvestorIdeaMilestones}
                onSyncBudget={(tot) => setInvestorIdeaBudget(String(tot))}
              />
            </div>

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewIdeaModalOpen(false)
                  setSelectedBaseIdeaTitle(null)
                }}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={publishingIdea}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {publishingIdea ? "Публикация..." : "Опубликовать задачу и этапы"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Investor Donation Modal */}
      <Dialog open={!!donationModal} onOpenChange={(open) => !open && setDonationModal(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] flex items-center gap-2">
              <HiOutlineHeart className="size-5 text-[#F81B00]" />
              Пожертвование на исследование
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Безвозмездная целевая поддержка фундаментальной науки лаборатории «{donationModal?.organization_name || donationModal?.author_name}».
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Сумма пожертвования (₽)
              </label>
              <Input
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
              <div className="flex gap-2 mt-2">
                {[50000, 100000, 300000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDonationAmount(String(amt))}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#F5F6F8] hover:bg-[#E2E5EB] rounded-lg transition-colors cursor-pointer"
                  >
                    +{amt.toLocaleString("ru-RU")} ₽
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-xs text-[#6B7280]">
              Средства будут перечислены на специальный счёт исследования. Вы получите регулярные научные отчёты о целевом расходовании.
            </div>

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDonationModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="button"
                onClick={() => donationModal && handleOrderIdea(donationModal.id, true)}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                Сделать пожертвование
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Counterparty Dossier Modal */}
      <CounterpartyModal
        userId={counterpartyModalId}
        isOpen={!!counterpartyModalId}
        onClose={() => setCounterpartyModalId(null)}
        onOpenChat={() => {
          onNavigateToMessages()
        }}
      />

      {/* AI TZ Assistant Modal (Каталог разработок) */}
      <AiTaskAssistantModal
        open={isAiTzModalOpen}
        onOpenChange={setIsAiTzModalOpen}
        onApplyTz={handleApplyAiTz}
        authFetch={authFetch}
        initialTitle={aiTzInitialTitle}
        initialQuery={aiTzInitialQuery}
        initialCategory={aiTzInitialCategory}
        modalTitle="План реализации НИОКР и генератор ТЗ"
        modalDescription="Формирование календарного плана, этапов сметы и требований по ГОСТ 15.016-2016"
        applyButtonText="Применить в заявку разработки"
      />

      {/* View Full Idea Modal */}
      <Dialog open={!!viewIdeaModal} onOpenChange={(open) => !open && setViewIdeaModal(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] font-bold text-[#F81B00] border-[#F81B00]/30 bg-red-50">
                {viewIdeaModal?.category}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono border-[#E2E5EB]">
                TRL {viewIdeaModal?.trl_level}/9
              </Badge>
              <Badge
                className={`text-[10px] font-bold ${
                  viewIdeaModal?.moderation_status === "approved"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : viewIdeaModal?.moderation_status === "rejected"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {viewIdeaModal?.moderation_status === "approved"
                  ? "Одобрено"
                  : viewIdeaModal?.moderation_status === "rejected"
                  ? "Отклонено"
                  : "На проверке"}
              </Badge>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-[#111111] leading-snug">
              {viewIdeaModal?.title}
            </DialogTitle>
            <div className="flex items-center gap-2 pt-1 text-xs text-[#6B7280]">
              <span>Автор / Правообладатель:</span>
              <button
                type="button"
                onClick={() => {
                  if (viewIdeaModal) setCounterpartyModalId(viewIdeaModal.author_id)
                }}
                className="font-bold text-[#111111] hover:text-[#F81B00] hover:underline cursor-pointer flex items-center gap-1"
              >
                {viewIdeaModal?.organization_name || viewIdeaModal?.author_name || "Научная организация"}
                <span className="text-[10px] text-neutral-400">↗</span>
              </button>
            </div>
          </DialogHeader>

          {/* Full Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider block">
              Полное описание научно-технического решения:
            </span>
            <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
              {viewIdeaModal?.summary}
            </div>
          </div>

          {/* Rejection comment if rejected and author */}
          {viewIdeaModal?.author_id === user?.id && viewIdeaModal?.moderation_status === "rejected" && viewIdeaModal?.moderation_comment && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 leading-snug">
              <strong className="block text-red-700 font-bold mb-1">Замечания модератора:</strong>
              {viewIdeaModal.moderation_comment}
            </div>
          )}

          {/* Budget & Official Certificate */}
          <div className="p-4 bg-white border border-[#E2E5EB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Оценка бюджета разработки
              </span>
              <span className="text-lg font-bold text-[#111111] font-mono">
                {Number(viewIdeaModal?.budget_total || 0).toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/v1/certificates/idea/${viewIdeaModal?.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] hover:bg-[#F81B00] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <HiOutlineDocumentArrowDown className="size-4" />
                <span>Свидетельство РИД (PDF)</span>
              </a>
              {viewIdeaModal?.file_hash && (
                <Link
                  href={`/verify/${viewIdeaModal.file_hash}`}
                  target="_blank"
                  className="px-3.5 py-2 border border-[#E2E5EB] hover:bg-[#F5F6F8] text-xs font-semibold rounded-xl transition-colors font-mono"
                >
                  Реестр ↗
                </Link>
              )}
            </div>
          </div>

          {/* Stages Connected Chain */}
          <div className="space-y-2">
            <MilestonesChainView milestones={viewIdeaModal?.milestones || []} />
          </div>

          {/* Footer actions */}
          <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E2E5EB]">
            {(viewIdeaModal?.author_id === user?.id || user?.is_admin) && (
              <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                {viewIdeaModal?.moderation_status !== "approved" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={demoApprovingIdeaId === viewIdeaModal?.id}
                    onClick={() => {
                      if (viewIdeaModal) handleDemoApproveIdea(viewIdeaModal.id)
                    }}
                    className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl cursor-pointer shadow-xs"
                  >
                    <HiOutlineCheckCircle className="size-4 mr-1 text-white" />
                    {demoApprovingIdeaId === viewIdeaModal?.id ? "Одобрение..." : "demo: одобрить модерацию РИД"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = viewIdeaModal
                    setViewIdeaModal(null)
                    if (target) handleOpenEdit(target)
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
                    const id = viewIdeaModal?.id
                    if (id) {
                      setViewIdeaModal(null)
                      setDeletingIdeaId(id)
                    }
                  }}
                  className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                >
                  <HiOutlineTrash className="size-4 mr-1 text-red-600" />
                  Удалить заявку
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewIdeaModal(null)}
              className="text-xs border-[#E2E5EB] rounded-xl cursor-pointer"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Idea Modal */}
      <Dialog open={!!editIdeaModal} onOpenChange={(open) => !open && setEditIdeaModal(null)}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Редактирование заявки на разработку
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Измените параметры, описание или этапы сметы. При сохранении формируется обновленный криптографический отпечаток.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название разработки
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Название разработки..."
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">Отрасль</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full h-9 border border-[#E2E5EB] bg-white rounded-xl px-2.5 text-xs text-[#111111] outline-hidden"
                >
                  {CATEGORIES.filter((c) => c !== "Все").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111111] block mb-1">
                  Уровень готовности (TRL: 1-9)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={editTrl}
                  onChange={(e) => setEditTrl(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Полное описание технологии
              </label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Подробное описание сути решения, результатов испытаний..."
                className="w-full h-28 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Общий бюджет НИОКР (₽)
              </label>
              <Input
                type="number"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Stages Timeline Chain Editor */}
            <MilestonesChainEditor
              milestones={editMilestones}
              onChange={setEditMilestones}
              onSyncBudget={(tot) => setEditBudget(String(tot))}
            />

            <DialogFooter className="gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditIdeaModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl px-4 cursor-pointer"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs cursor-pointer"
              >
                {savingEdit ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Idea Confirmation Dialog */}
      <ConfirmDialog
        open={deletingIdeaId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingIdeaId(null)
        }}
        title="Удалить заявку на разработку?"
        description="Вы уверены, что хотите удалить эту разработку? Запись будет удалена из каталога и реестра платформы. Это действие необратимо."
        confirmText="Да, удалить заявку"
        cancelText="Отмена"
        onConfirm={handleDeleteIdea}
        loading={deletingIdea}
        variant="destructive"
      />
    </div>
  )
}
