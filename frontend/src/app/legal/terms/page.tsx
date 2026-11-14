import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LEGAL_DOCUMENTS } from "@/data/legal-docs"
import { LegalDocViewer } from "@/components/legal/legal-components"

export const metadata: Metadata = {
  title: "Пользовательское соглашение — Точка Роста",
  description: "Публичная оферта об использовании платформы «Точка Роста», взаимных правах, обязанностях и юридической силе электронных действий.",
}

export default function TermsPage() {
  const doc = LEGAL_DOCUMENTS.find((d) => d.slug === "terms")
  if (!doc) notFound()

  return <LegalDocViewer doc={doc} />
}
