import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getFilePath } from "@/lib/downloader";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const fileId = decodeURIComponent(params.id);
    const filePath = getFilePath(fileId);

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Файл не найден на сервере или был удалён.",
        },
        { status: 404 },
      );
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const customName = req.nextUrl.searchParams.get("name") || path.basename(filePath);
    const cleanDownloadName = customName.replace(/[\\/*?:"<>|]/g, "");

    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".m4a": "audio/mp4",
      ".flac": "audio/flac",
      ".wav": "audio/wav",
      ".aac": "audio/aac",
      ".ogg": "audio/ogg",
      ".opus": "audio/opus",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";
    const encodedFileName = encodeURIComponent(cleanDownloadName);
    const fileStream = fs.createReadStream(filePath);

    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `attachment; filename="download${ext}"; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("API /file error:", err);
    return NextResponse.json(
      { success: false, error: "Ошибка при отдаче файла: " + err.message },
      { status: 500 },
    );
  }
}
