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
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlineDocumentArrowDown,
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
import { CopyButton } from "@/components/ui/copy-button"
import { CardGridSkeleton } from "@/components/ui/skeleton-loader"
import { User } from "@/lib/auth-context"
import { IdeaItem } from "./dashboard-types"
import { CounterpartyModal } from "@/components/profile/counterparty-modal"

interface IdeasTabProps {
  user: User | null
  ideas: IdeaItem[]
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
  loading,
  onRefresh,
  authFetch,
  onNavigateToProjects,
  onNavigateToMessages,
}: IdeasTabProps) {
  const { success, error, info } = useToast()
  const isLab = user?.role === "lab"
  const isVerifiedLab = isLab && user?.verification_status === "verified"

  // Internal tab: Lab: "my_tech" | "investor_ideas"; Investor: "showcase" | "my_ideas"
  const [internalTab, setInternalTab] = React.useState<string>(isLab ? "my_tech" : "showcase")
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
  const [publishingIdea, setPublishingIdea] = React.useState(false)

  // Investor: Donation Modal
  const [donationModal, setDonationModal] = React.useState<IdeaItem | null>(null)
  const [donationAmount, setDonationAmount] = React.useState("100000")
  const [submittingDonation, setSubmittingDonation] = React.useState(false)

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
          type: "lab_tech",
          title: techTitle.trim(),
          summary: techSummary.trim(),
          category: techCategory,
          trl_level: techTrl,
          budget_total: Number(techBudget) || 1000000,
          milestones: milestones,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success(
          "Разработка успешно отправлена на проверку! Авторство зафиксировано: сформирован цифровой хеш SHA-256 и метка времени.",
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
          milestones: [],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        success("Ваша идея отправлена на проверку! Скоро лаборатории смогут предложить свои решения.", "Идея создана")
        setIsNewIdeaModalOpen(false)
        setInvestorIdeaTitle("")
        setInvestorIdeaSummary("")
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
      const data = await res.json()
      if (res.ok) {
        success("Предложение отправлено инвестору! Создана сделка и открыт чат согласования.", "Предложение отправлено")
        setProposalModal(null)
        setProposalMessage("")
        onRefresh()
        onNavigateToMessages()
      } else {
        error(data.detail || "Ошибка при отправке предложения", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
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
      const data = await res.json()
      if (res.ok) {
        success(
          isDonation
            ? "Пожертвование успешно сформировано! Чат с научной группой открыт."
            : "R&D-сделка успешно инициирована! Создан проект и открыт диалог с НИИ.",
          "Сделка создана"
        )
        setDonationModal(null)
        onRefresh()
        onNavigateToProjects()
      } else {
        error(data.detail || "Ошибка оформления сделки", "Ошибка")
      }
    } catch {
      error("Сетевая ошибка", "Ошибка")
    }
  }

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    if (isLab) {
      if (internalTab === "my_tech") {
        if (idea.author_id !== user?.id) return false
      } else {
        if (idea.type !== "investor_idea") return false
      }
    } else {
      if (internalTab === "showcase") {
        if (idea.type === "investor_idea" && idea.author_id !== user?.id) return false
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

        {/* Action Button */}
        <div>
          {isLab ? (
            <Button
              onClick={() => setIsPublishModalOpen(true)}
              disabled={!isVerifiedLab}
              title={!isVerifiedLab ? "Доступно после верификации НИИ" : ""}
              className={`text-xs font-bold rounded-xl shadow-xs ${
                isVerifiedLab
                  ? "bg-[#F81B00] hover:bg-[#e01800] text-white cursor-pointer"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              <HiOutlinePlusCircle className="size-4 mr-1.5" />
              + Опубликовать разработку
            </Button>
          ) : (
            <Button
              onClick={() => setIsNewIdeaModalOpen(true)}
              className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer"
            >
              <HiOutlinePlusCircle className="size-4 mr-1.5" />
              + Предложить свою идею
            </Button>
          )}
        </div>
      </div>

      {/* Internal Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E2E5EB] pb-3">
        {isLab ? (
          <>
            <button
              onClick={() => setInternalTab("my_tech")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                internalTab === "my_tech"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Мои разработки
            </button>
            <button
              onClick={() => setInternalTab("investor_ideas")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                internalTab === "investor_ideas"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Идеи от инвесторов (поиск заказов)
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setInternalTab("showcase")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                internalTab === "showcase"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Витрина разработок НИИ
            </button>
            <button
              onClick={() => setInternalTab("my_ideas")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                internalTab === "my_ideas"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F5F6F8]"
              }`}
            >
              Мои идеи для НИИ
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

            return (
              <Card
                key={idea.id}
                className="rounded-2xl border-[#E2E5EB] p-5 bg-white flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div className="space-y-3">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#F81B00] bg-red-50 px-2 py-0.5 rounded-md">
                      {idea.category}
                    </span>
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
                    <h3 className="text-sm font-bold text-[#111111] line-clamp-2 leading-snug">
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
                    {!isInvestorIdea && (
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                        <span>Готовность: <strong className="text-[#111111]">TRL {idea.trl_level}/9</strong></span>
                        <span>Этапов сметы: <strong className="text-[#111111]">{idea.milestones?.length || 3}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-dashed border-[#E2E5EB]">
                      <a
                        href={`/api/v1/certificates/idea/${idea.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#111111] hover:text-[#F81B00] transition-colors"
                        title="Скачать официальное свидетельство о депонировании РИД с QR-кодом"
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
                      {isInvestorIdea ? "Целевой бюджет" : "Оценка НИОКР"}
                    </span>
                    <span className="text-sm font-bold text-[#111111]">
                      {Number(idea.budget_total || 0).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>

                  {/* Action Buttons based on Role */}
                  {isLab ? (
                    isInvestorIdea ? (
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
                        <Button
                          size="sm"
                          onClick={() => handleOrderIdea(idea.id, false)}
                          className="text-[11px] font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
                        >
                          Заказать R&D
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Lab Publish Tech Modal */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Публикация научной разработки в каталоге
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Карточка будет проверена модератором. При сохранении формируется цифровой хеш SHA-256 для защиты авторского права.
            </DialogDescription>
          </DialogHeader>

          {/* AI PDF Parser Feature Box */}
          <div className="my-2 p-4 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F81B00] flex items-center gap-1.5">
                <HiOutlineSparkles className="size-4" />
                Заполнить из научной статьи (PDF)
              </span>
              {parsingPdf && (
                <span className="text-[10px] font-semibold text-[#F81B00] animate-pulse">
                  ИИ анализирует структуру статьи...
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#4B5563] leading-relaxed">
              Загрузите препринт или статью в PDF. ИИ автоматически сформирует коммерческое название, выделит отрасль, оценит TRL и разобьёт проект на 3 логических этапа сметы.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-red-300 hover:bg-red-50 rounded-xl text-xs font-semibold text-[#F81B00] transition-colors">
                <HiOutlineDocumentText className="size-4" />
                <span>{parsingPdf ? "Идёт обработка PDF..." : "Выбрать файл статьи (PDF)"}</span>
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

          <form onSubmit={handlePublishTech} className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Название разработки (понятное бизнесу)
              </label>
              <Input
                value={techTitle}
                onChange={(e) => setTechTitle(e.target.value)}
                placeholder="Например: Композитный сверхпрочный полимер для авиастроения"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  Уровень готовности (TRL: 1–9)
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
                Описание коммерческого потенциала и технологии
              </label>
              <textarea
                value={techSummary}
                onChange={(e) => setTechSummary(e.target.value)}
                placeholder="Опишите суть решения, преимущества перед аналогами и ожидаемый эффект для заказчика..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-2.5 text-xs text-[#111111] outline-hidden resize-none leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111111] block mb-1">
                Общий бюджет НИОКР (₽)
              </label>
              <Input
                type="number"
                value={techBudget}
                onChange={(e) => setTechBudget(e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Authorship Hash Banner */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl text-[11px] text-[#4B5563] flex items-center gap-2">
              <HiOutlineShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>
                Авторство фиксируется: формируется цифровой хеш SHA-256 и метка времени в блокчейне сделок платформы.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPublishModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={publishing}
                className="text-xs font-bold bg-[#F81B00] hover:bg-[#e01800] text-white rounded-xl shadow-xs"
              >
                {publishing ? "Сохранение..." : "Опубликовать разработку"}
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

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProposalModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
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
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111]">
              Предложить технологическую задачу для НИИ
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Опишите производственную задачу или идею. Проверенные НИИ смогут откликнуться и предложить решения.
            </DialogDescription>
          </DialogHeader>

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

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewIdeaModalOpen(false)}
                className="text-xs border-[#E2E5EB] rounded-xl"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={publishingIdea}
                className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs"
              >
                {publishingIdea ? "Публикация..." : "Разместить идею"}
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

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDonationModal(null)}
                className="text-xs border-[#E2E5EB] rounded-xl"
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
    </div>
  )
}
