import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const COOKIE_PATH = path.resolve(process.cwd(), "cookies.txt");
const COOKIE_SETTINGS_PATH = path.resolve(
  process.cwd(),
  "downloads",
  "cookie-settings.json",
);
const SUPPORTED_BROWSERS = new Set(["chrome", "edge", "firefox", "brave", "opera"]);

function readCookieSettings() {
  try {
    if (!fs.existsSync(COOKIE_SETTINGS_PATH)) {
      return { source: "file", browser: "chrome" };
    }
    return JSON.parse(fs.readFileSync(COOKIE_SETTINGS_PATH, "utf-8"));
  } catch {
    return { source: "file", browser: "chrome" };
  }
}

function writeCookieSettings(settings: { source: string; browser?: string }) {
  fs.mkdirSync(path.dirname(COOKIE_SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(COOKIE_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

export async function GET() {
  try {
    const exists = fs.existsSync(COOKIE_PATH);
    const settings = readCookieSettings();
    if (!exists) {
      return NextResponse.json({
        hasCookies: false,
        source: settings.source,
        browser: settings.browser,
      });
    }

    const stat = fs.statSync(COOKIE_PATH);
    return NextResponse.json({
      hasCookies: stat.size > 0,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
      source: settings.source,
      browser: settings.browser,
    });
  } catch (err: any) {
    const settings = readCookieSettings();
    return NextResponse.json({
      hasCookies: false,
      source: settings.source,
      browser: settings.browser,
      error: err.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, source, browser } = body;

    if (source === "browser") {
      const cleanBrowser = String(browser || "chrome").toLowerCase();
      if (!SUPPORTED_BROWSERS.has(cleanBrowser)) {
        return NextResponse.json(
          { success: false, error: "Выберите Chrome, Edge, Firefox, Brave или Opera." },
          { status: 400 },
        );
      }

      writeCookieSettings({ source: "browser", browser: cleanBrowser });
      return NextResponse.json({
        success: true,
        source: "browser",
        browser: cleanBrowser,
        message: `KOISU будет брать cookies из ${cleanBrowser}.`,
      });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Содержимое cookies не может быть пустым." },
        { status: 400 },
      );
    }

    fs.writeFileSync(COOKIE_PATH, content.trim(), "utf-8");
    writeCookieSettings({ source: "file", browser: "chrome" });

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
    writeCookieSettings({ source: "none", browser: "chrome" });
    return NextResponse.json({ success: true, message: "Cookies удалены." });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Ошибка удаления: " + err.message },
      { status: 500 },
    );
  }
}
