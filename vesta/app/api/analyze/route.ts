import { NextRequest, NextResponse } from "next/server";
import { fetchSentinelImage, estimateIndicesFromColors } from "@/lib/sentinel";
import { analyzeWithGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bbox } = body as { bbox: number[] };

    if (!bbox || bbox.length !== 4) {
      return NextResponse.json(
        { error: "bbox must be [lon_min, lat_min, lon_max, lat_max]" },
        { status: 400 }
      );
    }

    // 1. Fetch Sentinel-2 image
    const { imageBase64, imageHash } = await fetchSentinelImage(bbox);

    // 2. Estimate indices (simplified heuristic)
    const indices = estimateIndicesFromColors();

    // 3. Analyze with Gemini
    const geminiAnalysis = await analyzeWithGemini(imageBase64);

    return NextResponse.json({
      imageBase64,
      imageHash,
      indices,
      geminiAnalysis,
      timestamp: new Date().toISOString(),
      bbox,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
