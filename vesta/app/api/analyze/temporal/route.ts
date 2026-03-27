import { NextRequest, NextResponse } from "next/server";
import {
  fetchSentinelImage,
  fetchSentinelImageForDate,
  calculateIndicesFromPixels,
} from "@/lib/sentinel";
import {
  analyzeTemporalWithGemini,
  extractWeatherContext,
} from "@/lib/gemini";
import { fetchWeather } from "@/lib/weather";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bbox, comparisonDateFrom, comparisonDateTo } = body as {
      bbox: number[];
      comparisonDateFrom: string; // ISO date "2026-03-01"
      comparisonDateTo: string;   // ISO date "2026-03-14"
    };

    if (!bbox || bbox.length !== 4) {
      return NextResponse.json(
        { error: "bbox must be [lon_min, lat_min, lon_max, lat_max]" },
        { status: 400 }
      );
    }

    if (!comparisonDateFrom || !comparisonDateTo) {
      return NextResponse.json(
        { error: "comparisonDateFrom and comparisonDateTo are required (ISO dates)" },
        { status: 400 }
      );
    }

    const lat = (bbox[1] + bbox[3]) / 2;
    const lon = (bbox[0] + bbox[2]) / 2;

    // Fetch current image, comparison image, and weather in parallel
    const [currentResult, comparisonResult, weatherResult] = await Promise.all([
      fetchSentinelImage(bbox),
      fetchSentinelImageForDate(bbox, comparisonDateFrom, comparisonDateTo),
      fetchWeather(lat, lon),
    ]);

    // Calculate indices for both images
    const currentIndices = calculateIndicesFromPixels(currentResult.imageBuffer);
    const comparisonIndices = calculateIndicesFromPixels(comparisonResult.imageBuffer);

    // Extract weather context
    const weatherContext = extractWeatherContext(weatherResult);

    // Temporal analysis with Gemini (two images + weather)
    const evolution = await analyzeTemporalWithGemini(
      currentResult.imageBase64,
      comparisonResult.imageBase64,
      weatherContext
    );

    return NextResponse.json({
      current: {
        imageBase64: currentResult.imageBase64,
        imageHash: currentResult.imageHash,
        indices: currentIndices,
      },
      comparison: {
        imageBase64: comparisonResult.imageBase64,
        imageHash: comparisonResult.imageHash,
        indices: comparisonIndices,
        dateRange: { from: comparisonDateFrom, to: comparisonDateTo },
      },
      evolution,
      weather: weatherResult,
      timestamp: new Date().toISOString(),
      bbox,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze/temporal]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
