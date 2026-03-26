/**
 * set-peers.ts
 * Conecta el HUB (BSC) con los SPOKEs (RSK y Hedera) via LayerZero setPeer.
 *
 * Debe correrse DESPUÉS de tener los tres contratos deployados.
 *
 * Uso:
 *   npx hardhat run scripts/set-peers.ts --network bscTestnet
 *
 * Requiere en .env.local:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   NEXT_PUBLIC_HUB_ADDRESS=0x...
 *   NEXT_PUBLIC_SPOKE_RSK=0x...
 *   NEXT_PUBLIC_SPOKE_HEDERA=0x...
 */
import { ethers } from "hardhat";
import { LZ_ENDPOINTS } from "../lib/layerzero";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const hubAddress = process.env.NEXT_PUBLIC_HUB_ADDRESS;
  const spokeRSK = process.env.NEXT_PUBLIC_SPOKE_RSK;
  const spokeHedera = process.env.NEXT_PUBLIC_SPOKE_HEDERA;

  if (!hubAddress || !spokeRSK || !spokeHedera) {
    throw new Error(
      "Faltan variables de entorno: NEXT_PUBLIC_HUB_ADDRESS, NEXT_PUBLIC_SPOKE_RSK, NEXT_PUBLIC_SPOKE_HEDERA"
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Configurando peers con cuenta:", deployer.address);

  const hub = await ethers.getContractAt("VESTAHub", hubAddress);

  // Convertir addresses de spokes a bytes32 (formato que usa LayerZero)
  const spokeRSKBytes32 = ethers.zeroPadValue(spokeRSK, 32);
  const spokeHederaBytes32 = ethers.zeroPadValue(spokeHedera, 32);

  console.log(`\nConectando HUB → RSK Spoke (EID ${LZ_ENDPOINTS.rskTestnet.eid})...`);
  const tx1 = await hub.setPeer(LZ_ENDPOINTS.rskTestnet.eid, spokeRSKBytes32);
  await tx1.wait();
  console.log("✅ RSK peer configurado. TX:", tx1.hash);

  console.log(`\nConectando HUB → Hedera Spoke (EID ${LZ_ENDPOINTS.hederaTestnet.eid})...`);
  const tx2 = await hub.setPeer(LZ_ENDPOINTS.hederaTestnet.eid, spokeHederaBytes32);
  await tx2.wait();
  console.log("✅ Hedera peer configurado. TX:", tx2.hash);

  // También configurar los spokes para que acepten mensajes del HUB
  // Esto requiere correr el script desde cada red de spoke
  console.log("\n⚠️  Acordate también de configurar los peers en los spokes:");
  console.log("   npx hardhat run scripts/set-spoke-peer.ts --network rskTestnet");
  console.log("   npx hardhat run scripts/set-spoke-peer.ts --network hederaTestnet");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
