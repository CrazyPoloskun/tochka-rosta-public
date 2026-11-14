import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LEGAL_DOCUMENTS } from "@/data/legal-docs"
import { LegalDocViewer } from "@/components/legal/legal-components"

export const metadata: Metadata = {
  title: "Регламент модерации проектов и заявок — Точка Роста",
  description: "Правила проверки, научно-технической экспертизы и допуска исследовательских проектов и задач на платформу «Точка Роста».",
}

export default function ModerationPage() {
  const doc = LEGAL_DOCUMENTS.find((d) => d.slug === "moderation")
  if (!doc) notFound()

  return <LegalDocViewer doc={doc} />
}
