import { GoogleGenerativeAI } from "@google/generative-ai";

const AGRO_PROMPT = `
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

Analizá la imagen satelital y respondé ÚNICAMENTE con este JSON sin texto adicional:
{
  "estado_general": "bueno|regular|malo",
  "cobertura_vegetal": "alta|media|baja",
  "zonas_problematicas": ["descripción zona 1"],
  "posibles_problemas": ["problema 1"],
  "urgencia": "inmediata|esta_semana|este_mes|sin_urgencia",
  "comparacion": "texto comparando sectores de la imagen",
  "recomendaciones_generales": ["acción 1", "acción 2", "acción 3"],
  "confianza_analisis": "alta|media|baja",
  "observaciones": "observaciones generales"
}
`;

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
}

export async function analyzeWithGemini(
  imageBase64: string
): Promise<GeminiAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: imageBase64,
      },
    },
    { text: AGRO_PROMPT },
  ]);

  const raw = result.response.text();
  const clean = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(clean) as GeminiAnalysis;
}
