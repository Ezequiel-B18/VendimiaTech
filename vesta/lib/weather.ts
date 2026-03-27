const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windSpeed: number;
  et0: number;
  waterBalance: number;
}

export interface WeatherResult {
  daily: DailyWeather[];
  frostRisk: boolean;
  frostAlert: { date: string; minTemp: number; hoursUntil: number } | null;
  fungalRisk: boolean;
  intenseRainRisk: boolean;
  intenseRainDays: string[];
  hailRisk: boolean;
  hailAlert: { date: string; precipitation: number; windSpeed: number } | null;
  tempDrops: string[];
  summary: {
    avgTempMax: number;
    avgTempMin: number;
    totalPrecip: number;
    totalET0: number;
    waterBalance: number;
  };
}

export async function fetchWeather(
  lat: number,
  lon: number,
): Promise<WeatherResult> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,et0_fao_evapotranspiration",
    past_days: "14",
    forecast_days: "7",
    timezone: "America/Argentina/Mendoza",
  });

  const res = await fetch(`${OPEN_METEO_URL}?${params}`);
  if (!res.ok) throw new Error(`OpenMeteo error: ${res.status}`);

  const data = await res.json();
  const { daily } = data;

  const days: DailyWeather[] = daily.time.map((date: string, i: number) => ({
    date,
    tempMax: daily.temperature_2m_max[i] ?? 0,
    tempMin: daily.temperature_2m_min[i] ?? 0,
    precipitation: daily.precipitation_sum[i] ?? 0,
    windSpeed: daily.wind_speed_10m_max[i] ?? 0,
    et0: daily.et0_fao_evapotranspiration[i] ?? 0,
    waterBalance:
      (daily.precipitation_sum[i] ?? 0) -
      (daily.et0_fao_evapotranspiration[i] ?? 0),
  }));

  // Frost risk: any forecast day (last 7) with min < 4°C
  const forecastDays = days.slice(-7);
  const frostDay = forecastDays.find((d) => d.tempMin < 4);
  const frostRisk = !!frostDay;

  let frostAlert = null;
  if (frostDay) {
    const alertDate = new Date(frostDay.date);
    const now = new Date();
    const hoursUntil = Math.max(
      0,
      Math.round((alertDate.getTime() - now.getTime()) / 3600000),
    );
    frostAlert = {
      date: frostDay.date,
      minTemp: frostDay.tempMin,
      hoursUntil,
    };
  }

  // Fungal risk: rain > 2mm in last 3 days
  const last3 = days.slice(-10, -7);
  const fungalRisk = last3.some((d) => d.precipitation > 2);

  // Intense rain: any forecast day with precipitation >= 20mm
  const intenseRainDays = forecastDays
    .filter((d) => d.precipitation >= 20)
    .map((d) => d.date);
  const intenseRainRisk = intenseRainDays.length > 0;

  // Probable hail risk: strong convective profile proxy
  // (high precipitation + strong winds in the same day)
  const hailDay = forecastDays.find(
    (d) => d.precipitation >= 8 && d.windSpeed >= 45,
  );
  const hailRisk = !!hailDay;
  const hailAlert = hailDay
    ? {
        date: hailDay.date,
        precipitation: hailDay.precipitation,
        windSpeed: hailDay.windSpeed,
      }
    : null;

  // Temp drops: days where max drops > 6°C vs previous day
  const tempDrops: string[] = [];
  for (let i = 1; i < days.length; i++) {
    if (days[i].tempMax - days[i - 1].tempMax < -6) {
      tempDrops.push(days[i].date);
    }
  }

  const totalPrecip = days.reduce((s, d) => s + d.precipitation, 0);
  const totalET0 = days.reduce((s, d) => s + d.et0, 0);
  const avgTempMax = days.reduce((s, d) => s + d.tempMax, 0) / days.length;
  const avgTempMin = days.reduce((s, d) => s + d.tempMin, 0) / days.length;

  return {
    daily: days,
    frostRisk,
    frostAlert,
    fungalRisk,
    intenseRainRisk,
    intenseRainDays,
    hailRisk,
    hailAlert,
    tempDrops,
    summary: {
      avgTempMax: Math.round(avgTempMax * 10) / 10,
      avgTempMin: Math.round(avgTempMin * 10) / 10,
      totalPrecip: Math.round(totalPrecip * 10) / 10,
      totalET0: Math.round(totalET0 * 10) / 10,
      waterBalance: Math.round((totalPrecip - totalET0) * 10) / 10,
    },
  };
}
