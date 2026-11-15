"use client"

import * as React from "react"
import {
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCalculator,
  HiOutlineDocumentCheck,
} from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface MilestoneItemData {
  step: number
  title: string
  amount: number
}

interface MilestonesChainViewProps {
  milestones?: MilestoneItemData[]
  title?: string
  emptyText?: string
}

export function MilestonesChainView({
  milestones = [],
  title = "Календарная цепочка этапов НИОКР",
  emptyText = "Этапы сметы не детализированы",
}: MilestonesChainViewProps) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="p-4 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E2E5EB] text-center text-xs text-[#6B7280]">
        {emptyText}
      </div>
    )
  }

  const totalAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-[#E2E5EB]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111]">
          <HiOutlineDocumentCheck className="size-4 text-[#F81B00] shrink-0" />
          <span>{title} ({milestones.length})</span>
        </div>
        <span className="text-xs font-mono font-bold text-[#111111]">
          Итого: <span className="text-[#F81B00]">{totalAmount.toLocaleString("ru-RU")} ₽</span>
        </span>
      </div>

      <div className="relative pl-8 sm:pl-9 space-y-3 pt-1">
        {/* Соединительная непрерывная линия цепочки */}
        <div className="absolute left-3 sm:left-3.5 top-3.5 bottom-3.5 w-0.5 bg-gradient-to-b from-[#F81B00] via-[#F81B00]/70 to-[#E2E5EB]" />

        {milestones.map((m, idx) => {
          const stepNum = m.step || idx + 1
          return (
            <div key={idx} className="relative flex items-start gap-2.5 sm:gap-3 group">
              {/* Узел этапа с номером */}
              <div className="absolute -left-8 sm:-left-9 size-6 sm:size-7 rounded-full bg-white border-2 border-[#F81B00] text-[#F81B00] font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-xs z-10 transition-transform group-hover:scale-105">
                {stepNum}
              </div>

              {/* Карточка содержимого этапа */}
              <div className="flex-1 min-w-0 p-3 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] transition-all hover:border-[#F81B00]/40 hover:bg-white shadow-2xs space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-[#111111] leading-snug break-words">
                    {m.title || `Этап ${stepNum}`}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[#E2E5EB] bg-white text-[10px] text-[#4B5563] font-medium shrink-0 self-start sm:self-auto"
                  >
                    Отчётность и приёмка
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F1F3F5]">
                  <span className="text-[#6B7280]">Финансирование этапа:</span>
                  <span className="font-mono font-bold text-[#F81B00]">
                    {Number(m.amount || 0).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface MilestonesChainEditorProps {
  milestones: MilestoneItemData[]
  onChange: (milestones: MilestoneItemData[]) => void
  onSyncBudget?: (total: number) => void
}

export function MilestonesChainEditor({
  milestones,
  onChange,
  onSyncBudget,
}: MilestonesChainEditorProps) {
  const handleUpdate = (idx: number, field: "title" | "amount", val: string | number) => {
    const next = milestones.map((m, i) => {
      if (i === idx) {
        return {
          ...m,
          [field]: field === "amount" ? Math.max(0, Number(val) || 0) : String(val),
        }
      }
      return m
    })
    onChange(next)
  }

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return
    const next = [...milestones]
    const temp = next[idx]
    next[idx] = next[idx - 1]
    next[idx - 1] = temp
    // Пересчет номеров шагов
    const reindexed = next.map((m, i) => ({ ...m, step: i + 1 }))
    onChange(reindexed)
  }

  const handleMoveDown = (idx: number) => {
    if (idx >= milestones.length - 1) return
    const next = [...milestones]
    const temp = next[idx]
    next[idx] = next[idx + 1]
    next[idx + 1] = temp
    // Пересчет номеров шагов
    const reindexed = next.map((m, i) => ({ ...m, step: i + 1 }))
    onChange(reindexed)
  }

  const handleDelete = (idx: number) => {
    const next = milestones.filter((_, i) => i !== idx)
    const reindexed = next.map((m, i) => ({ ...m, step: i + 1 }))
    onChange(reindexed)
  }

  const handleAdd = () => {
    const nextStep = milestones.length + 1
    const newStage: MilestoneItemData = {
      step: nextStep,
      title: `Этап ${nextStep}: Научные исследования и испытания`,
      amount: 150000,
    }
    onChange([...milestones, newStage])
  }

  const totalAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E5EB]">
        <label className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
          <HiOutlineDocumentCheck className="size-4 text-[#F81B00] shrink-0" />
          <span>Календарная цепочка этапов НИОКР ({milestones.length})</span>
        </label>

        {onSyncBudget && milestones.length > 0 && (
          <button
            type="button"
            onClick={() => onSyncBudget(totalAmount)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F81B00] hover:underline cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors self-start sm:self-auto"
            title="Обновить общий бюджет по сумме этапов"
          >
            <HiOutlineCalculator className="size-3.5 shrink-0" />
            <span>Сумма: {totalAmount.toLocaleString("ru-RU")} ₽ → в бюджет</span>
          </button>
        )}
      </div>

      {milestones.length === 0 ? (
        <div className="p-4 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E2E5EB] text-center space-y-2">
          <p className="text-xs text-[#6B7280]">
            В заявке пока нет этапов. Добавьте этапы для формирования прозрачной сметы и календарного плана.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="text-xs font-bold border-[#F81B00]/40 text-[#F81B00] hover:bg-red-50 rounded-xl cursor-pointer"
          >
            <HiOutlinePlus className="size-3.5 mr-1" />
            Добавить первый этап
          </Button>
        </div>
      ) : (
        <div className="relative pl-8 sm:pl-9 space-y-3 pt-1">
          {/* Вертикальная соединительная линия */}
          <div className="absolute left-3 sm:left-3.5 top-3.5 bottom-3.5 w-0.5 bg-gradient-to-b from-[#F81B00] via-[#F81B00]/60 to-[#E2E5EB]" />

          {milestones.map((m, idx) => (
            <div key={idx} className="relative flex items-start gap-2.5 sm:gap-3 group">
              {/* Круглый узел этапа с номером */}
              <div className="absolute -left-8 sm:-left-9 size-6 sm:size-7 rounded-full bg-white border-2 border-[#F81B00] text-[#F81B00] font-bold text-[11px] sm:text-xs flex items-center justify-center shadow-xs z-10 shrink-0">
                {m.step || idx + 1}
              </div>

              {/* Блок редактирования этапа */}
              <div className="flex-1 min-w-0 p-2.5 sm:p-3 bg-[#F9FAFB] rounded-xl border border-[#E2E5EB] hover:border-[#F81B00]/40 hover:bg-white transition-all shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Input
                    value={m.title}
                    onChange={(e) => handleUpdate(idx, "title", e.target.value)}
                    placeholder={`Название этапа ${idx + 1}`}
                    className="h-8 text-xs font-medium rounded-lg bg-white border-[#E2E5EB] flex-1 min-w-0"
                  />

                  {/* Кнопки перемещения и удаления */}
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className={`p-1 rounded-md text-[#4B5563] hover:text-[#111111] hover:bg-[#E5E7EB] transition-colors cursor-pointer ${
                        idx === 0 ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""
                      }`}
                      title="Переместить этап выше"
                    >
                      <HiOutlineChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === milestones.length - 1}
                      className={`p-1 rounded-md text-[#4B5563] hover:text-[#111111] hover:bg-[#E5E7EB] transition-colors cursor-pointer ${
                        idx === milestones.length - 1 ? "opacity-30 cursor-not-allowed hover:bg-transparent" : ""
                      }`}
                      title="Переместить этап ниже"
                    >
                      <HiOutlineChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="p-1 rounded-md text-[#EF4444] hover:bg-red-50 transition-colors cursor-pointer ml-0.5 sm:ml-1"
                      title="Удалить этап"
                    >
                      <HiOutlineTrash className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <span className="text-[11px] text-[#6B7280] shrink-0">Бюджет этапа:</span>
                  <div className="flex items-center gap-1.5 w-full sm:w-40">
                    <Input
                      type="number"
                      value={m.amount}
                      onChange={(e) => handleUpdate(idx, "amount", e.target.value)}
                      className="h-7 text-xs font-mono font-bold text-right rounded-lg bg-white border-[#E2E5EB] flex-1 min-w-0"
                      min={0}
                      step={10000}
                    />
                    <span className="text-xs text-[#6B7280] font-bold shrink-0">₽</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Кнопка добавления нового этапа */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-dashed border-[#E2E5EB]/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="w-full sm:w-auto text-xs font-bold border-[#E2E5EB] hover:border-[#F81B00] text-[#111111] hover:text-[#F81B00] rounded-xl cursor-pointer"
            >
              <HiOutlinePlus className="size-3.5 mr-1 text-[#F81B00]" />
              Добавить этап в цепочку
            </Button>
            <span className="text-[11px] text-[#6B7280] text-right sm:text-left">
              Сумма всех этапов: <strong className="text-[#111111] font-mono">{totalAmount.toLocaleString("ru-RU")} ₽</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
