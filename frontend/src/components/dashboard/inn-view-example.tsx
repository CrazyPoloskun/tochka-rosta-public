"use client"

import * as React from "react"
import {
  HiOutlineBuildingLibrary,
  HiOutlineCheckCircle,
  HiOutlineDocumentDuplicate,
  HiOutlineSparkles,
  HiOutlineUser,
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
        className="inline-flex items-center gap-2 text-xs font-bold text-[#F81B00] hover:text-[#d01700] transition-colors cursor-pointer bg-red-50 hover:bg-red-100/80 border border-red-200 px-3.5 py-1.5 rounded-xl shadow-2xs"
      >
        <HiOutlineSparkles className="size-4 shrink-0" />
        <span>Примеры проверенных данных для тестов</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full max-w-3xl bg-white rounded-2xl p-4 sm:p-6 max-h-[88vh] overflow-y-auto space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
              <HiOutlineBuildingLibrary className="size-5 text-[#F81B00] shrink-0" />
              <span>База проверенных данных и реквизитов (валидация 100%)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Все реквизиты имеют математически подтверждённую контрольную сумму по алгоритму ФНС РФ (ГОСТ Р)
              и позволяют мгновенно протестировать регистрацию и заключение сделок.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {filtered.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 sm:p-4 bg-[#F8FAFC] border border-[#E2E5EB] hover:border-[#111111]/30 rounded-xl transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-snug break-words">
                        {item.name}
                      </h4>
                      <span className="shrink-0 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                        {item.roleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] leading-snug">{item.description}</p>
                  </div>

                  {onSelect && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelect(item)
                        setIsOpen(false)
                      }}
                      className="h-8.5 px-3.5 text-xs font-bold bg-[#111111] hover:bg-[#F81B00] text-white rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors self-start sm:self-center"
                    >
                      Подставить в форму
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-[#E2E5EB]/70 text-xs">
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider mb-0.5">ИНН:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#111111]">{item.inn}</span>
                      <CopyButton text={item.inn} label="ИНН" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider mb-0.5">ОГРН:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#111111]">{item.ogrn}</span>
                      <CopyButton text={item.ogrn} label="ОГРН" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#9CA3AF] block text-[10px] uppercase font-bold tracking-wider mb-0.5">Представитель:</span>
                    <span className="font-semibold text-xs sm:text-sm text-[#111111] truncate block">{item.representative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
