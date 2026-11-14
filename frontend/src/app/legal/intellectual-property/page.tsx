import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LEGAL_DOCUMENTS } from "@/data/legal-docs"
import { LegalDocViewer } from "@/components/legal/legal-components"

export const metadata: Metadata = {
  title: "Регламент фиксации прав на РИД и патенты — Точка Роста",
  description: "Защита авторских прав, криптографическое депонирование идей, передача исключительных прав заказчику и оформление патентов.",
}

export default function IntellectualPropertyPage() {
  const doc = LEGAL_DOCUMENTS.find((d) => d.slug === "intellectual-property")
  if (!doc) notFound()

  return <LegalDocViewer doc={doc} />
}
