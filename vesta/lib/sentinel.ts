import crypto from "crypto";
import { PNG } from "pngjs";

const COPERNICUS_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const SENTINEL_PROCESS_URL =
  "https://sh.dataspace.copernicus.eu/api/v1/process";

const EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B03", "B04", "B08", "B8A", "B11"],
    output: { bands: 3, sampleType: "UINT8" }
  };
}
function evaluatePixel(s) {
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 0.0001);
  let ndre = (s.B8A - s.B04) / (s.B8A + s.B04 + 0.0001);
  let ndwi = (s.B08 - s.B11) / (s.B08 + s.B11 + 0.0001);
  if (ndvi < 0.15) return [191, 38, 38];
  if (ndwi > 0.4 && ndvi > 0.3) return [51, 102, 217];
  if (ndre < 0.2) return [204, 191, 25];
  let intensity = Math.min(ndre / 0.5, 1.0);
  return [13, Math.round(76 + intensity * 102), 25];
}
`;

// ─── Color classification for pixel analysis ─────────────────────────────────

// Reference colors from the evalscript
const COLOR_CATEGORIES = [
  { name: "red" as const,         rgb: [191, 38, 38],   ndvi: 0.08, ndre: 0.05, ndwi: 0.02 },
  { name: "blue" as const,        rgb: [51, 102, 217],  ndvi: 0.45, ndre: 0.25, ndwi: 0.55 },
  { name: "yellow" as const,      rgb: [204, 191, 25],  ndvi: 0.35, ndre: 0.12, ndwi: 0.15 },
  { name: "green_light" as const, rgb: [13, 76, 25],    ndvi: 0.45, ndre: 0.20, ndwi: 0.18 },
  { name: "green_mid" as const,   rgb: [13, 127, 25],   ndvi: 0.60, ndre: 0.35, ndwi: 0.20 },
  { name: "green_intense" as const, rgb: [13, 178, 25], ndvi: 0.80, ndre: 0.48, ndwi: 0.22 },
] as const;

type CategoryName = typeof COLOR_CATEGORIES[number]["name"];

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function classifyPixel(r: number, g: number, b: number): CategoryName {
  let minDist = Infinity;
  let best: CategoryName = "red";
  for (const cat of COLOR_CATEGORIES) {
    const dist = colorDistance(r, g, b, cat.rgb[0], cat.rgb[1], cat.rgb[2]);
    if (dist < minDist) {
      minDist = dist;
      best = cat.name;
    }
  }
  return best;
}

// ─── Index calculation from PNG pixels ───────────────────────────────────────

export interface PixelDistribution {
  red: number;
  blue: number;
  yellow: number;
  green_light: number;
  green_mid: number;
  green_intense: number;
}

export interface IndicesResult {
  ndvi: number;
  ndre: number;
  ndwi: number;
  distribution: PixelDistribution;
  totalVegetationPercent: number;
}

export function calculateIndicesFromPixels(imageBuffer: Buffer): IndicesResult {
  const png = PNG.sync.read(imageBuffer);
  const { width, height, data } = png;

  const counts: Record<CategoryName, number> = {
    red: 0, blue: 0, yellow: 0,
    green_light: 0, green_mid: 0, green_intense: 0,
  };

  let totalNdvi = 0;
  let totalNdre = 0;
  let totalNdwi = 0;
  let totalPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4; // RGBA
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Skip fully transparent pixels
      if (a < 10) continue;

      const category = classifyPixel(r, g, b);
      counts[category]++;

      const catObj = COLOR_CATEGORIES.find((c) => c.name === category)!;
      totalNdvi += catObj.ndvi;
      totalNdre += catObj.ndre;
      totalNdwi += catObj.ndwi;
      totalPixels++;
    }
  }

  if (totalPixels === 0) {
    return {
      ndvi: 0, ndre: 0, ndwi: 0,
      distribution: { red: 0, blue: 0, yellow: 0, green_light: 0, green_mid: 0, green_intense: 0 },
      totalVegetationPercent: 0,
    };
  }

  const distribution: PixelDistribution = {
    red: Math.round((counts.red / totalPixels) * 100),
    blue: Math.round((counts.blue / totalPixels) * 100),
    yellow: Math.round((counts.yellow / totalPixels) * 100),
    green_light: Math.round((counts.green_light / totalPixels) * 100),
    green_mid: Math.round((counts.green_mid / totalPixels) * 100),
    green_intense: Math.round((counts.green_intense / totalPixels) * 100),
  };

  const vegPixels = counts.green_light + counts.green_mid + counts.green_intense;
  const totalVegetationPercent = Math.round((vegPixels / totalPixels) * 100);

  return {
    ndvi: Math.round((totalNdvi / totalPixels) * 100) / 100,
    ndre: Math.round((totalNdre / totalPixels) * 100) / 100,
    ndwi: Math.round((totalNdwi / totalPixels) * 100) / 100,
    distribution,
    totalVegetationPercent,
  };
}

// ─── Copernicus auth ─────────────────────────────────────────────────────────

async function getCopernicusToken(): Promise<string> {
  const res = await fetch(COPERNICUS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.COPERNICUS_CLIENT_ID!,
      client_secret: process.env.COPERNICUS_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Copernicus auth failed: ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Sentinel-2 image fetching ───────────────────────────────────────────────

interface SentinelImageResult {
  imageBuffer: Buffer;
  imageBase64: string;
  imageHash: string;
}

export async function fetchSentinelImage(bbox: number[]): Promise<SentinelImageResult> {
  const token = await getCopernicusToken();

  const payload = {
    input: {
      bounds: { bbox },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: { maxCloudCoverage: 20 },
        },
      ],
    },
    evalscript: EVALSCRIPT,
    output: {
      width: 512,
      height: 512,
      format: { type: "image/png", sampleType: "UINT8" },
    },
  };

  const res = await fetch(SENTINEL_PROCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sentinel-2 request failed (${res.status}): ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);
  const imageBase64 = imageBuffer.toString("base64");
  const imageHash = crypto
    .createHash("sha256")
    .update(imageBuffer)
    .digest("hex");

  return { imageBuffer, imageBase64, imageHash };
}

/**
 * Fetch a Sentinel-2 image for a specific date range (for temporal comparison).
 * @param bbox - [lon_min, lat_min, lon_max, lat_max]
 * @param dateFrom - ISO date string (e.g. "2026-03-01")
 * @param dateTo - ISO date string (e.g. "2026-03-15")
 */
export async function fetchSentinelImageForDate(
  bbox: number[],
  dateFrom: string,
  dateTo: string
): Promise<SentinelImageResult> {
  const token = await getCopernicusToken();

  const payload = {
    input: {
      bounds: { bbox },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            maxCloudCoverage: 30,
            timeRange: {
              from: `${dateFrom}T00:00:00Z`,
              to: `${dateTo}T23:59:59Z`,
            },
          },
        },
      ],
    },
    evalscript: EVALSCRIPT,
    output: {
      width: 512,
      height: 512,
      format: { type: "image/png", sampleType: "UINT8" },
    },
  };

  const res = await fetch(SENTINEL_PROCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sentinel-2 temporal request failed (${res.status}): ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);
  const imageBase64 = imageBuffer.toString("base64");
  const imageHash = crypto
    .createHash("sha256")
    .update(imageBuffer)
    .digest("hex");

  return { imageBuffer, imageBase64, imageHash };
}

// ─── Legacy compatibility (kept for reference, but no longer used) ───────────

export function estimateIndicesFromColors(): {
  ndvi: number;
  ndre: number;
  ndwi: number;
} {
  return { ndvi: 0.65, ndre: 0.42, ndwi: 0.18 };
}
