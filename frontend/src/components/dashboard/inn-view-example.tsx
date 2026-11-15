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
  email?: string
  type: "lab" | "investor_legal" | "investor_individual"
  roleLabel: string
  description: string
  specialization?: string
}

export const VERIFIED_INN_EXAMPLES: INNExampleItem[] = [
  // НАУЧНЫЕ ОРГАНИЗАЦИИ И НИИ
  {
    inn: "7728168971",
    ogrn: "1027739023412",
    name: "ФГБУН Институт металлургии и материаловедения им. А.А. Байкова РАН",
    representative: "Комлев Владимир Сергеевич",
    email: "imet-ran@science-park.ru",
    type: "lab",
    roleLabel: "НИИ / Лаборатория (РАН)",
    description: "Ведущий академический институт материаловедения, наноструктурированных сплавов и покрытий.",
    specialization: "Новые материалы, титановые сплавы, аддитивные порошки",
  },
  {
    inn: "7728038840",
    ogrn: "1027739007462",
    name: "ФГБУН Институт биоорганической химии им. М.М. Шемякина и Ю.А. Овчинникова РАН",
    representative: "Габибов Александр Габибович",
    email: "ibch@biopharm-lab.ru",
    type: "lab",
    roleLabel: "НИИ / Биотехнологии (РАН)",
    description: "Национальный флагман молекулярной биологии, биофармацевтики и таргетных пептидных соединений.",
    specialization: "Биофармацевтика, синтез ДНК/РНК, моноклональные антитела",
  },
  {
    inn: "7802059433",
    ogrn: "1027801540898",
    name: "ФГБУН Физико-технический институт им. А.Ф. Иоффе РАН",
    representative: "Иванов Сергей Викторович",
    email: "ioffe-lab@phys-tech.ru",
    type: "lab",
    roleLabel: "НИИ / Микроэлектроника (РАН)",
    description: "Колыбель полупроводниковой физики, гетероструктур, оптоэлектроники и квантовых сенсоров.",
    specialization: "Микроэлектроника, фотовольтаика, полупроводники",
  },
  {
    inn: "7729082090",
    ogrn: "1037700258694",
    name: "МГУ им. М.В. Ломоносова (Научный Парк)",
    representative: "Садовничий Виктор Антонович",
    email: "science-park@msu-rnd.ru",
    type: "lab",
    roleLabel: "ВУЗ / Исследовательский центр",
    description: "Университетский комплекс НИОКР, суперкомпьютерных вычислений и химического синтеза.",
    specialization: "ИИ, суперкомпьютеры, квантовая криптография, полимеры",
  },
  {
    inn: "7702070139",
    ogrn: "1027739178820",
    name: "МГТУ им. Н.Э. Баумана (Инжиниринговый центр)",
    representative: "Гордин Михаил Валерьевич",
    email: "rnd-bauman@engineering-center.ru",
    type: "lab",
    roleLabel: "ВУЗ / Инжиниринговый центр",
    description: "Разработка промышленной робототехники, прецизионного приборостроения и композитов.",
    specialization: "Робототехника, БПЛА, приборостроение, композиты",
  },
  {
    inn: "7813045591",
    ogrn: "1027806868154",
    name: "ФГАОУ ВО Национальный исследовательский университет ИТМО",
    representative: "Васильев Владимир Николаевич",
    email: "itmo-lab@cognitive-ai.ru",
    type: "lab",
    roleLabel: "ВУЗ / ИИ & Фотоника",
    description: "Национальный центр когнитивных разработок, фотоники, квантовых коммуникаций и ИИ.",
    specialization: "Генеративный ИИ, нейросети, квантовые сенсоры, биоинформатика",
  },
  {
    inn: "5047000551",
    ogrn: "1025006173070",
    name: "МФТИ (Физтех, лаборатории квантовых технологий)",
    representative: "Ливанов Дмитрий Викторович",
    email: "mipt-deeptech@quantum-lab.ru",
    type: "lab",
    roleLabel: "ВУЗ / DeepTech Лаборатория",
    description: "Передовые исследования в области квантовых кубитов, метаматериалов и биофизики.",
    specialization: "Квантовые процессоры, нейроинтерфейсы, биосенсоры",
  },
  {
    inn: "5408100234",
    ogrn: "1025403648600",
    name: "ФГБУН Институт катализа им. Г.К. Борескова СО РАН",
    representative: "Бухтияров Валерий Иванович",
    email: "catalysis-lab@sbras.ru",
    type: "lab",
    roleLabel: "НИИ / Химия & Энергетика (СО РАН)",
    description: "Крупнейший в мире специализированный институт в области катализа и возобновляемой энергетики.",
    specialization: "Зеленая химия, водородная энергетика, катализаторы крекинга",
  },

  // ИНВЕСТОРЫ И КОРПОРАТИВНЫЕ ЗАКАЗЧИКИ
  {
    inn: "7704217370",
    ogrn: "1027700229193",
    name: "ООО «Яндекс» (Корпоративный фонд R&D)",
    representative: "Савиновский Артем Геннадьевич",
    email: "yandex-rd@invest-corp.ru",
    type: "investor_legal",
    roleLabel: "Инвестор / Корпоративный заказчик",
    description: "Инвестиции в искусственный интеллект, робототехнику, беспилотный транспорт и сенсорику.",
    specialization: "AI/ML, автономный транспорт, роботы-манипуляторы",
  },
  {
    inn: "7707083893",
    ogrn: "1027700132195",
    name: "ПАО Сбербанк (R&D Центр DeepTech)",
    representative: "Греф Герман Оскарович",
    email: "sber-deeptech@venture-fund.ru",
    type: "investor_legal",
    roleLabel: "Инвестор / Венчурный фонд",
    description: "Финансирование опытно-промышленных разработок, грантовые программы и эскроу-контракты.",
    specialization: "Финтех, кибербезопасность, биометрия, квантовые алгоритмы",
  },
  {
    inn: "7838087541",
    ogrn: "1197847167584",
    name: "ООО «Газпромнефть - Промышленные Инновации»",
    representative: "Михайлов Денис Андреевич",
    email: "gpn-innovations@energy-tech.ru",
    type: "investor_legal",
    roleLabel: "Инвестор / Индустриальный заказчик",
    description: "Заказ прикладных НИОКР в области нефтегазохимии, катализаторов и антикоррозийных покрытий.",
    specialization: "Нефтехимия, композитные трубы, геология, шельф",
  },
  {
    inn: "7731405090",
    ogrn: "1107746405364",
    name: "АО «Объединенная двигателестроительная корпорация» (ОДК)",
    representative: "Артюхов Вадим Владиславович",
    email: "uec-invest@aero-engines.ru",
    type: "investor_legal",
    roleLabel: "Инвестор / Авиастроение & Машиностроение",
    description: "Заказы на жаропрочные сплавы, керамические композиты и аддитивные технологии двигателестроения.",
    specialization: "Турбины, жаропрочные монокристаллы, аддитивное 3D-напыление",
  },
  {
    inn: "8401005730",
    ogrn: "1028400000288",
    name: "ПАО «ГМК Норильский никель» (Технологический R&D кластер)",
    representative: "Потанин Владимир Олегович",
    email: "nornickel-tech@mining-rnd.ru",
    type: "investor_legal",
    roleLabel: "Инвестор / Горная металлургия",
    description: "Заказ разработок гидрометаллургии, экологической очистки газов и платиноидных катализаторов.",
    specialization: "Палладиевые катализаторы, глубокая переработка руд, экология",
  },
  {
    inn: "7816434440",
    ogrn: "1089847053530",
    name: "ООО «Биокад Венчурс» (Фармацевтический венчурный фонд)",
    representative: "Морозов Дмитрий Валентинович",
    email: "biocad-ventures@pharma-fund.ru",
    type: "investor_legal",
    roleLabel: "Инвестор / Фарма & Биотех",
    description: "Инвестиции ранних стадий в инновационные таргетные онкопрепараты и платформы генной терапии.",
    specialization: "Фармацевтика, биоэквивалентность, клинические испытания",
  },
  {
    inn: "500100732259",
    ogrn: "318505300054321",
    name: "ИП Соколов Алексей Дмитриевич (Бизнес-ангел)",
    representative: "Соколов Алексей Дмитриевич",
    email: "sokolov-invest@angel-syndicate.ru",
    type: "investor_individual",
    roleLabel: "Частный инвестор / Бизнес-ангел",
    description: "12-значный ИНН физлица/ИП с валидной контрольной суммой ФНС для ранних стадий НИОКР.",
    specialization: "Синдикаты, робототехника, агробиотех, pre-seed",
  },
  {
    inn: "771400284510",
    ogrn: "320774600124589",
    name: "ИП Воронов Михаил Сергеевич (HighTech Angel)",
    representative: "Воронов Михаил Сергеевич",
    email: "voronov-tech@deeptech-angel.ru",
    type: "investor_individual",
    roleLabel: "Частный инвестор / Серийный предприниматель",
    description: "Финансирование микроэлектроники, промышленных датчиков и БПЛА гражданского назначения.",
    specialization: "Микроэлектроника, сенсоры, телеметрия, IoT",
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
        className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#F81B00] hover:text-[#d01700] transition-colors cursor-pointer bg-red-50 hover:bg-red-100/80 border border-red-200 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-2xs"
      >
        <HiOutlineSparkles className="size-3.5 sm:size-4 shrink-0" />
        <span className="hidden sm:inline">Примеры проверенных данных</span>
        <span className="sm:hidden">Примеры данных</span>
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
                    {item.specialization && (
                      <div className="pt-0.5">
                        <span className="text-[10px] font-mono text-[#F81B00] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md inline-block">
                          Специализация: {item.specialization}
                        </span>
                      </div>
                    )}
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
