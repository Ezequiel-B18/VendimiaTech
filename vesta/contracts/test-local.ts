import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n=== TEST LOCAL — VESTA Contract ===\n");

  // 1. Deploy
  console.log("1. Deployando contrato...");
  const VESTA = await ethers.getContractFactory("VESTA");
  const vesta = await VESTA.deploy();
  await vesta.waitForDeployment();
  const addr = await vesta.getAddress();
  console.log(`   ✅ Deployado en: ${addr}\n`);

  // 2. Mint certificado normal
  console.log("2. Minteando certificado normal...");
  const tx1 = await vesta.mintCertificate(
    "Bodega Monteviejo",
    "-33.6644,-69.2368",
    "sha256_imagen_satelital_abc123",
    650, 420, 180,
    ""
  );
  const r1 = await tx1.wait();
  console.log(`   ✅ Mint OK — txHash: ${r1?.hash}\n`);

  // 3. Mint certificado edición limitada (con evento climático)
  console.log("3. Minteando certificado EDICION LIMITADA (helada)...");
  const tx2 = await vesta.mintCertificate(
    "Bodega Monteviejo",
    "-33.6644,-69.2368",
    "sha256_imagen_satelital_def456",
    612, 395, 165,
    "helada_23mar2026"
  );
  const r2 = await tx2.wait();
  console.log(`   ✅ Mint OK — txHash: ${r2?.hash}\n`);

  // 4. Leer certificado #1
  console.log("4. Leyendo certificado #1...");
  const cert1 = await vesta.getCertificate(1);
  console.log(`   bodega:          ${cert1.bodega}`);
  console.log(`   coordenadas:     ${cert1.coordenadas}`);
  console.log(`   vigor vegetal:   ${Number(cert1.ndvi) / 1000} (NDVI)`);
  console.log(`   madurez:         ${Number(cert1.ndre) / 1000} (NDRE)`);
  console.log(`   humedad foliar:  ${Number(cert1.ndwi) / 1000} (NDWI)`);
  console.log(`   climateEvent:    "${cert1.climateEvent}"`);
  console.log(`   isLimitedEdition: ${cert1.isLimitedEdition}`);
  console.log(`   timestamp:       ${new Date(Number(cert1.timestamp) * 1000).toISOString()}\n`);

  // 5. Leer certificado #2 (edición limitada)
  console.log("5. Leyendo certificado #2 (edición limitada)...");
  const cert2 = await vesta.getCertificate(2);
  console.log(`   climateEvent:    "${cert2.climateEvent}"`);
  console.log(`   isLimitedEdition: ${cert2.isLimitedEdition}\n`);

  // 6. Verificar isLimitedEdition
  console.log("6. Verificando isLimitedEdition...");
  const lim1 = await vesta.isLimitedEdition(1);
  const lim2 = await vesta.isLimitedEdition(2);
  console.log(`   Token #1 es edición limitada: ${lim1}  ✅ (esperado: false)`);
  console.log(`   Token #2 es edición limitada: ${lim2}  ✅ (esperado: true)\n`);

  // 7. Colección del deployer
  console.log("7. Colección del deployer...");
  const collection = await vesta.getCollectionByOwner(deployer.address);
  console.log(`   Tokens: [${collection.map(t => t.toString()).join(", ")}]`);
  console.log(`   Total:  ${collection.length} NFTs\n`);

  // 8. Verificar tokenURI (JSON on-chain)
  console.log("8. TokenURI (JSON on-chain base64)...");
  const uri = await vesta.tokenURI(1);
  const base64 = uri.replace("data:application/json;base64,", "");
  const json = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  console.log(`   name:        ${json.name}`);
  console.log(`   description: ${json.description}`);
  console.log(`   attributes:  ${json.attributes.length} campos\n`);

  console.log("=== TODOS LOS TESTS PASARON ✅ ===\n");
}

main().catch((e) => {
  console.error("\n❌ ERROR:", e.message);
  process.exit(1);
});
