import { ethers, network, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;

  console.log(`\n=== VESTA Deploy — Red: ${networkName} ===`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy VESTA
  const VESTA = await ethers.getContractFactory("VESTA");
  console.log("Deployando VESTA.sol...");
  const vesta = await VESTA.deploy();
  await vesta.waitForDeployment();

  const contractAddress = await vesta.getAddress();
  console.log(`✅ VESTA deployado en: ${contractAddress}`);

  // Exportar ABI
  const artifact = await artifacts.readArtifact("VESTA");
  const abiPath = path.join(__dirname, "../lib/abi.json");
  fs.mkdirSync(path.dirname(abiPath), { recursive: true });
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`✅ ABI exportado a lib/abi.json`);

  // Transacciones de test (obligatorias para BNB track: mínimo 2 txs)
  if (networkName === "bscTestnet") {
    console.log("\n--- Minteo de test (BNB track: 2 txs requeridas) ---");

    const tx1 = await vesta.mintCertificate(
      "Bodega Monteviejo",
      "-33.6644,-69.2368",
      "test_hash_deploy_1_" + Date.now(),
      650,
      420,
      180,
      ""
    );
    const receipt1 = await tx1.wait();
    console.log(`✅ Mint #1 — txHash: ${receipt1?.hash}`);

    const tx2 = await vesta.mintCertificate(
      "Bodega Monteviejo",
      "-33.6644,-69.2368",
      "test_hash_deploy_2_" + Date.now(),
      612,
      395,
      165,
      "helada_23mar2026"
    );
    const receipt2 = await tx2.wait();
    console.log(`✅ Mint #2 (Edición Limitada) — txHash: ${receipt2?.hash}`);

    console.log(`\n✅ 2 transacciones completadas en BSC Testnet`);
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Red:      ${networkName}`);
  console.log(`Contrato: ${contractAddress}`);
  console.log(`\nGuardar en .env.local:`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`\nVerificar en:`);
  if (networkName === "bscTestnet") {
    console.log(`https://testnet.bscscan.com/address/${contractAddress}`);
  } else if (networkName === "rskTestnet") {
    console.log(`https://explorer.testnet.rootstock.io/address/${contractAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
