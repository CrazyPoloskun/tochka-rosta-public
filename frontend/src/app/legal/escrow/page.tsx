import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LEGAL_DOCUMENTS } from "@/data/legal-docs"
import { LegalDocViewer } from "@/components/legal/legal-components"

export const metadata: Metadata = {
  title: "Правила расчётов через резервный счёт (Эскроу) — Точка Роста",
  description: "Регламент безопасного резервирования средств, поэтапного перечисления оплаты исполнителям и возврата бюджета при срыве условий.",
}

export default function EscrowPage() {
  const doc = LEGAL_DOCUMENTS.find((d) => d.slug === "escrow")
  if (!doc) notFound()

  return <LegalDocViewer doc={doc} />
}
