/**
 * set-spoke-peer.ts
 * Configura el peer en el SPOKE para que acepte mensajes del HUB (BSC).
 *
 * Uso:
 *   npx hardhat run scripts/set-spoke-peer.ts --network rskTestnet
 *   npx hardhat run scripts/set-spoke-peer.ts --network hederaTestnet
 *
 * Requiere en .env.local:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   NEXT_PUBLIC_HUB_ADDRESS=0x...
 *   NEXT_PUBLIC_SPOKE_RSK=0x...       (para rskTestnet)
 *   NEXT_PUBLIC_SPOKE_HEDERA=0x...    (para hederaTestnet)
 */
import { ethers, network } from "hardhat";
import { LZ_ENDPOINTS } from "../lib/layerzero";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const hubAddress = process.env.NEXT_PUBLIC_HUB_ADDRESS;
  const networkName = network.name;

  if (!hubAddress) {
    throw new Error("Falta NEXT_PUBLIC_HUB_ADDRESS en .env.local");
  }

  let spokeAddress: string | undefined;
  if (networkName === "rskTestnet") {
    spokeAddress = process.env.NEXT_PUBLIC_SPOKE_RSK;
  } else if (networkName === "hederaTestnet") {
    spokeAddress = process.env.NEXT_PUBLIC_SPOKE_HEDERA;
  } else {
    throw new Error(`Red no soportada: ${networkName}`);
  }

  if (!spokeAddress) {
    throw new Error(`Falta la variable de entorno del spoke para ${networkName}`);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Configurando peer en SPOKE (${networkName}) con cuenta:`, deployer.address);

  const spoke = await ethers.getContractAt("VESTASpoke", spokeAddress);
  const hubBytes32 = ethers.zeroPadValue(hubAddress, 32);

  console.log(`Conectando SPOKE → HUB (EID ${LZ_ENDPOINTS.bscTestnet.eid})...`);
  const tx = await spoke.setPeer(LZ_ENDPOINTS.bscTestnet.eid, hubBytes32);
  await tx.wait();
  console.log("✅ Peer del SPOKE configurado. TX:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
