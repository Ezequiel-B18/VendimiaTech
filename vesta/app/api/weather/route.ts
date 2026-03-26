import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lon } = body as { lat: number; lon: number };

    if (lat === undefined || lon === undefined) {
      return NextResponse.json(
        { error: "lat and lon are required" },
        { status: 400 }
      );
    }

    const result = await fetchWeather(lat, lon);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/weather]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
