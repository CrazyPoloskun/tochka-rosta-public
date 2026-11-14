import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LEGAL_DOCUMENTS } from "@/data/legal-docs"
import { LegalDocViewer } from "@/components/legal/legal-components"

export const metadata: Metadata = {
  title: "Политика конфиденциальности и защиты данных — Точка Роста",
  description: "Правила сбора, обработки и защиты персональных данных в соответствии с 152-ФЗ РФ на платформе «Точка Роста».",
}

export default function PrivacyPage() {
  const doc = LEGAL_DOCUMENTS.find((d) => d.slug === "privacy")
  if (!doc) notFound()

  return <LegalDocViewer doc={doc} />
}
