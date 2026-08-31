import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  DownloadOptions,
  DownloadProgress,
  MediaPlatform,
  VideoInfo,
} from "@/types";

type KoisuGlobal = typeof globalThis & {
  __koisuDownloadJobs?: Map<string, DownloadProgress>;
};

const globalJobs =
  ((globalThis as KoisuGlobal).__koisuDownloadJobs ??= new Map<
    string,
    DownloadProgress
  >());

function getPythonCommand(): string {
  return process.env.PYTHON_CMD || "python";
}

function readPayloadNumber(payload: any, camel: string, snake: string) {
  return typeof payload[camel] === "number" ? payload[camel] : payload[snake];
}

export async function fetchVideoInfo(
  url: string,
  platform: MediaPlatform = "youtube",
): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const pythonCmd = getPythonCommand();
    const scriptPath = path.resolve(process.cwd(), "engine.py");

    const proc = spawn(pythonCmd, [scriptPath, "info", url, platform], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdoutData = "";
    let stderrData = "";

    proc.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString("utf-8");
    });

    proc.stderr.on("data", (chunk) => {
      stderrData += chunk.toString("utf-8");
    });

    proc.on("close", (code) => {
      if (code !== 0 && !stdoutData.includes("JSON_MSG:")) {
        return reject(
          new Error(stderrData || `Процесс завершился с кодом ${code}`),
        );
      }

      const lines = stdoutData.split("\n");
      for (const line of lines) {
        if (!line.startsWith("JSON_MSG:")) continue;

        try {
          const parsed = JSON.parse(line.substring(9).trim());
          if (parsed.error) {
            return reject(new Error(parsed.error));
          }
          if (parsed.status === "info_success" && parsed.data) {
            return resolve(parsed.data as VideoInfo);
          }
        } catch (e: any) {
          return reject(
            new Error("Не удалось разобрать ответ движка: " + e.message),
          );
        }
      }

      reject(
        new Error(
          stderrData ||
            "Не удалось получить данные о видео. Проверьте ссылку и доступность ролика.",
        ),
      );
    });

    proc.on("error", (err) => {
      reject(new Error("Ошибка запуска Python-движка: " + err.message));
    });
  });
}

export function startDownloadJob(options: DownloadOptions): { jobId: string } {
  const jobId = Math.random().toString(36).substring(2, 10);
  const pythonCmd = getPythonCommand();
  const scriptPath = path.resolve(process.cwd(), "engine.py");

  const initialProgress: DownloadProgress = {
    jobId,
    status: "starting",
    percent: 0,
    message: "Подготовка загрузки...",
    createdAt: Date.now(),
    mode: options.mode,
    platform: options.platform,
    format: options.format,
  };

  globalJobs.set(jobId, initialProgress);

  const args = [
    scriptPath,
    "download",
    options.url,
    options.mode,
    options.quality || "best",
    options.format || (options.mode === "audio" ? "mp3" : "mp4"),
    options.trimStart || "",
    options.trimEnd || "",
    options.embedThumbnail === false ? "false" : "true",
    options.platform || "youtube",
    options.noWatermark === false ? "false" : "true",
  ];

  const proc = spawn(pythonCmd, args, {
    cwd: process.cwd(),
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });

  let leftover = "";

  proc.stdout.on("data", (chunk) => {
    const text = leftover + chunk.toString("utf-8");
    const lines = text.split("\n");
    leftover = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("JSON_MSG:")) continue;

      try {
        const payload = JSON.parse(trimmed.substring(9));
        const current = globalJobs.get(jobId) || initialProgress;

        if (payload.status === "starting") {
          globalJobs.set(jobId, {
            ...current,
            status: "starting",
            percent: payload.percent ?? current.percent,
            message: payload.message || "Подготовка загрузки...",
          });
        } else if (payload.status === "downloading") {
          const downloadedBytes = readPayloadNumber(
            payload,
            "downloadedBytes",
            "downloaded_bytes",
          );
          const totalBytes = readPayloadNumber(
            payload,
            "totalBytes",
            "total_bytes",
          );

          globalJobs.set(jobId, {
            ...current,
            status: "downloading",
            percent: payload.percent ?? current.percent,
            speed: payload.speed || current.speed,
            eta: payload.eta || current.eta,
            downloadedBytes,
            totalBytes,
            message: `Загрузка: ${Math.round(payload.percent ?? current.percent)}%`,
          });
        } else if (payload.status === "converting") {
          globalJobs.set(jobId, {
            ...current,
            status: "converting",
            percent: payload.percent ?? 92,
            message: payload.message || "Файл обрабатывается...",
          });
        } else if (payload.status === "ready") {
          globalJobs.set(jobId, {
            ...current,
            status: "ready",
            percent: 100,
            fileId: payload.file_id,
            fileName: payload.file_name,
            fileSize: payload.file_size,
            title: payload.title,
            duration: payload.duration,
            format: payload.format,
            mode: payload.mode || options.mode,
            message: "Файл готов к скачиванию.",
          });
        } else if (payload.status === "error" || payload.error) {
          const error = payload.error || "Ошибка при загрузке";
          globalJobs.set(jobId, {
            ...current,
            status: "error",
            error,
            message: error,
          });
        }
      } catch (err) {
        console.error("Error parsing engine output line:", trimmed, err);
      }
    }
  });

  proc.stderr.on("data", (chunk) => {
    console.error("Engine stderr:", chunk.toString("utf-8"));
  });

  proc.on("close", (code) => {
    const current = globalJobs.get(jobId);
    if (current && current.status !== "ready" && current.status !== "error") {
      if (code !== 0) {
        globalJobs.set(jobId, {
          ...current,
          status: "error",
          error: `Процесс завершился с кодом ошибки ${code}`,
        });
      }
    }
  });

  proc.on("error", (err) => {
    const current = globalJobs.get(jobId);
    if (current) {
      globalJobs.set(jobId, {
        ...current,
        status: "error",
        error: `Системная ошибка: ${err.message}`,
      });
    }
  });

  return { jobId };
}

export function getJobProgress(jobId: string): DownloadProgress | undefined {
  return globalJobs.get(jobId);
}

export function getFilePath(fileId: string): string | null {
  const sanitized = path.basename(fileId);
  const fullPath = path.resolve(process.cwd(), "downloads", sanitized);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}
