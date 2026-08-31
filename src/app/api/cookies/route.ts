import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const COOKIE_PATH = path.resolve(process.cwd(), "cookies.txt");

export async function GET() {
  try {
    const exists = fs.existsSync(COOKIE_PATH);
    if (!exists) {
      return NextResponse.json({ hasCookies: false });
    }

    const stat = fs.statSync(COOKIE_PATH);
    return NextResponse.json({
      hasCookies: stat.size > 0,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ hasCookies: false, error: err.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Содержимое cookies не может быть пустым." },
        { status: 400 },
      );
    }

    fs.writeFileSync(COOKIE_PATH, content.trim(), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Файл cookies.txt сохранён.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Ошибка сохранения cookies: " + err.message },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    if (fs.existsSync(COOKIE_PATH)) {
      fs.unlinkSync(COOKIE_PATH);
    }
    return NextResponse.json({ success: true, message: "Cookies удалены." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Ошибка удаления: " + err.message },
      { status: 500 },
    );
  }
}
