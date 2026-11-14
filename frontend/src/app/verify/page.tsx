"use client"

import * as React from "react"
import Link from "next/link"
import {
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentArrowDown,
  HiOutlineCheckBadge,
  HiOutlineBuildingOffice2,
  HiOutlineUserCircle,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineArrowLeft,
  HiOutlineDocumentCheck,
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

export default function VerifyPage() {
  const [searchKey, setSearchKey] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<VerifyResult | null>(null)
  const [hasSearched, setHasSearched] = React.useState(false)

  // File checking state
  const [checkingFile, setCheckingFile] = React.useState(false)
  const [calculatedFileHash, setCalculatedFileHash] = React.useState("")

  const handleVerify = async (keyToVerify?: string) => {
    const key = (keyToVerify || searchKey).trim()
    if (!key) return

    setLoading(true)
    setHasSearched(true)
    setResult(null)

    try {
      let res = await fetch(`/api/v1/public/verify/${encodeURIComponent(key)}`)
      if (!res.ok) {
        res = await fetch(`/api/v1/certificates/public/verify/${encodeURIComponent(key)}`)
      }
      if (res.ok) {
        const data: VerifyResult = await res.json()
        setResult(data)
      } else {
        setResult({
          valid: false,
          message: "Сервер проверки временно недоступен. Повторите попытку позже.",
        })
      }
    } catch {
      setResult({
        valid: false,
        message: "Ошибка сетевого соединения с депозитарием.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCheckingFile(true)
    setLoading(true)
    setHasSearched(true)
    setResult(null)

    try {
      // 1. Вычисляем SHA-256 хэш файла
      const buffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
      setCalculatedFileHash(hashHex)
      setSearchKey(hashHex)

      // 2. Отправляем на серверную верификацию (включая проверку содержимого PDF-свидетельств)
      const formData = new FormData()
      formData.append("file", file)
      const checkRes = await fetch("/api/v1/public/verify/check-file", {
        method: "POST",
        body: formData,
      })

      if (checkRes.ok) {
        const fileData = await checkRes.json()
        if (fileData.matched) {
          const verifyKey = fileData.certificate_number || fileData.file_sha256 || hashHex
          const fullRes = await fetch(`/api/v1/public/verify/${encodeURIComponent(verifyKey)}`)
          if (fullRes.ok) {
            const data: VerifyResult = await fullRes.json()
            setResult(data)
            return
          }
        }
      }

      // 3. Если через check-file не найдено, проверяем по вычисленному хэшу
      await handleVerify(hashHex)
    } catch (err) {
      console.error("SHA-256 computation error:", err)
      await handleVerify()
    } finally {
      setCheckingFile(false)
      setLoading(false)
    }
  }

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
              Реестр Депозитария РИД
            </span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-[#111111] transition-colors"
          >
            <HiOutlineArrowLeft className="w-3.5 h-3.5" />
            <span>В личный кабинет</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 min-w-0">
        {/* Title & Description */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#E2E5EB] rounded-full shadow-2xs text-[11px] font-mono uppercase tracking-wider text-[#111111] mb-2">
            <HiOutlineShieldCheck className="w-4 h-4 text-[#F81B00]" />
            Публичный аудит авторского приоритета (Prior Art / Proof of Existence)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
            Верификация свидетельств депонирования
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Проверка подлинности фиксации научно-технических решений, ТЗ и патентов в распределённом
            реестре по криптографическому SHA-256 отпечатку или номеру свидетельства TR-2026.
          </p>
        </div>

        {/* Search & Verification Input */}
        <div className="bg-white border border-[#E2E5EB] rounded-2xl shadow-sm p-4 sm:p-6 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleVerify()
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Вставьте SHA-256 отпечаток или номер свидетельства (e.g. TR-2026-A1B2C3)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-[#E2E5EB] rounded-xl focus:border-[#111111] focus:bg-white text-xs sm:text-sm font-mono text-[#111111] placeholder:text-neutral-400 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchKey.trim()}
              className="px-6 py-2.5 bg-[#111111] hover:bg-[#F81B00] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                  <span>Проверка...</span>
                </>
              ) : (
                <span>Проверить в реестре</span>
              )}
            </button>
          </form>

          {/* Quick File Check */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#F1F3F5] text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <HiOutlineDocumentCheck className="w-4 h-4 text-[#F81B00]" />
              Или загрузите файл документа для автоматического расчета SHA-256:
            </span>
            <label className="px-3.5 py-1.5 bg-[#F5F6F8] border border-[#E2E5EB] hover:border-[#111111] rounded-xl text-xs font-mono text-[#111111] cursor-pointer transition-colors shrink-0 shadow-2xs">
              {checkingFile ? "Вычисление хеша..." : "Выбрать файл..."}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={checkingFile} />
            </label>
          </div>
        </div>

        {/* Results Presentation */}
        {hasSearched && !loading && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {result?.valid ? (
              <div className="bg-white border-2 border-emerald-600 rounded-2xl shadow-xl overflow-hidden">
                {/* Emerald Verification Banner */}
                <div className="bg-emerald-600 px-4 sm:px-6 py-4 text-white flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <HiOutlineCheckBadge className="w-7 h-7 text-white shrink-0" />
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-100">
                        Официальный статус
                      </div>
                      <div className="text-sm sm:text-base font-bold">
                        ЗАПИСЬ ДЕПОНИРОВАНА И ВЕРИФИЦИРОВАНА В РАСПРЕДЕЛЕННОМ РЕЕСТРЕ
                      </div>
                    </div>
                  </div>
                  {result.certificate_number && (
                    <span className="px-3 py-1 bg-white text-[#111111] font-mono text-xs font-bold tracking-wider rounded-lg shadow-xs">
                      {result.certificate_number}
                    </span>
                  )}
                </div>

                {/* Dossier Information */}
                <div className="p-4 sm:p-8 space-y-6">
                  {/* Title */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      Объект интеллектуальной собственности:
                    </span>
                    <h2 className="text-lg sm:text-2xl font-extrabold text-[#111111] leading-snug">
                      {result.object_title}
                    </h2>
                    <span className="inline-block mt-1 px-2.5 py-0.5 text-xs font-mono bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-md">
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
                    <div className="p-3 bg-[#111111] text-white text-[11px] sm:text-xs font-mono break-all rounded-xl selection:bg-[#F81B00]">
                      {result.sha256_hash}
                    </div>
                  </div>

                  {/* Legal Basis Disclaimer */}
                  <div className="p-4 bg-[#F9FAFB] border border-[#E2E5EB] rounded-xl text-xs text-neutral-600 leading-relaxed">
                    <strong>Юридическое основание:</strong> {result.legal_basis}
                    <p className="mt-1 text-[11px] text-neutral-400">
                      Свидетельство признается судами РФ и арбитражем в качестве надлежащего доказательства
                      первенства и существования РИД на момент времени депонирования.
                    </p>
                  </div>

                  {/* Download PDF button */}
                  {result.download_url && (
                    <div className="pt-2 flex justify-end">
                      <a
                        href={result.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#F81B00] text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-xl shadow-xs"
                      >
                        <HiOutlineDocumentArrowDown className="w-4 h-4" />
                        Скачать официальное свидетельство (PDF)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-red-500 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <HiOutlineShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#111111]">
                  Запись не найдена в реестре депозитария
                </h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  {result?.message || "Объект с данным отпечатком или регистрационным номером отсутствует в реестре «Точка Роста»."}
                </p>
              </div>
            )}
          </div>
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
