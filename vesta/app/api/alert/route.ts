import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/lib/weather";
import { buildAlerts } from "@/lib/alerts";

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

    const weather = await fetchWeather(lat, lon);

    const tempMaxes = weather.daily.map((d) => d.tempMax);
    const tempMins = weather.daily.map((d) => d.tempMin);
    const dates = weather.daily.map((d) => d.date);
    const precipitations = weather.daily.map((d) => d.precipitation);

    const alerts = buildAlerts(tempMaxes, tempMins, dates, precipitations);

    return NextResponse.json({
      alerts,
      frostRisk: weather.frostRisk,
      frostAlert: weather.frostAlert,
      fungalRisk: weather.fungalRisk,
      tempDrops: weather.tempDrops,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/alert]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
