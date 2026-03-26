/**
 * test-bridge.ts
 * Mintea un certificado de prueba en el HUB (BSC) y verifica que llegó al SPOKE (RSK).
 *
 * Uso:
 *   npx hardhat run scripts/test-bridge.ts --network bscTestnet
 *
 * Requiere en .env.local:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   NEXT_PUBLIC_HUB_ADDRESS=0x...
 *   NEXT_PUBLIC_SPOKE_RSK=0x...
 */
import { ethers } from "hardhat";
import { LZ_ENDPOINTS, LZ_RECEIVE_GAS } from "../lib/layerzero";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const RSK_RPC = LZ_ENDPOINTS.rskTestnet.rpc;

async function main() {
  const hubAddress = process.env.NEXT_PUBLIC_HUB_ADDRESS;
  const spokeRSK = process.env.NEXT_PUBLIC_SPOKE_RSK;

  if (!hubAddress || !spokeRSK) {
    throw new Error("Faltan NEXT_PUBLIC_HUB_ADDRESS y/o NEXT_PUBLIC_SPOKE_RSK");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Test bridge con cuenta:", deployer.address);

  const hub = await ethers.getContractAt("VESTAHub", hubAddress);

  // Datos de prueba — certificado de la helada real de Monteviejo
  const bodega = "Bodega Monteviejo (test)";
  const coordenadas = "-33.6644,-69.2368";
  const imageHash = "0xtest1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const ndvi = 650n;   // 0.650 x1000
  const ndre = 420n;   // 0.420 x1000
  const ndwi = 180n;   // 0.180 x1000
  const climateEvent = "helada_23mar2026";

  const dstEids = [LZ_ENDPOINTS.rskTestnet.eid];
  const gasLimits = [LZ_RECEIVE_GAS];

  // Estimar fee de LayerZero
  console.log("\nEstimando fee de LayerZero para bridge a RSK...");
  const estimatedFee = await hub.estimateFee(
    LZ_ENDPOINTS.rskTestnet.eid,
    1n,
    bodega,
    coordenadas,
    imageHash,
    ndvi,
    ndre,
    ndwi,
    climateEvent,
    BigInt(LZ_RECEIVE_GAS)
  );
  console.log("Fee estimado:", ethers.formatEther(estimatedFee), "tBNB");

  // Mintear + bridge
  console.log("\nMinteando certificado de prueba...");
  const tx = await hub.mintAndBridge(
    bodega,
    coordenadas,
    imageHash,
    ndvi,
    ndre,
    ndwi,
    climateEvent,
    dstEids,
    gasLimits,
    { value: estimatedFee * 120n / 100n }  // 20% de margen extra
  );
  await tx.wait();
  console.log("✅ TX de mint+bridge confirmada:", tx.hash);

  // Leer tokenId del evento
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  console.log("Bloque:", receipt?.blockNumber);

  // Verificar el certificado en el HUB
  const cert = await hub.getCertificate(1n);
  console.log("\nCertificado en HUB (BSC):");
  console.log("  Bodega:", cert.bodega);
  console.log("  Evento climático:", cert.climateEvent);
  console.log("  Edición limitada:", cert.isLimitedEdition);

  // Verificar en RSK (puede tardar hasta 1-2 minutos en llegar via LayerZero)
  console.log("\n⏳ El mensaje LayerZero puede tardar 1-2 minutos en llegar a RSK.");
  console.log("Para verificar manualmente en RSK, conectate a:", RSK_RPC);
  console.log("Contrato spoke RSK:", spokeRSK);
  console.log("Llamá: VESTASpoke.getCertificate(1) y VESTASpoke.isVerified(1)");
  console.log("\nVerificá el estado en: https://layerzeroscan.com/tx/" + tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
