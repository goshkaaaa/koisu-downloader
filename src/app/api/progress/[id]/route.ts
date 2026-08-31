import { NextRequest, NextResponse } from "next/server";
import { getJobProgress } from "@/lib/downloader";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const progress = getJobProgress(jobId);

  if (!progress) {
    return NextResponse.json(
      { success: false, error: "Задача не найдена или истекла." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: progress,
  });
}
