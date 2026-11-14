"use client"

import * as React from "react"
import {
  HiOutlineCube,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineCalendar,
  HiOutlineBanknotes,
} from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanSteps,
} from "@/components/ui/ai-elements"

export interface PlanStageData {
  step: number
  title: string
  amount: number
  duration?: string
  deliverables?: string
}

interface PlanEditorProps {
  stages: PlanStageData[]
  onChange: (stages: PlanStageData[]) => void
  onSyncBudget?: (total: number) => void
  onOpenAiGenerator?: () => void
  title?: string
  description?: string
  readOnly?: boolean
}

export function PlanEditor({
  stages,
  onChange,
  onSyncBudget,
  onOpenAiGenerator,
  title = "План реализации R&D и этапы финансирования",
  description = "Календарный график по ГОСТ 15.016-2016 с разбивкой на этапы и смету",
  readOnly = false,
}: PlanEditorProps) {
  const totalBudget = React.useMemo(() => {
    return stages.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
  }, [stages])

  const handleTitleChange = (index: number, newTitle: string) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], title: newTitle }
    onChange(updated)
  }

  const handleAmountChange = (index: number, newAmount: number) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], amount: Math.max(0, newAmount) }
    onChange(updated)
    if (onSyncBudget) {
      const tot = updated.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
      onSyncBudget(tot)
    }
  }

  const handleDurationChange = (index: number, newDuration: string) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], duration: newDuration }
    onChange(updated)
  }

  const handleAddStage = () => {
    const nextStep = stages.length + 1
    const defaultAmount = stages.length > 0 ? Math.round(totalBudget / stages.length) : 500000
    const newStage: PlanStageData = {
      step: nextStep,
      title: `Этап ${nextStep}: Испытания и приёмка результатов`,
      amount: defaultAmount,
      duration: "2 мес.",
    }
    const updated = [...stages, newStage]
    onChange(updated)
    if (onSyncBudget) {
      const tot = updated.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
      onSyncBudget(tot)
    }
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return
    const filtered = stages.filter((_, i) => i !== index)
    const reindexed = filtered.map((s, i) => ({ ...s, step: i + 1 }))
    onChange(reindexed)
    if (onSyncBudget) {
      const tot = reindexed.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
      onSyncBudget(tot)
    }
  }

  return (
    <Plan className="my-2 border-[#E2E5EB] bg-white">
      <PlanHeader className="bg-[#F8FAFC]">
        <div className="min-w-0">
          <PlanTitle className="text-xs font-bold text-[#111111]">
            <HiOutlineCube className="size-4 text-[#F81B00] shrink-0" />
            <span>{title}</span>
          </PlanTitle>
          <PlanDescription className="text-[11px] text-[#6B7280]">
            {description}
          </PlanDescription>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono font-bold text-[#111111] bg-white border border-[#E2E5EB] px-2.5 py-1 rounded-xl shadow-2xs">
            {totalBudget.toLocaleString("ru-RU")} ₽
          </span>
          {onOpenAiGenerator && !readOnly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenAiGenerator}
              className="h-7 px-2 text-[11px] font-bold text-[#F81B00] border-[#F81B00]/30 hover:border-[#F81B00] bg-white hover:bg-[#FFF5F5] rounded-lg cursor-pointer flex items-center gap-1"
            >
              <HiOutlineSparkles className="size-3 text-[#F81B00]" />
              <span>Сгенерировать план</span>
            </Button>
          )}
        </div>
      </PlanHeader>

      <PlanContent className="p-3 sm:p-4 space-y-3">
        {stages.length === 0 ? (
          <div className="p-4 text-center bg-[#F8FAFC] border border-dashed border-[#E2E5EB] rounded-xl text-xs text-[#6B7280]">
            <p>План пока не содержит этапов.</p>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                onClick={handleAddStage}
                className="mt-2 text-xs font-bold bg-[#111111] text-white rounded-lg px-3 h-7 cursor-pointer"
              >
                + Добавить 1-й этап
              </Button>
            )}
          </div>
        ) : (
          <PlanSteps className="space-y-2.5 pl-6">
            {stages.map((st, idx) => (
              <div
                key={idx}
                className="relative bg-[#F8FAFC] hover:bg-white border border-[#E2E5EB] hover:border-[#111111]/40 rounded-xl p-3 transition-all space-y-2"
              >
                {/* Step badge */}
                <div className="absolute -left-[26px] top-2.5 size-5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {idx + 1}
                </div>

                {readOnly ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#111111]">{st.title}</span>
                      <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {Number(st.amount).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                    {st.duration && (
                      <span className="text-[10px] text-[#6B7280]">Срок: {st.duration}</span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">
                          Наименование этапа {idx + 1}:
                        </label>
                        <Input
                          value={st.title}
                          onChange={(e) => handleTitleChange(idx, e.target.value)}
                          placeholder="Например: Изготовление опытного образца"
                          className="h-8 text-xs font-semibold rounded-lg bg-white"
                          required
                        />
                      </div>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="text-[#9CA3AF] hover:text-red-600 p-1 rounded-md transition-colors mt-5 cursor-pointer"
                          title="Удалить этап"
                        >
                          <HiOutlineTrash className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <label className="text-[10px] font-semibold text-[#6B7280] flex items-center gap-1 mb-1">
                          <HiOutlineBanknotes className="size-3 text-emerald-600" />
                          <span>Бюджет транша (₽):</span>
                        </label>
                        <Input
                          type="number"
                          value={st.amount || ""}
                          onChange={(e) => handleAmountChange(idx, Number(e.target.value))}
                          placeholder="300000"
                          className="h-8 text-xs font-mono font-bold rounded-lg bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#6B7280] flex items-center gap-1 mb-1">
                          <HiOutlineCalendar className="size-3 text-[#111111]" />
                          <span>Ориентировочный срок:</span>
                        </label>
                        <Input
                          value={st.duration || ""}
                          onChange={(e) => handleDurationChange(idx, e.target.value)}
                          placeholder="2 месяца"
                          className="h-8 text-xs rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </PlanSteps>
        )}

        {!readOnly && (
          <div className="pt-1 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddStage}
              className="text-[11px] font-bold text-[#111111] border-[#E2E5EB] hover:border-[#111111] bg-white rounded-lg h-7 px-2.5 cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <HiOutlinePlus className="size-3.5" />
              <span>Добавить этап в план</span>
            </Button>
            <span className="text-[10px] text-[#6B7280]">
              Всего этапов в плане: <strong>{stages.length}</strong>
            </span>
          </div>
        )}
      </PlanContent>
    </Plan>
  )
}
