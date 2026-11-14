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
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanSteps,
  PlanStepItem,
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

export interface AppliedTzData {
  title: string
  category?: string
  budget: string
  deadline: string
  description: string
  stages?: { step?: number; title: string; amount?: number }[]
}

interface AiTaskAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyTz: (data: AppliedTzData) => void
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
  "Полимер для Арктики",
  "Манипулятор для шахт",
  "Биоматериал с серебром",
  "Твердотельный аккумулятор",
  "Композит для БПЛА",
  "Датчик вибрации",
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
    const totalBudget = result.suggested_budget ? Number(result.suggested_budget) : 2000000
    const rawStages = result.stages || []
    const parsedStages =
      rawStages.length > 0
        ? rawStages.map((s, idx) => ({
            step: idx + 1,
            title: s.replace(/^Этап\s*\d+[:.]?\s*/i, "").trim() || `Этап ${idx + 1}`,
            amount: Math.round(totalBudget / rawStages.length),
          }))
        : [
            { step: 1, title: "Аналитическое исследование и эскизное проектирование", amount: Math.round(totalBudget * 0.3) },
            { step: 2, title: "Разработка лабораторного образца и стендовые испытания", amount: Math.round(totalBudget * 0.4) },
            { step: 3, title: "Приёмочные испытания и регистрация РИД", amount: Math.round(totalBudget * 0.3) },
          ]

    onApplyTz({
      title: result.title || "",
      category: result.category || "",
      budget: String(totalBudget),
      deadline: result.suggested_deadline || "6 месяцев",
      description: result.scientific_summary || result.description || "",
      stages: parsedStages,
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
                {modalTitle || "План реализации НИОКР и генератор ТЗ"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B7280]">
                {modalDescription || "Формирование календарного плана, этапов сметы и требований по ГОСТ 15.016-2016"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Input Form with Suggestion Chips */}
          <div className="space-y-3 bg-[#F8FAFC] p-4 sm:p-5 rounded-2xl border border-[#E2E5EB]">
            {/* shadcn AI Suggestion Chips */}
            <Suggestions label="Подсказки:">
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
                <span>{loading ? "Формирование плана по ГОСТ..." : "Сформировать план и ТЗ"}</span>
              </Button>
            </div>
          </div>

          {/* shadcn AI: CHAIN OF THOUGHT */}
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

          {/* Generated Result: shadcn AI PLAN */}
          {result && !loading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Collapsed Chain of Thought */}
              <ChainOfThought
                steps={chainSteps}
                currentStepIndex={chainSteps.length - 1}
                running={false}
                defaultOpen={false}
                title="Цепочка рассуждений модели (Chain of Thought)"
              />

              {/* shadcn AI: PLAN COMPONENT */}
              <Plan>
                <PlanHeader>
                  <div className="min-w-0">
                    <PlanTitle>
                      <HiOutlineDocumentCheck className="size-4 text-[#F81B00]" />
                      <span>План реализации НИОКР (ГОСТ 15.016-2016)</span>
                    </PlanTitle>
                    <PlanDescription>
                      Календарный график, этапы разработки и контрольные нормативы
                    </PlanDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800 font-bold">
                      TRL {result.target_trl_start || 3} → {result.target_trl_end || 6}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-[#111111] bg-white border border-[#E2E5EB] px-2.5 py-1 rounded-xl shadow-2xs">
                      {(result.suggested_budget || 2000000).toLocaleString("ru-RU")} ₽
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingResult(!isEditingResult)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        isEditingResult
                          ? "bg-[#111111] text-white border-[#111111]"
                          : "bg-white text-[#111111] border-[#E2E5EB] hover:border-[#111111]"
                      }`}
                    >
                      <HiOutlinePencilSquare className="size-3.5" />
                      <span>{isEditingResult ? "Просмотр" : "Правка"}</span>
                    </button>
                  </div>
                </PlanHeader>

                <PlanContent>
                  {/* Topic & Scientific Summary */}
                  {isEditingResult ? (
                    <div className="space-y-3 p-3.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
                          Тема НИОКР:
                        </label>
                        <Input
                          value={result.title}
                          onChange={(e) => setResult({ ...result, title: e.target.value })}
                          className="h-8 text-xs font-bold rounded-xl bg-white"
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
                            className="h-8 text-xs rounded-xl bg-white"
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
                            className="h-8 text-xs rounded-xl bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
                          Научно-техническое обоснование:
                        </label>
                        <textarea
                          value={result.scientific_summary || ""}
                          onChange={(e) =>
                            setResult({ ...result, scientific_summary: e.target.value })
                          }
                          rows={2}
                          className="w-full p-2 border border-[#E2E5EB] rounded-xl text-xs bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 p-3.5 bg-[#F8FAFC] border border-[#E2E5EB] rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          Предмет и цель разработки
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">•</span>
                        <span className="text-[10px] text-[#6B7280] font-mono">{result.suggested_deadline || "6 месяцев"}</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#111111] leading-snug">
                        {result.title}
                      </h4>
                      {result.scientific_summary && (
                        <p className="text-xs text-[#4B5563] leading-relaxed pt-1">
                          {result.scientific_summary}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Plan Steps (Milestones) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                        <HiOutlineCube className="size-3.5 text-[#F81B00]" />
                        <span>Календарный план и этапы финансирования:</span>
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        Всего этапов: {result.stages?.length || 3}
                      </span>
                    </div>

                    <PlanSteps>
                      {(result.stages || []).map((stage, i) => {
                        const cleanTitle = stage.replace(/^Этап\s*\d+[:.]?\s*/i, "").trim()
                        const perStageBudget = Math.round((result.suggested_budget || 2000000) / (result.stages?.length || 1))
                        const stageDeliverable = result.deliverables && result.deliverables[i] ? [result.deliverables[i]] : undefined

                        return (
                          <PlanStepItem
                            key={i}
                            stepNumber={i + 1}
                            title={cleanTitle}
                            budget={perStageBudget}
                            duration={result.suggested_deadline ? `~${Math.max(1, Math.round(6 / (result.stages?.length || 3)))} мес.` : undefined}
                            deliverables={stageDeliverable}
                          />
                        )
                      })}
                    </PlanSteps>
                  </div>

                  {/* Technical Requirements & Verification Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 bg-white border border-[#E2E5EB] rounded-xl space-y-1.5 shadow-2xs">
                      <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                        <HiOutlineDocumentCheck className="size-3.5 text-[#F81B00]" />
                        <span>Ключевые технические требования:</span>
                      </span>
                      <ul className="space-y-1 text-[11px] text-[#374151]">
                        {(result.technical_requirements || []).slice(0, 4).map((req, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="size-1 rounded-full bg-[#111111] mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-white border border-[#E2E5EB] rounded-xl space-y-1.5 shadow-2xs">
                      <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                        <HiOutlineBeaker className="size-3.5 text-emerald-600" />
                        <span>Методы стендовых испытаний:</span>
                      </span>
                      <ul className="space-y-1 text-[11px] text-[#374151]">
                        {(result.testing_methodology || []).slice(0, 4).map((m, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="size-1 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Intellectual Property Notice */}
                  {result.ip_ownership_recommendation && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <HiOutlineShieldCheck className="size-4 text-emerald-700" />
                        <span>Рекомендация по правам на РИД:</span>
                      </span>
                      <p className="text-emerald-900 leading-relaxed text-[11px]">
                        {result.ip_ownership_recommendation}
                      </p>
                    </div>
                  )}
                </PlanContent>
              </Plan>
            </div>
          )}
        </div>

        {/* Modal Footer: только целевые действия */}
        {result && (
          <DialogFooter className="gap-2.5 pt-4 border-t border-[#E2E5EB] mt-4 flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyTz}
              className="gap-1.5 text-xs font-semibold rounded-xl border-[#E2E5EB] hover:bg-[#F5F6F8] px-3.5 h-9"
            >
              <HiOutlineClipboardDocumentCheck className="size-4 text-[#4B5563]" />
              <span>Скопировать ТЗ</span>
            </Button>

            <Button
              type="button"
              onClick={handleApply}
              className="gap-2 text-xs font-bold bg-[#F81B00] hover:bg-[#d01700] text-white rounded-xl shadow-xs cursor-pointer px-4.5 h-9"
            >
              <HiOutlineCheck className="size-4" />
              <span>{applyButtonText || "Применить в заявку"}</span>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
