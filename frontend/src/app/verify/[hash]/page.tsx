"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  HiOutlineShieldCheck,
  HiOutlineDocumentArrowDown,
  HiOutlineCheckBadge,
  HiOutlineBuildingOffice2,
  HiOutlineUserCircle,
  HiOutlineClock,
  HiOutlineArrowLeft,
} from "react-icons/hi2"

import { CopyButton } from "@/components/ui/copy-button"

interface VerifyResult {
  valid: boolean
  status?: string
  certificate_number?: string
  sha256_hash?: string
  object_title?: string
  entity_type?: string
  author_name?: string
  org_name?: string
  inn?: string
  ogrn?: string
  entity_type_label?: string
  deposited_at?: string
  download_url?: string
  legal_basis?: string
  message?: string
}

function VerifyHashContent() {
  const params = useParams()
  const rawHash = (params?.hash as string) || ""

  const [loading, setLoading] = React.useState(true)
  const [result, setResult] = React.useState<VerifyResult | null>(null)

  React.useEffect(() => {
    if (!rawHash) return

    let isMounted = true
    setLoading(true)

    fetch(`/api/v1/public/verify/${encodeURIComponent(rawHash)}`)
      .then((res) => res.json())
      .then((data: VerifyResult) => {
        if (isMounted) setResult(data)
      })
      .catch(() => {
        if (isMounted) {
          setResult({
            valid: false,
            message: "Ошибка сетевого соединения с реестром депозитария.",
          })
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [rawHash])

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111111] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#E2E5EB] bg-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-[#F81B00]" />
              <span className="text-sm font-bold tracking-tight uppercase">Точка Роста</span>
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
              Валидация QR-кода свидетельства
            </span>
          </div>

          <Link
            href="/verify"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-[#111111] transition-colors"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" />
            <span>В реестр проверки</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        {loading && (
          <div className="bg-white border border-[#E2E5EB] p-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-neutral-500">
              Сверка цифрового отпечатка в реестре депозитария...
            </p>
          </div>
        )}

        {!loading && result && (
          <>
            {result.valid ? (
              <div className="bg-white border-2 border-emerald-600 shadow-xl overflow-hidden animate-in fade-in duration-300">
                {/* Emerald Verification Banner */}
                <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <HiOutlineCheckBadge className="w-7 h-7 text-white shrink-0" />
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-emerald-100">
                        Официальная валидация
                      </div>
                      <div className="text-base sm:text-lg font-bold">
                        ПОДЛИННОСТЬ СВИДЕТЕЛЬСТВА ПОДТВЕРЖДЕНА В ДЕПОЗИТАРИИ
                      </div>
                    </div>
                  </div>
                  {result.certificate_number && (
                    <span className="px-3 py-1 bg-white text-[#111111] font-mono text-xs font-bold tracking-wider">
                      {result.certificate_number}
                    </span>
                  )}
                </div>

                {/* Dossier Information */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Title */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      Объект интеллектуальной собственности:
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#111111] leading-snug">
                      {result.object_title}
                    </h2>
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {result.entity_type_label || "Научно-техническая разработка"}
                    </span>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-[#E2E5EB]">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Правообладатель / Автор:
                      </span>
                      <div className="text-sm font-bold text-[#111111] flex items-center gap-1.5">
                        <HiOutlineUserCircle className="w-4 h-4 text-neutral-400" />
                        {result.author_name}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Организация:
                      </span>
                      <div className="text-sm font-bold text-[#111111] flex items-center gap-1.5">
                        <HiOutlineBuildingOffice2 className="w-4 h-4 text-neutral-400" />
                        {result.org_name || "Индивидуальный разработчик"}
                      </div>
                    </div>

                    {result.inn && (
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">
                          Реквизиты (ИНН / ОГРН):
                        </span>
                        <div className="text-xs font-mono text-[#111111]">
                          ИНН: <strong>{result.inn}</strong> {result.ogrn ? `| ОГРН: ${result.ogrn}` : ""}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">
                        Дата и время фиксации приоритета:
                      </span>
                      <div className="text-xs font-mono text-[#111111] flex items-center gap-1.5">
                        <HiOutlineClock className="w-4 h-4 text-neutral-400" />
                        {result.deposited_at}
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Block */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                        Цифровой криптографический отпечаток (SHA-256):
                      </span>
                      {result.sha256_hash && (
                        <CopyButton text={result.sha256_hash} label="Скопировать хэш" />
                      )}
                    </div>
                    <div className="p-3 bg-[#111111] text-white text-xs font-mono break-all selection:bg-[#F81B00]">
                      {result.sha256_hash}
                    </div>
                  </div>

                  {/* Legal Basis Disclaimer */}
                  <div className="p-4 bg-[#F9FAFB] border border-[#E2E5EB] text-xs text-neutral-600 leading-relaxed">
                    <strong>Юридическое основание:</strong> {result.legal_basis}
                  </div>

                  {/* Download PDF button */}
                  {result.download_url && (
                    <div className="pt-2 flex justify-end">
                      <a
                        href={result.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#F81B00] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        <HiOutlineDocumentArrowDown className="w-4 h-4" />
                        Скачать официальное свидетельство (PDF)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-red-500 p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <HiOutlineShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#111111]">
                  Запись не найдена в реестре депозитария
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  {result.message || "Данный цифровой отпечаток не зарегистрирован на платформе."}
                </p>
                <div className="pt-3">
                  <Link
                    href="/verify"
                    className="px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Перейти к поиску
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E5EB] bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs font-mono text-neutral-400">
          Платформа трансфера технологий «Точка Роста» • Единый депозитарий научно-технических решений
        </div>
      </footer>
    </div>
  )
}

export default function VerifyHashPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#F81B00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyHashContent />
    </React.Suspense>
  )
}
