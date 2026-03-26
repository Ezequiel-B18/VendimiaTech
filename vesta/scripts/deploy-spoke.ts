/**
 * deploy-spoke.ts
 * Deploy VESTASpoke en RSK Testnet o Hedera Testnet.
 *
 * Uso:
 *   npx hardhat run scripts/deploy-spoke.ts --network rskTestnet
 *   npx hardhat run scripts/deploy-spoke.ts --network hederaTestnet
 *
 * Requiere en .env.local:
 *   DEPLOYER_PRIVATE_KEY=0x...
 */
import { ethers, network } from "hardhat";
import { LZ_ENDPOINTS, LZNetwork } from "../lib/layerzero";

const NETWORK_MAP: Record<string, LZNetwork> = {
  rskTestnet: "rskTestnet",
  hederaTestnet: "hederaTestnet",
};

const ENV_VAR_MAP: Record<LZNetwork, string> = {
  bscTestnet: "NEXT_PUBLIC_HUB_ADDRESS",
  rskTestnet: "NEXT_PUBLIC_SPOKE_RSK",
  hederaTestnet: "NEXT_PUBLIC_SPOKE_HEDERA",
};

async function main() {
  const networkName = network.name;
  const lzNetwork = NETWORK_MAP[networkName];

  if (!lzNetwork) {
    throw new Error(`Red no soportada: ${networkName}. Usá rskTestnet o hederaTestnet.`);
  }

  const [deployer] = await ethers.getSigners();
  const lzConfig = LZ_ENDPOINTS[lzNetwork];

  console.log(`Deployando VESTASpoke en ${lzConfig.name}`);
  console.log("Cuenta:", deployer.address);
  console.log("LayerZero endpoint:", lzConfig.endpoint);
  console.log("LayerZero EID:", lzConfig.eid);

  const VESTASpoke = await ethers.getContractFactory("VESTASpoke");
  const spoke = await VESTASpoke.deploy(lzConfig.endpoint, deployer.address);
  await spoke.waitForDeployment();

  const spokeAddress = await spoke.getAddress();
  console.log(`\n✅ VESTASpoke deployado en ${lzConfig.name}:`, spokeAddress);
  console.log("   TX hash:", spoke.deploymentTransaction()?.hash);
  console.log("\nGuardá esta variable en .env.local:");
  console.log(`${ENV_VAR_MAP[lzNetwork]}=${spokeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
