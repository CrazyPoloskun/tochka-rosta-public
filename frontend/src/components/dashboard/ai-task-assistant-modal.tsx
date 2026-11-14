"use client"

import * as React from "react"
import {
  HiOutlineSparkles,
  HiOutlineCpuChip,
  HiOutlineDocumentCheck,
  HiOutlineShieldCheck,
  HiOutlineBeaker,
  HiOutlineCheck,
  HiOutlineArrowRight,
  HiOutlineCube,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"

interface GeneratedTzResult {
  title: string
  category: string
  target_trl_start?: number
  target_trl_end?: number
  suggested_budget?: number
  suggested_deadline?: string
  scientific_summary?: string
  technical_requirements?: string[]
  deliverables?: string[]
  testing_methodology?: string[]
  stages?: string[]
  ip_ownership_recommendation?: string
  description?: string
  source?: string
  model_used?: string
}

interface AiTaskAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyTz: (data: {
    title: string
    category?: string
    budget: string
    deadline: string
    description: string
  }) => void
  authFetch: (url: string, init?: RequestInit) => Promise<Response>
  initialTitle?: string
  initialQuery?: string
  initialCategory?: string
  modalTitle?: string
  modalDescription?: string
  applyButtonText?: string
}

const INDUSTRY_OPTIONS = [
  "Автоопределение",
  "Новые материалы и химия",
  "Робототехника и мехатроника",
  "Биотехнологии и медицина",
  "Электроника и микросхемы",
  "Энергетика и накопители",
  "Информационные технологии и ИИ",
  "Аэрокосмос и БАС",
]

const QUICK_EXAMPLES = [
  "Нужен морозостойкий полимер для стаканчиков, не боящийся кипятка 95°C",
  "Беспилотный манипулятор для сортировки руды в шахте при вибрациях",
  "Биоразлагаемый шовный материал с антибактериальным серебряным слоем",
  "Твердотельный аккумулятор для электрокаров с зарядкой за 10 минут",
]

const GENERATION_STAGES = [
  { icon: "🔍", label: "Семантический анализ технического запроса...", progress: 20 },
  { icon: "📐", label: "Сопоставление с патентным классификатором МПК и ГОСТ 15.016...", progress: 45 },
  { icon: "⚙️", label: "Расчет физико-химических и инженерных допусков...", progress: 68 },
  { icon: "📊", label: "Календарное планирование этапов и калькуляция сметы...", progress: 85 },
  { icon: "📜", label: "Формирование разделов РИД и финальная валидация ТЗ...", progress: 96 },
]

export function AiTaskAssistantModal({
  open,
  onOpenChange,
  onApplyTz,
  authFetch,
  initialTitle,
  initialQuery,
  initialCategory,
  modalTitle,
  modalDescription,
  applyButtonText,
}: AiTaskAssistantModalProps) {
  const { error, success, info } = useToast()

  const [userQuery, setUserQuery] = React.useState(initialQuery || "")
  const [selectedIndustry, setSelectedIndustry] = React.useState(initialCategory || "Автоопределение")
  const [loading, setLoading] = React.useState(false)
  const [currentStageIdx, setCurrentStageIdx] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState<"reqs" | "stages" | "ip">("reqs")
  const [result, setResult] = React.useState<GeneratedTzResult | null>(null)

  React.useEffect(() => {
    let interval: any
    if (loading) {
      setCurrentStageIdx(0)
      interval = setInterval(() => {
        setCurrentStageIdx((prev) => (prev < GENERATION_STAGES.length - 1 ? prev + 1 : prev))
      }, 1900)
    }
    return () => clearInterval(interval)
  }, [loading])

  React.useEffect(() => {
    if (open) {
      if (initialQuery !== undefined) setUserQuery(initialQuery)
      if (initialCategory && INDUSTRY_OPTIONS.includes(initialCategory)) {
        setSelectedIndustry(initialCategory)
      }
    }
  }, [open, initialQuery, initialCategory])

  const handleGenerate = async (queryText?: string) => {
    const textToUse = (queryText || userQuery).trim()
    if (!textToUse || textToUse.length < 3) {
      error("Опишите задачу хотя бы несколькими словами", "Слишком короткий запрос")
      return
    }

    setLoading(true)
    try {
      const res = await authFetch("/api/v1/ai/generate-tz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: initialTitle || "",
          query: textToUse,
          industry: selectedIndustry === "Автоопределение" ? null : selectedIndustry,
        }),
      })

      if (res.ok) {
        const data: GeneratedTzResult = await res.json()
        setResult(data)
        success("Академическое ТЗ успешно сформировано по ГОСТ 15.016", "ТЗ готово")
      } else {
        const errData = await res.json().catch(() => ({}))
        error(errData.detail || "Не удалось сгенерировать ТЗ", "Ошибка ИИ")
      }
    } catch {
      error("Сетевая ошибка при обращении к ИИ-сервису", "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    onApplyTz({
      title: result.title || "",
      category: result.category || "",
      budget: result.suggested_budget ? String(result.suggested_budget) : "2000000",
      deadline: result.suggested_deadline || "6 месяцев",
      description: result.description || "",
    })
    onOpenChange(false)
  }

  const handleCopyTz = () => {
    if (!result) return
    const formatted = `ТЕХНИЧЕСКОЕ ЗАДАНИЕ НА НИОКР\n` +
      `Тема: ${result.title}\n` +
      `Отрасль: ${result.category}\n` +
      `Целевой уровень TRL: ${result.target_trl_start || 3} → ${result.target_trl_end || 6}\n` +
      `Ориентировочный бюджет: ${(result.suggested_budget || 2000000).toLocaleString("ru-RU")} ₽\n` +
      `Срок: ${result.suggested_deadline || "6 месяцев"}\n\n` +
      `1. Научное обоснование и цель:\n${result.scientific_summary || ""}\n\n` +
      `2. Нормативно-технические требования:\n${(result.technical_requirements || []).map((r) => `  • ${r}`).join("\n")}\n\n` +
      `3. Методы стендовых испытаний:\n${(result.testing_methodology || []).map((m) => `  • ${m}`).join("\n")}\n\n` +
      `4. Рекомендуемые этапы НИОКР:\n${(result.stages || []).map((s) => `  • ${s}`).join("\n")}\n\n` +
      `5. Ожидаемые материальные результаты (Deliverables):\n${(result.deliverables || []).map((d) => `  • ${d}`).join("\n")}\n\n` +
      `6. Права на РИД и патенты:\n${result.ip_ownership_recommendation || ""}`

    navigator.clipboard.writeText(formatted)
    info("Полный текст ТЗ скопирован в буфер обмена", "Скопировано")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 border-[#E2E5EB] shadow-xl">
        <DialogHeader className="border-b border-[#E2E5EB] pb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#F81B00]/10 text-[#F81B00]">
              <HiOutlineSparkles className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-[#111111]">
                {modalTitle || "ИИ-помощник в составлении ТЗ на НИОКР"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                {modalDescription || "Трансформация бизнес-потребности в строгое академическое ТЗ по стандартам ГОСТ 15.016-2016"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Input Form */}
          <div className="space-y-3 bg-[#F5F6F8] p-4 rounded-xl border border-[#E2E5EB]">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#111111] block mb-1">
                Опишите задачу простыми словами (как инвестор / предприниматель):
              </label>
              <textarea
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Например: Нужен ударопрочный полимер для корпусов приборов в условиях крайнего севера (до -60°C)..."
                className="w-full h-20 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-white text-[#111111] focus:border-[#F81B00] outline-hidden resize-none leading-relaxed transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">Отрасль:</span>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="h-8 border border-[#E2E5EB] rounded-lg px-2.5 text-xs bg-white text-[#111111] focus:border-[#F81B00] outline-hidden"
                >
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                onClick={() => handleGenerate()}
                disabled={loading || !userQuery.trim()}
                className="gap-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer px-4"
              >
                <HiOutlineSparkles className={`size-4 ${loading ? "animate-spin text-[#F81B00]" : "text-[#F81B00]"}`} />
                <span>{loading ? "Формирование ТЗ по ГОСТ..." : "Сгенерировать ТЗ"}</span>
              </Button>
            </div>

            {/* Quick Prompts */}
            {!result && (
              <div className="pt-2 border-t border-[#E2E5EB]/60">
                <span className="text-[10px] font-semibold text-[#6B7280] block mb-1.5">
                  Быстрые примеры запросов:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_EXAMPLES.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUserQuery(ex)
                        handleGenerate(ex)
                      }}
                      className="text-[10px] text-left px-2.5 py-1 rounded-lg bg-white border border-[#E2E5EB] text-[#374151] hover:border-[#111111]/30 hover:text-[#111111] transition-all cursor-pointer truncate max-w-full"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OpenRouter-style Shine Card & Dynamic Generation Status */}
          {loading && (
            <div className="openrouter-shine-card shadow-md animate-in fade-in zoom-in-95 duration-200">
              <div className="openrouter-shine-inner p-5 space-y-4">
                {/* Header with glowing beacon */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E5EB]/60">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F81B00] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F81B00]"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#111111] openrouter-text-shimmer">
                      Нейросетевая генерация ТЗ по ГОСТ 15.016-2016
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F81B00]/10 text-[#F81B00] border border-[#F81B00]/20 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#F81B00] animate-pulse" />
                    OpenRouter Neural
                  </span>
                </div>

                {/* Animated Generation Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#111111]">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{GENERATION_STAGES[currentStageIdx].icon}</span>
                      <span className="font-medium text-[#111111]">{GENERATION_STAGES[currentStageIdx].label}</span>
                    </span>
                    <span className="text-[#F81B00] font-mono text-[11px] font-bold">
                      {GENERATION_STAGES[currentStageIdx].progress}%
                    </span>
                  </div>

                  {/* Flowing Shimmer Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-[#E2E5EB]">
                    <div
                      className="h-full rounded-full openrouter-shimmer-bar transition-all duration-500 ease-out"
                      style={{ width: `${GENERATION_STAGES[currentStageIdx].progress}%` }}
                    />
                  </div>
                </div>

                {/* Shimmering Skeleton Mocking Output */}
                <div className="space-y-2 pt-1">
                  <div className="h-2.5 w-4/5 rounded-md openrouter-shimmer-bar opacity-60" />
                  <div className="h-2.5 w-full rounded-md openrouter-shimmer-bar opacity-40" />
                  <div className="h-2.5 w-3/5 rounded-md openrouter-shimmer-bar opacity-30" />
                </div>

                <div className="pt-1 text-center text-[10px] text-[#6B7280]">
                  Используются патентные классификаторы МПК и нормативная база трансфера технологий РФ
                </div>
              </div>
            </div>
          )}

          {/* Generated Result Preview */}
          {result && !loading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="p-4 bg-white border border-[#E2E5EB] rounded-xl space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-[#E2E5EB] bg-[#F5F6F8] text-[10px] text-[#374151] font-semibold">
                      {result.category}
                    </Badge>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800 font-bold">
                      TRL {result.target_trl_start || 3} → TRL {result.target_trl_end || 6}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#4B5563]">
                    <span className="flex items-center gap-1 font-semibold text-[#111111]">
                      <HiOutlineCurrencyDollar className="size-4 text-[#F81B00]" />
                      {(result.suggested_budget || 2000000).toLocaleString("ru-RU")} ₽
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <HiOutlineClock className="size-4 text-[#6B7280]" />
                      {result.suggested_deadline || "6 месяцев"}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#111111] leading-snug">
                    {result.title}
                  </h4>
                  {result.scientific_summary && (
                    <p className="text-xs text-[#4B5563] mt-1.5 leading-relaxed italic">
                      «{result.scientific_summary}»
                    </p>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="inline-flex p-1 bg-[#F5F6F8] border border-[#E2E5EB] rounded-xl gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("reqs")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "reqs"
                      ? "bg-white text-[#111111] shadow-2xs"
                      : "text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Технические параметры & Испытания
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("stages")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "stages"
                      ? "bg-white text-[#111111] shadow-2xs"
                      : "text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Этапы и РИД
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ip")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "ip"
                      ? "bg-white text-[#111111] shadow-2xs"
                      : "text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Права на РИД & Патенты
                </button>
              </div>

              {/* Tab 1: Reqs & Testing */}
              {activeTab === "reqs" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-[#FAFAFB] rounded-xl border border-[#E2E5EB] space-y-2">
                    <span className="text-[11px] font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlineCpuChip className="size-4 text-[#F81B00]" />
                      <span>Нормативно-технические параметры:</span>
                    </span>
                    <ul className="space-y-1.5 text-[#374151] list-disc list-inside leading-relaxed">
                      {(result.technical_requirements || []).map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-[#FAFAFB] rounded-xl border border-[#E2E5EB] space-y-2">
                    <span className="text-[11px] font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlineBeaker className="size-4 text-[#F81B00]" />
                      <span>Методы контроля и стендовых испытаний:</span>
                    </span>
                    <ul className="space-y-1.5 text-[#374151] list-disc list-inside leading-relaxed">
                      {(result.testing_methodology || []).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: Stages Chain connected with line */}
              {activeTab === "stages" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-white rounded-2xl border border-[#E2E5EB] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E5EB]">
                      <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                        <HiOutlineDocumentCheck className="size-4 text-[#F81B00]" />
                        <span>Календарная цепочка этапов НИОКР:</span>
                      </span>
                      <span className="text-[10px] font-semibold text-[#6B7280]">
                        {(result.stages || []).length} этапа с контрольными точками
                      </span>
                    </div>

                    {/* Connected Chain Timeline */}
                    <div className="relative pl-7 space-y-3.5 pt-1">
                      {/* Continuous vertical connecting line */}
                      <div className="absolute left-[13px] top-3.5 bottom-3.5 w-0.5 bg-gradient-to-b from-[#F81B00] via-[#F81B00]/60 to-[#E2E5EB]" />

                      {(result.stages || []).map((stage, i) => (
                        <div key={i} className="relative flex items-start gap-3 group">
                          {/* Connected Step Node */}
                          <div className="absolute -left-7 size-7 rounded-full bg-white border-2 border-[#F81B00] text-[#F81B00] font-bold text-xs flex items-center justify-center shadow-xs z-10 transition-transform group-hover:scale-110">
                            {i + 1}
                          </div>

                          {/* Stage Content Card */}
                          <div className="flex-1 p-3 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] transition-all hover:border-[#F81B00]/40 hover:bg-white shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-[#111111] text-xs flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-[#F81B00]" />
                                Этап {i + 1}
                              </span>
                              <Badge variant="outline" className="border-[#E2E5EB] bg-white text-[10px] text-[#4B5563] font-medium">
                                Сдача отчетности
                              </Badge>
                            </div>
                            <p className="text-xs text-[#374151] leading-relaxed">
                              {stage.replace(/^Этап\s*\d+[:.]?\s*/i, "")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-[#E2E5EB] shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlineCube className="size-4 text-[#F81B00]" />
                      <span>Ожидаемые материальные результаты (Deliverables):</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {(result.deliverables || []).map((d, i) => (
                        <div key={i} className="p-2.5 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] text-xs text-[#374151] flex items-start gap-2">
                          <span className="size-1.5 rounded-full bg-[#F81B00] mt-1 shrink-0" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: IP recommendation */}
              {activeTab === "ip" && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-2">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <HiOutlineShieldCheck className="size-4 text-emerald-600" />
                    <span>Рекомендация по защите интеллектуальных прав:</span>
                  </span>
                  <p className="text-emerald-900 leading-relaxed">
                    {result.ip_ownership_recommendation ||
                      "Исключительные права на изобретение передаются инвестору с оформлением патента в ФИПС. Научная организация получает право на использование технологии в исследовательских целях."}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#E2E5EB]">
                <div className="flex items-center gap-2">
                  {result.model_used && (
                    <span className="text-[10px] text-[#6B7280] bg-[#F5F6F8] px-2 py-1 rounded-md border border-[#E2E5EB]">
                      ИИ: {result.model_used}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyTz}
                    className="gap-1.5 text-xs rounded-xl border-[#E2E5EB] hover:bg-[#F5F6F8]"
                  >
                    <HiOutlineClipboardDocumentCheck className="size-4 text-[#4B5563]" />
                    <span>Скопировать ТЗ</span>
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs rounded-xl border-[#E2E5EB]"
                  >
                    Закрыть
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApply}
                    className="gap-2 text-xs font-bold bg-[#F81B00] hover:bg-[#d01700] text-white rounded-xl shadow-xs cursor-pointer px-4"
                  >
                    <HiOutlineCheck className="size-4" />
                    <span>{applyButtonText || "Применить в заявку тендера"}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
