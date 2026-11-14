import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  BETA_COOKIE_NAME,
  computeBetaToken,
  getBetaCode,
} from "@/lib/beta-auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const enteredCode = typeof body.code === "string" ? body.code.trim() : ""

    const correctCode = getBetaCode().trim()

    if (!enteredCode) {
      return NextResponse.json(
        { success: false, error: "Введите код тестировщика" },
        { status: 400 }
      )
    }

    if (enteredCode !== correctCode) {
      return NextResponse.json(
        { success: false, error: "Неверный код доступа. Обратитесь к администратору." },
        { status: 401 }
      )
    }

    // Code is correct: compute secure token
    const token = await computeBetaToken(correctCode)

    const response = NextResponse.json({ success: true, token })

    // Set cookie valid for 30 days with secure: true
    response.cookies.set({
      name: BETA_COOKIE_NAME,
      value: token,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (error) {
    console.error("Beta verification error:", error)
    return NextResponse.json(
      { success: false, error: "Внутренняя ошибка сервера проверки" },
      { status: 500 }
    )
  }
}
