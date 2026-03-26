import { NextRequest, NextResponse } from "next/server";
import { mintOnBNB } from "@/lib/blockchain/bnb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bodega,
      coordenadas,
      imageHash,
      ndvi,
      ndre,
      ndwi,
      climateEvent,
      walletAddress,
    } = body as {
      bodega: string;
      coordenadas: string;
      imageHash: string;
      ndvi: number;
      ndre: number;
      ndwi: number;
      climateEvent: string;
      walletAddress: string;
    };

    if (!imageHash || !bodega) {
      return NextResponse.json(
        { error: "bodega e imageHash son requeridos" },
        { status: 400 }
      );
    }

    const result = await mintOnBNB({
      bodega,
      coordenadas,
      imageHash,
      ndvi,
      ndre,
      ndwi,
      climateEvent: climateEvent ?? "",
      walletAddress: walletAddress ?? "",
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/certify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
