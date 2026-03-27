import { NextRequest, NextResponse } from "next/server";
import { fetchSentinelImage, calculateIndicesFromPixels } from "@/lib/sentinel";
import { analyzeWithGemini, extractWeatherContext } from "@/lib/gemini";
import { fetchWeather } from "@/lib/weather";

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

    // Calculate center of bbox for weather query
    const lat = (bbox[1] + bbox[3]) / 2;
    const lon = (bbox[0] + bbox[2]) / 2;

    // 1. Fetch satellite image AND weather data in parallel
    const [sentinelResult, weatherResult] = await Promise.all([
      fetchSentinelImage(bbox),
      fetchWeather(lat, lon),
    ]);

    const { imageBase64, imageHash, imageBuffer } = sentinelResult;

    // 2. Calculate real indices from pixel data
    const indices = calculateIndicesFromPixels(imageBuffer);

    // 3. Extract weather context for Gemini
    const weatherContext = extractWeatherContext(weatherResult);

    // 4. Analyze with Gemini (enriched with climate data)
    const geminiAnalysis = await analyzeWithGemini(imageBase64, weatherContext);

    return NextResponse.json({
      imageBase64,
      imageHash,
      indices: {
        ndvi: indices.ndvi,
        ndre: indices.ndre,
        ndwi: indices.ndwi,
        distribution: indices.distribution,
        totalVegetationPercent: indices.totalVegetationPercent,
      },
      geminiAnalysis,
      weather: weatherResult,
      timestamp: new Date().toISOString(),
      bbox,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
