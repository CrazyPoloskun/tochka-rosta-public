"use client"

import * as React from "react"
import {
  HiOutlineBuildingLibrary,
  HiOutlineCheckCircle,
  HiOutlineDocumentDuplicate,
  HiOutlineSparkles,
  HiOutlineUser,
  HiOutlineInformationCircle,
} from "react-icons/hi2"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/ui/copy-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export interface INNExampleItem {
  inn: string
  ogrn: string
  name: string
  representative: string
  type: "lab" | "investor_legal" | "investor_individual"
  roleLabel: string
  description: string
}

export const VERIFIED_INN_EXAMPLES: INNExampleItem[] = [
  {
    inn: "7728168971",
    ogrn: "1027739023412",
    name: "ФГБУН Институт металлургии и материаловедения им. А.А. Байкова РАН",
    representative: "Комлев Владимир Сергеевич",
    type: "lab",
    roleLabel: "НИИ / Лаборатория (РАН)",
    description: "Ведущий академический институт материаловедения, наноструктурированных сплавов и покрытий.",
  },
  {
    inn: "7729082090",
    ogrn: "1037700258694",
    name: "МГУ им. М.В. Ломоносова (Научный Парк)",
    representative: "Садовничий Виктор Антонович",
    type: "lab",
    roleLabel: "ВУЗ / Исследовательский центр",
    description: "Университетский комплекс НИОКР, биотехнологий, химического синтеза и лазерных технологий.",
  },
  {
    inn: "7702070139",
    ogrn: "1027739178820",
    name: "МГТУ им. Н.Э. Баумана (Инжиниринговый центр)",
    representative: "Гордин Михаил Валерьевич",
    type: "lab",
    roleLabel: "ВУЗ / Инжиниринговый центр",
    description: "Разработка робототехники, прецизионного приборостроения и композитов для промышленности.",
  },
  {
    inn: "7704217370",
    ogrn: "1027700229193",
    name: "ООО «Яндекс» (Корпоративный фонд R&D)",
    representative: "Савиновский Артем Геннадьевич",
    type: "investor_legal",
    roleLabel: "Инвестор / Корпоративный заказчик",
    description: "Инвестиции в искусственный интеллект, робототехнику, сенсорику и микроэлектронику.",
  },
  {
    inn: "7707083893",
    ogrn: "1027700132195",
    name: "ПАО Сбербанк (R&D Центр DeepTech)",
    representative: "Греф Герман Оскарович",
    type: "investor_legal",
    roleLabel: "Инвестор / Венчурный фонд",
    description: "Финансирование опытно-промышленных разработок, грантовые программы и эскроу-контракты.",
  },
  {
    inn: "500100732259",
    ogrn: "318505300054321",
    name: "ИП Соколов Алексей Дмитриевич (Бизнес-ангел)",
    representative: "Соколов Алексей Дмитриевич",
    type: "investor_individual",
    roleLabel: "Частный инвестор / Бизнес-ангел",
    description: "12-значный ИНН физлица/ИП с валидной контрольной суммой ФНС для ранних стадий НИОКР.",
  },
]

interface InnViewExampleProps {
  onSelect?: (example: INNExampleItem) => void
  currentRole?: "lab" | "investor"
}

export function InnViewExample({ onSelect, currentRole }: InnViewExampleProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    if (!currentRole) return VERIFIED_INN_EXAMPLES
    if (currentRole === "lab") {
      return VERIFIED_INN_EXAMPLES.filter((x) => x.type === "lab")
    }
    return VERIFIED_INN_EXAMPLES.filter((x) => x.type !== "lab")
  }, [currentRole])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F81B00] hover:text-[#d01700] transition-colors cursor-pointer bg-red-50 hover:bg-red-100/70 border border-red-200/80 px-2.5 py-1 rounded-lg"
      >
        <HiOutlineSparkles className="size-3.5" />
        <span>Примеры проверенных ИНН для тестов</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111111] flex items-center gap-2">
              <HiOutlineBuildingLibrary className="size-5 text-[#F81B00]" />
              <span>База проверенных ИНН и реквизитов (ФНС валидация 100%)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Все указанные ниже реквизиты имеют математически подтверждённую контрольную сумму по
              алгоритму ФНС РФ (ГОСТ Р) и позволяют мгновенно сохранить профиль и создавать проекты.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {filtered.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-[#F8FAFC] border border-[#E2E5EB] hover:border-[#111111]/30 rounded-xl transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111111]">{item.name}</span>
                      <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {item.roleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">{item.description}</p>
                  </div>

                  {onSelect && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelect(item)
                        setIsOpen(false)
                      }}
                      className="text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-xl shadow-xs shrink-0 cursor-pointer"
                    >
                      Подставить в форму
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#F1F3F5] text-[11px]">
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">ИНН:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#111111]">{item.inn}</span>
                      <CopyButton text={item.inn} label="ИНН" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">ОГРН:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#111111]">{item.ogrn}</span>
                      <CopyButton text={item.ogrn} label="ОГРН" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold">Представитель:</span>
                    <span className="font-medium text-[#111111] truncate block">{item.representative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <HiOutlineInformationCircle className="size-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Почему важна контрольная сумма:</strong> В Российской Федерации последняя цифра
              10-значного ИНН и две последние цифры 12-значного ИНН вычисляются по специальным взвешенным
              коэффициентам. Платформа «Точка Роста» проверяет эту математическую формулу при сохранении,
              гарантируя защиту от некорректных контрагентов.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
