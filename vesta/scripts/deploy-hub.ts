/**
 * deploy-hub.ts
 * Deploy VESTAHub en BSC Testnet (el HUB principal).
 *
 * Uso:
 *   npx hardhat run scripts/deploy-hub.ts --network bscTestnet
 *
 * Requiere en .env.local:
 *   DEPLOYER_PRIVATE_KEY=0x...   (cuenta con tBNB del faucet)
 */
import { ethers } from "hardhat";
import { LZ_ENDPOINTS } from "../lib/layerzero";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployando VESTAHub con cuenta:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "tBNB");

  const lzEndpoint = LZ_ENDPOINTS.bscTestnet.endpoint;
  console.log("LayerZero endpoint (BSC Testnet):", lzEndpoint);
  console.log("LayerZero EID (BSC Testnet):", LZ_ENDPOINTS.bscTestnet.eid);

  const VESTAHub = await ethers.getContractFactory("VESTAHub");
  const hub = await VESTAHub.deploy(lzEndpoint, deployer.address);
  await hub.waitForDeployment();

  const hubAddress = await hub.getAddress();
  console.log("\n✅ VESTAHub deployado en:", hubAddress);
  console.log("   TX hash:", hub.deploymentTransaction()?.hash);
  console.log("\nGuardá esta variable en .env.local:");
  console.log(`NEXT_PUBLIC_HUB_ADDRESS=${hubAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
