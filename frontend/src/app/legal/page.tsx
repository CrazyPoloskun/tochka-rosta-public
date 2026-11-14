import type { Metadata } from "next"
import Link from "next/link"
import { HiOutlineClock } from "react-icons/hi2"

import { LEGAL_DOCUMENTS } from "@/data/legal-docs"
import { LegalHeader, LegalFooter, DocIcon } from "@/components/legal/legal-components"

export const metadata: Metadata = {
  title: "Документы и регламенты — Точка Роста",
  description: "Официальные регламенты, правила расчётов и защита прав на платформе «Точка Роста».",
}

export default function LegalIndexPage() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111111] font-sans antialiased flex flex-col selection:bg-[#F81B00] selection:text-white">
      <LegalHeader />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Компактный заголовок без лишних плашек */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Документы и регламенты
            </h1>
            <p className="text-sm text-[#4B5563] leading-relaxed max-w-2xl">
              Официальные правила работы, порядок безопасных расчётов и фиксация интеллектуальных прав платформы.
            </p>
          </div>

          {/* Список документов с иконками и анимированной полосой внизу */}
          <div className="bg-white border border-[#E2E5EB] rounded-2xl divide-y divide-[#E2E5EB] shadow-xs overflow-hidden">
            {LEGAL_DOCUMENTS.map((doc) => (
              <Link
                key={doc.id}
                href={`/legal/${doc.slug}`}
                className="relative p-5 sm:p-6 flex items-start gap-4 hover:bg-[#F9FAFB] transition-colors group overflow-hidden"
              >
                <div className="size-11 sm:size-12 rounded-xl bg-[#F5F6F8] border border-[#E2E5EB] flex items-center justify-center shrink-0">
                  <DocIcon slug={doc.slug} className="size-6 text-[#F81B00]" />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-[#111111] group-hover:text-[#F81B00] transition-colors leading-snug">
                    {doc.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    {doc.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[#6B7280] pt-1">
                    <HiOutlineClock className="size-3.5" />
                    <span>~{doc.readingTime}</span>
                  </div>
                </div>

                {/* Анимированная красная линия слева направо внизу карточки */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[2.5px] w-full bg-[#F81B00] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left pointer-events-none"
                />
              </Link>
            ))}
          </div>

        </div>
      </main>

      <LegalFooter />
    </div>
  )
}
