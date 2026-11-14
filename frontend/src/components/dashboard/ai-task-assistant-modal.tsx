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
  HiOutlinePencilSquare,
} from "react-icons/hi2"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import {
  AiMarker,
  Suggestions,
  Suggestion,
  ChainOfThought,
  ChainStep,
} from "@/components/ui/ai-elements"

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

const QUICK_SUGGESTIONS = [
  "Морозостойкий полимер для корпусов, не боящийся перепадов от -60°C до +95°C",
  "Беспилотный манипулятор для сортировки руды в шахте при экстремальных вибрациях",
  "Биоразлагаемый шовный материал с напылением наносеребра для хирургии",
  "Твердотельный аккумулятор для электрокаров с зарядкой за 10 минут",
  "Сверхлегкий композитный профиль крыла для тяжелых БПЛА",
]

const INITIAL_CHAIN_STEPS: ChainStep[] = [
  {
    id: "1",
    title: "Семантический анализ технического запроса",
    detail: "Извлечение граничных условий, физико-химических допусков и целей разработки",
    status: "pending",
    duration: "0.4s",
  },
  {
    id: "2",
    title: "Сопоставление с патентными классификаторами МПК и ГОСТ 15.016-2016",
    detail: "Поиск действующих нормативных стандартов НИОКР и аналогов в патентной базе РФ",
    status: "pending",
    duration: "0.8s",
  },
  {
    id: "3",
    title: "Расчёт физико-химических и инженерных допусков",
    detail: "Определение методологии стендовых испытаний, погрешностей и регламентов приёмки",
    status: "pending",
    duration: "1.1s",
  },
  {
    id: "4",
    title: "Календарное планирование этапов и калькуляция сметы",
    detail: "Разбивка НИОКР на вехи (milestones) с привязкой уровней технологической готовности TRL 3→6",
    status: "pending",
    duration: "1.5s",
  },
  {
    id: "5",
    title: "Формирование разделов РИД и финальная валидация ТЗ",
    detail: "Определение прав на интеллектуальную собственность, патентных формул и актов сдачи",
    status: "pending",
    duration: "0.5s",
  },
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
  const [isEditingResult, setIsEditingResult] = React.useState(false)

  // Обновление цепочки рассуждений во время генерации
  const [chainSteps, setChainSteps] = React.useState<ChainStep[]>(INITIAL_CHAIN_STEPS)

  React.useEffect(() => {
    let interval: any
    if (loading) {
      setCurrentStageIdx(0)
      setChainSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx === 0 ? "running" : "pending",
        }))
      )

      interval = setInterval(() => {
        setCurrentStageIdx((prev) => {
          const next = prev < INITIAL_CHAIN_STEPS.length - 1 ? prev + 1 : prev
          setChainSteps((oldSteps) =>
            oldSteps.map((s, idx) => ({
              ...s,
              status: idx < next ? "completed" : idx === next ? "running" : "pending",
            }))
          )
          return next
        })
      }, 1800)
    } else if (result) {
      // Помечаем все шаги завершенными
      setChainSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: "completed",
        }))
      )
    }
    return () => clearInterval(interval)
  }, [loading, result])

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
      description: result.scientific_summary || result.description || "",
    })
    onOpenChange(false)
  }

  const handleCopyTz = () => {
    if (!result) return
    const formatted =
      `ТЕХНИЧЕСКОЕ ЗАДАНИЕ НА НИОКР\n` +
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 border-[#E2E5EB] shadow-2xl">
        <DialogHeader className="border-b border-[#E2E5EB] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#F81B00]/10 text-[#F81B00] shrink-0">
              <HiOutlineSparkles className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[#111111] tracking-tight">
                {modalTitle || "ИИ-помощник формирования ТЗ"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                {modalDescription || "Генерация ГОСТ-ТЗ, календарного плана и сметы по стандарту ГОСТ 15.016-2016"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Input Form with Suggestion Chips */}
          <div className="space-y-3 bg-[#F8FAFC] p-4 sm:p-5 rounded-2xl border border-[#E2E5EB]">
            {/* shadcn AI Suggestion Chips */}
            <Suggestions label="Подсказки запроса (Suggestion):">
              {QUICK_SUGGESTIONS.map((ex, idx) => (
                <Suggestion
                  key={idx}
                  onClick={() => setUserQuery(ex)}
                  className="bg-white hover:border-[#111111]"
                >
                  {ex}
                </Suggestion>
              ))}
            </Suggestions>

            {/* Input Textarea Area */}
            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1.5">
                Опишите техническую задачу:
              </label>
              <textarea
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Например: Нужен ударопрочный морозостойкий композит для корпусов приборов в условиях крайнего севера (до -60°C)..."
                className="w-full h-24 border border-[#E2E5EB] rounded-xl p-3 text-xs bg-white text-[#111111] focus:border-[#111111] focus:ring-1 focus:ring-[#111111]/20 outline-hidden resize-none leading-relaxed transition-all shadow-2xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280] font-medium">Отрасль:</span>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="h-9 border border-[#E2E5EB] rounded-xl px-2.5 text-xs bg-white text-[#111111] focus:border-[#111111] outline-hidden shadow-2xs cursor-pointer"
                >
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button с чистым маркером вместо крутящегося спиннера */}
              <Button
                size="sm"
                onClick={() => handleGenerate()}
                disabled={loading || !userQuery.trim()}
                className="gap-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs cursor-pointer px-4 h-9"
              >
                {loading ? (
                  <AiMarker variant="primary" size="sm" active />
                ) : (
                  <HiOutlineSparkles className="size-4 text-[#F81B00]" />
                )}
                <span>{loading ? "Формирование ТЗ по ГОСТ..." : "Сгенерировать ТЗ"}</span>
              </Button>
            </div>
          </div>

          {/* shadcn AI: CHAIN OF THOUGHT (вместо разноцветного градиентного блока) */}
          {loading && (
            <div className="animate-in fade-in duration-200">
              <ChainOfThought
                steps={chainSteps}
                currentStepIndex={currentStageIdx}
                running={true}
                defaultOpen={true}
              />
            </div>
          )}

          {/* Generated Result Preview */}
          {result && !loading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Collapsed Chain of Thought (доступен для инспекции хода рассуждений) */}
              <ChainOfThought
                steps={chainSteps}
                currentStepIndex={chainSteps.length - 1}
                running={false}
                defaultOpen={false}
                title="Цепочка рассуждений модели (Chain of Thought)"
              />

              {/* Header Box */}
              <div className="p-4 bg-white border border-[#E2E5EB] rounded-2xl space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-[#E2E5EB] bg-[#F5F6F8] text-[10px] text-[#374151] font-semibold">
                      {result.category}
                    </Badge>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800 font-bold">
                      TRL {result.target_trl_start || 3} → TRL {result.target_trl_end || 6}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingResult(!isEditingResult)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        isEditingResult
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white text-[#111111] border-[#E2E5EB] hover:border-[#111111]"
                      }`}
                    >
                      <HiOutlinePencilSquare className="size-3.5" />
                      <span>{isEditingResult ? "Просмотр" : "Редактировать"}</span>
                    </button>
                  </div>
                </div>

                {isEditingResult ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
                        Тема НИОКР:
                      </label>
                      <Input
                        value={result.title}
                        onChange={(e) => setResult({ ...result, title: e.target.value })}
                        className="h-8 text-xs font-bold rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
                          Ориентировочный бюджет (₽):
                        </label>
                        <Input
                          type="number"
                          value={result.suggested_budget || 2000000}
                          onChange={(e) =>
                            setResult({ ...result, suggested_budget: Number(e.target.value) })
                          }
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
                          Срок выполнения:
                        </label>
                        <Input
                          value={result.suggested_deadline || "6 месяцев"}
                          onChange={(e) =>
                            setResult({ ...result, suggested_deadline: e.target.value })
                          }
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#111111] leading-snug">
                      {result.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1 font-mono font-medium text-[#111111]">
                        <HiOutlineCurrencyDollar className="size-3.5 text-emerald-600" />
                        {(result.suggested_budget || 2000000).toLocaleString("ru-RU")} ₽
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <HiOutlineClock className="size-3.5" />
                        {result.suggested_deadline || "6 месяцев"}
                      </span>
                      <span>•</span>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        ГОСТ 15.016-2016
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtabs for Result Sections */}
              <div className="flex border-b border-[#E2E5EB] gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("reqs")}
                  className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                    activeTab === "reqs"
                      ? "border-[#111111] text-[#111111]"
                      : "border-transparent text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Требования и методология
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("stages")}
                  className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                    activeTab === "stages"
                      ? "border-[#111111] text-[#111111]"
                      : "border-transparent text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Этапы НИОКР ({result.stages?.length || 4})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ip")}
                  className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all cursor-pointer ${
                    activeTab === "ip"
                      ? "border-[#111111] text-[#111111]"
                      : "border-transparent text-[#6B7280] hover:text-[#111111]"
                  }`}
                >
                  Права на РИД и патенты
                </button>
              </div>

              {/* Tab 1: Requirements & Methodology */}
              {activeTab === "reqs" && (
                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-2xl border border-[#E2E5EB] shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-[#111111] block">
                      Научно-техническое обоснование:
                    </span>
                    {isEditingResult ? (
                      <textarea
                        value={result.scientific_summary || ""}
                        onChange={(e) =>
                          setResult({ ...result, scientific_summary: e.target.value })
                        }
                        rows={3}
                        className="w-full p-2 border border-[#E2E5EB] rounded-xl text-xs"
                      />
                    ) : (
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        {result.scientific_summary}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-[#E2E5EB] shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlineDocumentCheck className="size-4 text-[#F81B00]" />
                      <span>Нормативно-технические требования:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#374151]">
                      {(result.technical_requirements || []).map((req, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="size-1.5 rounded-full bg-[#111111] mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-[#E2E5EB] shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                      <HiOutlineBeaker className="size-4 text-emerald-600" />
                      <span>Методы стендовых испытаний и валидации:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#374151]">
                      {(result.testing_methodology || []).map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="size-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: Stages Chain connected with line */}
              {activeTab === "stages" && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-[#E2E5EB] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111]">
                        Рекомендуемая дорожная карта НИОКР:
                      </span>
                      <span className="text-[10px] text-[#6B7280]">ГОСТ 15.016-2016</span>
                    </div>

                    <div className="relative pl-7 space-y-3.5 pt-1">
                      <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-[#E2E5EB]" />

                      {(result.stages || []).map((stage, i) => (
                        <div key={i} className="relative flex items-start gap-3">
                          <div className="absolute -left-7 top-0 size-5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </div>
                          <div className="bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl p-3 flex-1 space-y-1">
                            <span className="text-xs font-bold text-[#111111] block">
                              Этап {i + 1}
                            </span>
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
                        <div key={i} className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E5EB] text-xs text-[#374151] flex items-start gap-2">
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
            </div>
          )}
        </div>

        {/* Modal Footer: четкие кнопки с отступами, никогда не слипаются */}
        <DialogFooter className="gap-3 pt-4 border-t border-[#E2E5EB] mt-4 flex flex-col-reverse sm:flex-row sm:justify-end items-stretch sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-xl border-[#E2E5EB] px-4 cursor-pointer hover:bg-[#F5F6F8]"
          >
            Закрыть
          </Button>

          {result && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyTz}
                className="gap-1.5 text-xs font-semibold rounded-xl border-[#E2E5EB] hover:bg-[#F5F6F8] px-3.5"
              >
                <HiOutlineClipboardDocumentCheck className="size-4 text-[#4B5563]" />
                <span>Скопировать ТЗ</span>
              </Button>

              <Button
                type="button"
                onClick={handleApply}
                className="gap-2 text-xs font-bold bg-[#F81B00] hover:bg-[#d01700] text-white rounded-xl shadow-xs cursor-pointer px-4.5 h-10"
              >
                <HiOutlineCheck className="size-4" />
                <span>{applyButtonText || "Применить в заявку"}</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
