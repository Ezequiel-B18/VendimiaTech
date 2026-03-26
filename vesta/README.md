# VESTA — Vegetation Satellite Tracker Analytics

Satelite + Blockchain + IA para la vitivinicultura mendocina.

---

## Setup inicial

```bash
cd vesta
npm install
cp .env.example .env.local
```

Completar en `.env.local`:

| Variable | Dónde obtenerla |
|----------|-----------------|
| `COPERNICUS_CLIENT_ID` / `SECRET` | dataspace.copernicus.eu → User Settings → OAuth |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `HEDERA_ACCOUNT_ID` / `PRIVATE_KEY` | portal.hedera.com |
| `DEPLOYER_PRIVATE_KEY` | MetaMask → Account details → Show private key |

---

## Tests locales — Contrato Solidity

### 1. Levantar nodo Hardhat

Abrir una terminal y dejarla corriendo:

```bash
npx hardhat node
```

Queda escuchando en `http://127.0.0.1:8545/`. Hardhat provee 20 wallets con 10.000 ETH de prueba cada una.

### 2. Deployar el contrato

En otra terminal:

```bash
npx hardhat run contracts/deploy.ts --network localhost
```

Output esperado:
```
=== VESTA Deploy — Red: localhost ===
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Balance: 10000.0 ETH

Deployando VESTA.sol...
✅ VESTA deployado en: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ ABI exportado a lib/abi.json

Guardar en .env.local:
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Copiar el address a `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

> Nota: cada vez que reiniciás el nodo, el address cambia. Volvé a correr el deploy y actualizar el .env.local.

### 3. Interactuar con el contrato (consola Hardhat)

```bash
npx hardhat console --network localhost
```

```javascript
// Conectar al contrato
const VESTA = await ethers.getContractAt("VESTA", "0x5FbDB2315678afecb367f032d93F642f64180aa3")

// Mintear un certificado de prueba
const tx = await VESTA.mintCertificate(
  "Bodega Monteviejo",
  "-33.6644,-69.2368",
  "abc123hash",
  650,   // NDVI × 1000
  420,   // NDRE × 1000
  180,   // NDWI × 1000
  ""     // sin evento climático
)
await tx.wait()

// Leer el certificado (tokenId empieza en 1)
const cert = await VESTA.getCertificate(1)
console.log(cert)

// Mintear uno con evento climático (edición limitada)
const tx2 = await VESTA.mintCertificate(
  "Bodega Monteviejo",
  "-33.6644,-69.2368",
  "def456hash",
  612, 395, 165,
  "helada_23mar2026"
)
await tx2.wait()

// Verificar edición limitada
await VESTA.isLimitedEdition(2)  // → true

// Ver colección del deployer
const [signer] = await ethers.getSigners()
await VESTA.getCollectionByOwner(signer.address)  // → [1n, 2n]
```

### 4. Compilar el contrato

Si modificás `contracts/VESTA.sol`:

```bash
npx hardhat compile
```

---

## Deploy en testnets reales

### Prerequisitos

1. Obtener una private key de MetaMask (wallet exclusiva para testnet)
2. Cargar fondos de prueba (gratis):
   - **tBNB (BSC Testnet):** testnet.bnbchain.org/faucet-smart
   - **tRBTC (RSK Testnet):** faucet.rootstock.io
3. Agregar `DEPLOYER_PRIVATE_KEY` en `.env.local`

### Deploy BSC Testnet

```bash
npx hardhat run contracts/deploy.ts --network bscTestnet
```

El script hace automáticamente 2 mints de test (requerido para el track BNB de DoraHacks).

Verificar en: `testnet.bscscan.com/address/<CONTRACT_ADDRESS>`

### Deploy RSK Testnet

```bash
npx hardhat run contracts/deploy.ts --network rskTestnet
```

Verificar en: `explorer.testnet.rootstock.io/address/<CONTRACT_ADDRESS>`

> **Nota EVM:** BSC y RSK usan EVM anterior a Cancun. Si el deploy falla con error `mcopy`, cambiar temporalmente en `hardhat.config.ts`:
> ```typescript
> evmVersion: "berlin"  // para el deploy en testnet
> // volver a "cancun" para desarrollo local
> ```

---

## Correr la app Next.js

```bash
npm run dev
```

Abre en `http://localhost:3000`.

---

## Contratos deployados

| Red | Address |
|-----|---------|
| Localhost | 0x5FbDB2315678afecb367f032d93F642f64180aa3 |
| BSC Testnet | — (pendiente) |
| RSK Testnet | — (pendiente) |
| Hedera Topic | — (pendiente) |

---

## Stack

Next.js 14 · TypeScript · Solidity ^0.8.20 · OpenZeppelin v5 · Hardhat v2 · Gemini 2.5 Flash · Sentinel-2 · Hedera SDK

## Tracks DoraHacks

- **Hedera:** Certificados de sostenibilidad con HCS
- **BNB Chain:** NFT coleccionable ERC-721 en BSC Testnet
- **Rootstock:** Mismo contrato en RSK Testnet
- **Beexo Connect:** xo-connect para wallet UX
