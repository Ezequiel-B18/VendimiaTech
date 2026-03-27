import { GoogleGenerativeAI } from "@google/generative-ai";
import type { WeatherResult } from "./weather";

// ─── Base agronomic prompt ───────────────────────────────────────────────────

const AGRO_PROMPT_BASE = `
Sos un agrónomo especialista en viticultura del Valle de Uco, Mendoza, Argentina.
El viñedo está a 1.000-1.200 msnm con riego por goteo controlado.

CONTEXTO DEL VALLE DE UCO:
- Los problemas principales son: granizo, heladas tardías, enfermedades fúngicas post-lluvia
- El riego es por goteo controlado — NO menciones déficit hídrico por falla de riego como causa primaria
- Variabilidad de madurez entre bloques es normal y valorada para cosecha diferenciada
- Malbec, Merlot, Cabernet son las variedades principales

LEYENDA DE LA IMAGEN SATELITAL:
- Verde intenso: vegetación sana, buena madurez (NDVI + NDRE altos)
- Verde claro: vegetación ok, madurez media
- Amarillo: vigor bajo o clorofila insuficiente
- Azul: humedad foliar alta (posible alerta fúngica post-lluvia)
- Rojo: sin vegetación (suelo, caminos, infraestructura, reservorios)
`;

// ─── Weather context builder ─────────────────────────────────────────────────

export interface WeatherContext {
  avgTempMax: number;
  avgTempMin: number;
  totalPrecip: number;
  waterBalance: number;
  frostRisk: boolean;
  frostAlert: { date: string; minTemp: number; hoursUntil: number } | null;
  fungalRisk: boolean;
  tempDrops: string[];
  recentDays: Array<{ date: string; tempMax: number; tempMin: number; precipitation: number }>;
}

export function extractWeatherContext(weather: WeatherResult): WeatherContext {
  const last7 = weather.daily.slice(-7);
  return {
    avgTempMax: weather.summary.avgTempMax,
    avgTempMin: weather.summary.avgTempMin,
    totalPrecip: weather.summary.totalPrecip,
    waterBalance: weather.summary.waterBalance,
    frostRisk: weather.frostRisk,
    frostAlert: weather.frostAlert,
    fungalRisk: weather.fungalRisk,
    tempDrops: weather.tempDrops,
    recentDays: last7.map((d) => ({
      date: d.date,
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      precipitation: d.precipitation,
    })),
  };
}

function buildClimateSection(ctx: WeatherContext): string {
  let section = `

DATOS CLIMÁTICOS REALES DE LA ZONA (últimos 14 días + pronóstico 7 días):
- Temperatura máxima promedio: ${ctx.avgTempMax}°C
- Temperatura mínima promedio: ${ctx.avgTempMin}°C
- Precipitación total acumulada: ${ctx.totalPrecip}mm
- Balance hídrico: ${ctx.waterBalance}mm ${ctx.waterBalance < 0 ? "(déficit)" : "(superávit)"}`;

  if (ctx.frostRisk && ctx.frostAlert) {
    section += `
- ⚠️ RIESGO DE HELADA DETECTADO: ${ctx.frostAlert.minTemp}°C pronosticado para ${ctx.frostAlert.date} (en ${ctx.frostAlert.hoursUntil}hs)`;
  }

  if (ctx.fungalRisk) {
    section += `
- ⚠️ RIESGO FÚNGICO ACTIVO: lluvia reciente >2mm detectada en los últimos 3 días`;
  }

  if (ctx.tempDrops.length > 0) {
    section += `
- ⚡ SHOCK TÉRMICO: caída brusca de temperatura (>6°C/día) detectada el ${ctx.tempDrops.join(", ")}`;
  }

  section += `
- Últimos 7 días de datos:`;
  for (const d of ctx.recentDays) {
    section += `
  · ${d.date}: max ${d.tempMax}°C / min ${d.tempMin}°C / lluvia ${d.precipitation}mm`;
  }

  section += `

INSTRUCCIÓN IMPORTANTE: Usá los datos climáticos para enriquecer tu análisis visual.
Si hay riesgo de helada, evaluá si la imagen muestra signos de daño por frío.
Si hay riesgo fúngico, correlacioná con las zonas azules de la imagen.
Si hay shock térmico, indicá cómo puede afectar la madurez y cosecha.`;

  return section;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildAnalysisPrompt(weather?: WeatherContext): string {
  const climateSection = weather ? buildClimateSection(weather) : "";

  const jsonSchema = weather
    ? `{
  "estado_general": "bueno|regular|malo",
  "cobertura_vegetal": "alta|media|baja",
  "zonas_problematicas": ["descripción zona 1"],
  "posibles_problemas": ["problema 1"],
  "urgencia": "inmediata|esta_semana|este_mes|sin_urgencia",
  "comparacion": "texto comparando sectores de la imagen",
  "recomendaciones_generales": ["acción 1", "acción 2", "acción 3"],
  "confianza_analisis": "alta|media|baja",
  "observaciones": "observaciones generales",
  "alerta_climatica": "evaluación integrada clima+imagen, ej: helada reciente compatible con zonas amarillas observadas",
  "correlacion_clima_imagen": "texto explicando cómo los datos climáticos se reflejan en lo que se ve en la imagen",
  "recomendaciones_climaticas": ["acción climática 1", "acción climática 2"]
}`
    : `{
  "estado_general": "bueno|regular|malo",
  "cobertura_vegetal": "alta|media|baja",
  "zonas_problematicas": ["descripción zona 1"],
  "posibles_problemas": ["problema 1"],
  "urgencia": "inmediata|esta_semana|este_mes|sin_urgencia",
  "comparacion": "texto comparando sectores de la imagen",
  "recomendaciones_generales": ["acción 1", "acción 2", "acción 3"],
  "confianza_analisis": "alta|media|baja",
  "observaciones": "observaciones generales"
}`;

  return `${AGRO_PROMPT_BASE}${climateSection}

Analizá la imagen satelital y respondé ÚNICAMENTE con este JSON sin texto adicional:
${jsonSchema}`;
}

function buildTemporalPrompt(weather?: WeatherContext): string {
  const climateSection = weather ? buildClimateSection(weather) : "";

  return `${AGRO_PROMPT_BASE}${climateSection}

Se te proporcionan DOS imágenes satelitales del MISMO viñedo en diferentes fechas.
La PRIMERA imagen es la más antigua y la SEGUNDA es la más reciente.

Tu tarea es comparar la evolución del viñedo entre ambas fechas.
Respondé ÚNICAMENTE con este JSON sin texto adicional:
{
  "cambio_general": "mejora|estable|deterioro",
  "porcentaje_cambio_ndvi": número estimado de cambio en vigor (positivo=mejora, negativo=deterioro),
  "zonas_mejoradas": ["descripción de zonas que mejoraron"],
  "zonas_deterioradas": ["descripción de zonas que empeoraron"],
  "posible_causa": "explicación de las causas probables del cambio observado",
  "tendencia": "texto breve sobre la tendencia general del viñedo",
  "recomendaciones": ["acción 1 basada en la evolución observada", "acción 2"],
  "confianza_analisis": "alta|media|baja"
}`;
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface GeminiAnalysis {
  estado_general: "bueno" | "regular" | "malo";
  cobertura_vegetal: "alta" | "media" | "baja";
  zonas_problematicas: string[];
  posibles_problemas: string[];
  urgencia: "inmediata" | "esta_semana" | "este_mes" | "sin_urgencia";
  comparacion: string;
  recomendaciones_generales: string[];
  confianza_analisis: "alta" | "media" | "baja";
  observaciones: string;
  // Climate-aware fields (present when weather data provided)
  alerta_climatica?: string;
  correlacion_clima_imagen?: string;
  recomendaciones_climaticas?: string[];
}

export interface GeminiTemporalAnalysis {
  cambio_general: "mejora" | "estable" | "deterioro";
  porcentaje_cambio_ndvi: number;
  zonas_mejoradas: string[];
  zonas_deterioradas: string[];
  posible_causa: string;
  tendencia: string;
  recomendaciones: string[];
  confianza_analisis: "alta" | "media" | "baja";
}

// ─── Analysis functions ──────────────────────────────────────────────────────

function cleanJsonResponse(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function analyzeWithGemini(
  imageBase64: string,
  weather?: WeatherContext
): Promise<GeminiAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = buildAnalysisPrompt(weather);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: imageBase64,
      },
    },
    { text: prompt },
  ]);

  const raw = result.response.text();
  return JSON.parse(cleanJsonResponse(raw)) as GeminiAnalysis;
}

export async function analyzeTemporalWithGemini(
  currentImageBase64: string,
  comparisonImageBase64: string,
  weather?: WeatherContext
): Promise<GeminiTemporalAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = buildTemporalPrompt(weather);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: comparisonImageBase64,
      },
    },
    {
      inlineData: {
        mimeType: "image/png",
        data: currentImageBase64,
      },
    },
    { text: prompt },
  ]);

  const raw = result.response.text();
  return JSON.parse(cleanJsonResponse(raw)) as GeminiTemporalAnalysis;
}
