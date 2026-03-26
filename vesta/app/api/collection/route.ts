import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import ABI from "@/lib/abi.json";

// GET /api/collection?address=0x...&tokenId=5
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const tokenId = searchParams.get("tokenId");

    const rpc =
      process.env.NEXT_PUBLIC_BSC_RPC ??
      "https://data-seed-prebsc-1-s1.binance.org:8545";
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_BSC;

    if (!contractAddress) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_CONTRACT_BSC no configurado" },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    // Fetch single token
    if (tokenId) {
      const cert = await contract.getCertificate(BigInt(tokenId));
      const isLimited = await contract.isLimitedEdition(BigInt(tokenId));
      return NextResponse.json({
        tokenId,
        bodega: cert.bodega,
        coordenadas: cert.coordenadas,
        timestamp: Number(cert.timestamp),
        imageHash: cert.imageHash,
        ndvi: Number(cert.ndvi) / 1000,
        ndre: Number(cert.ndre) / 1000,
        ndwi: Number(cert.ndwi) / 1000,
        climateEvent: cert.climateEvent,
        isLimitedEdition: isLimited,
      });
    }

    // Fetch collection by owner
    if (address) {
      const tokenIds: bigint[] = await contract.getCollectionByOwner(address);
      const tokens = await Promise.all(
        tokenIds.map(async (id) => {
          const cert = await contract.getCertificate(id);
          const isLimited = await contract.isLimitedEdition(id);
          return {
            tokenId: id.toString(),
            bodega: cert.bodega,
            coordenadas: cert.coordenadas,
            timestamp: Number(cert.timestamp),
            imageHash: cert.imageHash,
            ndvi: Number(cert.ndvi) / 1000,
            ndre: Number(cert.ndre) / 1000,
            ndwi: Number(cert.ndwi) / 1000,
            climateEvent: cert.climateEvent,
            isLimitedEdition: isLimited,
          };
        })
      );
      return NextResponse.json({ tokens });
    }

    return NextResponse.json(
      { error: "Pasá address o tokenId" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/collection]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
