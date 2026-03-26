# CLAUDE.md — VESTA

> Open Spec para Claude Code. Leé este archivo completo antes de escribir una línea de código.

## Qué es VESTA

**VESTA** — Vegetation Satellite Tracker Analytics. También: la diosa romana del hogar y la fidelidad.

**El problema central no es la trazabilidad. Es el clima.**

Dos temporadas consecutivas de emergencia agropecuaria en Mendoza (2023 y 2024) devastaron entre el 30% y el 100% de la cosecha. +60.000 hectáreas afectadas en un solo ciclo. El sistema de monitoreo actual es reactivo: el productor se entera del daño cuando ya ocurrió. VESTA llega 8 horas antes.

> "El clima nos está castigando cada vez con más frecuencia y frente a ello deberemos comenzar a trabajar en defensas efectivas y modernas." — Martín Hinojosa, presidente del INV, 2023.

**Cuatro módulos, un solo flujo:**

1. **VestaSat** — Alertas predictivas de helada/granizo 8hs antes (productor)
2. **SatVerify** — Certificación de sostenibilidad on-chain (bodega exportadora)
3. **WineChain** — Pasaporte digital de la botella con QR (consumidor)
4. **TerroirCollect** — Colección gamificada de NFTs (BNB track)

**Usuarios validados — estudio de clientes real (Vendimia Tech PDF):**

- Roberto P. — productor mediano 20-80ha, Valle de Uco, sin agrónomo permanente. WTP: USD 99-150/mes si evita UNA noche de helada
- Claudia L. — directora técnica bodega exportadora 100-500ha. WTP: USD 299/mes si reemplaza auditoría de USD 5.000-15.000/año
- Ministerio de Producción / FCA / aseguradoras — cliente año 2-3, validación institucional

**Datos reales ya disponibles (no promesas):**

- Credenciales Copernicus testeadas y funcionando
- Imagen Sentinel-2 de Bodega Monteviejo generada y analizada con Gemini
- Datos climáticos reales 31 días (Feb 23 – Mar 25 2026) coordenadas exactas Monteviejo
- Evento helada real: 23 Mar 2026, min 3.1°C, alerta habría generado 8hs antes
- Pipeline Gemini 2.5 Flash testeado, output JSON con confianza alta
- Balance hídrico real: -114.39mm en 31 días

**Contexto de mercado (INV 2024):**

- 896 bodegas en Mendoza (72.5% del total nacional)
- 14.593 viñedos, 142.785 hectáreas cultivadas
- -21% producción en 2023 por clima, hasta -60% en oasis más afectados
- $7.300 millones en compensaciones FCA 2024-25 para 3.500 productores
- Emergencia agropecuaria declarada en 2023 Y 2024

Hackathon: Vendimia Tech, Mendoza — Marzo 2025.
Tracks: Stellar Hackathon + Hedera + BNB + Rootstock + Beexo Connect.
Deadline entregables: Viernes 17hs en DoraHacks.

---

## Stack definido

```
Frontend:  Next.js 14 (App Router) + TypeScript
UI:        Tailwind CSS + shadcn/ui
Mapa:      Leaflet + react-leaflet
Gráficos:  Recharts
Wallet:    xo-connect (Beexo SDK)
Deploy:    Vercel
```

```
Backend:   Next.js API Routes (serverless, sin servidor separado)
IA:        Gemini 2.5 Flash (Google) para análisis de imágenes
Datos:     Sentinel-2 L2A via Copernicus Data Space API
Clima:     OpenMeteo Archive + Forecast API (gratuita)
```

```
Blockchain:
  - Contrato Solidity ERC-721 → deploy en BSC Testnet (BNB) + RSK Testnet (Rootstock)
  - Hedera JS SDK → certificados de sostenibilidad on-chain
  - Stellar Soroban → microseguro paramétrico
  - Selector de red en runtime (sin bridge cross-chain)
  - xo-connect → conexión de wallet en frontend
```

```
Variables de entorno (.env.local):
COPERNICUS_CLIENT_ID=sh-a8721ab2-8fe6-4019-8d31-ef89dca9354e
COPERNICUS_CLIENT_SECRET=[regenerar antes del hackathon]
GEMINI_API_KEY=[obtener de Google AI Studio]
NEXT_PUBLIC_CHAIN_MODE=selectable
NEXT_PUBLIC_BSC_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_RSK_RPC=https://public-node.testnet.rsk.co
NEXT_PUBLIC_CONTRACT_BSC=[address después del deploy en BSC Testnet]
NEXT_PUBLIC_CONTRACT_RSK=[address después del deploy en RSK Testnet]
NEXT_PUBLIC_CONTRACT_HEDERA=[address después del deploy en Hedera Testnet EVM]
NEXT_PUBLIC_STELLAR_RPC=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_CONTRACT=[address Soroban]
HEDERA_ACCOUNT_ID=[obtener en portal.hedera.com]
HEDERA_PRIVATE_KEY=[obtener en portal.hedera.com]
```

---

## Estructura de carpetas

```
vesta/
├── app/
│   ├── page.tsx                    # Landing + mapa productor
│   ├── dashboard/page.tsx          # Resultado análisis
│   ├── certifications/page.tsx     # Panel bodega exportadora
│   ├── bottle/[tokenId]/page.tsx   # Pasaporte consumidor (QR)
│   ├── collection/page.tsx         # TerroirCollect gamificación
│   └── api/
│       ├── analyze/route.ts        # Sentinel-2 + Gemini + índices
│       ├── weather/route.ts        # OpenMeteo
│       ├── certify/route.ts        # Mintear NFT on-chain
│       ├── collection/route.ts     # Leer colección del usuario
│       └── alert/route.ts          # Alertas predictivas dT/dt
├── components/
│   ├── Map.tsx                     # Mapa Leaflet con imagen superpuesta
│   ├── Dashboard.tsx               # Layout tres zonas
│   ├── WeatherChart.tsx            # Gráfico temperatura Recharts
│   ├── AlertBanner.tsx             # Banner rojo alerta helada
│   ├── CertifyButton.tsx           # Botón + xo-connect wallet
│   ├── BottlePassport.tsx          # Vista consumidor QR
│   ├── CollectionBadges.tsx        # Badges TerroirCollect
│   └── StatusCard.tsx              # Tarjeta estado (vigor/madurez/alerta)
├── lib/
│   ├── sentinel.ts                 # Fetch + cálculo índices Sentinel-2
│   ├── gemini.ts                   # Cliente Gemini con prompt agronómico
│   ├── weather.ts                  # Cliente OpenMeteo
│   ├── blockchain/
│   │   ├── index.ts                # Router por chain seleccionada
│   │   ├── bnb.ts                  # Adapter BSC (mint NFT)
│   │   ├── rsk.ts                  # Adapter RSK (mint NFT)
│   │   ├── hedera.ts               # Adapter Hedera (HCS / EVM)
│   │   └── stellar.ts              # Adapter Soroban (payout)
│   ├── hedera.ts                   # Hedera JS SDK
│   └── alerts.ts                   # Lógica dT/dt predictiva
├── contracts/
│   ├── VESTA.sol             # Contrato ERC-721 principal
│   └── deploy.ts                   # Script deploy BSC + RSK
└── public/
    └── sample-ndvi.png             # Imagen Monteviejo pre-generada para demo
```

---

## PARTE 1 — Contrato Solidity ✅ COMPLETADA — NO MODIFICAR

> **Esta parte ya fue implementada y testeada por el equipo. Claude Code NO debe tocar nada de esta sección.**
> El contrato está en `contracts/VESTA.sol`, deployado y funcionando.
> Tests pasados: mint normal, mint edición limitada, lectura de certificado, colección por owner, tokenURI base64.
> Resultados del test:
>
> - Contrato deployado: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` (local)
> - TX mint normal: `0xf7166865da793373ad9b49093a9ca22db842788020b9cba171165816feb9b262`
> - TX mint helada: `0x740b07ec1a90aaf8b625609c114de672d80a87d9cf15f3df8dd03a82088f227a`
> - isLimitedEdition funciona correctamente
> - tokenURI devuelve JSON base64 con 7 atributos

## PARTE 1 — Contrato Solidity (REFERENCIA — ya implementado)

**Archivo:** `contracts/VESTA.sol`

Escribir un contrato ERC-721 con las siguientes funciones:

```solidity
// Estructura del certificado
struct Certificate {
    string bodega;
    string coordenadas;     // "-33.6644,-69.2368"
    uint256 timestamp;
    string imageHash;       // SHA256 de la imagen satelital
    int256 ndvi;            // multiplicado x1000 (ej: 650 = 0.650)
    int256 ndre;
    int256 ndwi;
    string climateEvent;    // "helada_23mar2026" o ""
    bool isLimitedEdition;  // true si tiene evento climático
}

// Funciones públicas necesarias:
function mintCertificate(string memory bodega, string memory coordenadas, string memory imageHash, int256 ndvi, int256 ndre, int256 ndwi, string memory climateEvent) public returns (uint256)

function getCertificate(uint256 tokenId) public view returns (Certificate memory)

function getCollectionByOwner(address owner) public view returns (uint256[] memory)

function isLimitedEdition(uint256 tokenId) public view returns (bool)
```

**Reglas:**

- Usar OpenZeppelin ERC-721URIStorage
- El tokenURI debe devolver JSON con todos los campos del Certificate
- El campo `isLimitedEdition` se activa automáticamente si `climateEvent != ""`
- Compilar con Solidity ^0.8.20

**Deploy:**

- BSC Testnet: chainId 97, RPC https://data-seed-prebsc-1-s1.binance.org:8545
- RSK Testnet: chainId 31, RPC https://public-node.testnet.rsk.co
- Faucets: testnet.bnbchain.org/faucet-smart y faucet.rootstock.io
- Guardar el address del contrato deployado en .env.local

**Checklist Parte 1:**

- [x] VESTA.sol escrito y compilando sin errores
- [x] Tests locales pasados (mint, edición limitada, colección, tokenURI)
- [x] ABI exportado a `lib/abi.json`
- [ ] Deploy en BSC Testnet con address guardado
- [ ] Deploy en RSK Testnet con address guardado
- [ ] Deploy en Hedera Testnet EVM con address guardado
- [ ] 2 transacciones de test en BSC (requerido track BNB)

> ℹ️ Se mantiene un solo contrato VESTA.sol para EVM (BSC/RSK/Hedera EVM).
> La arquitectura final del producto es **cadena seleccionable por usuario** en runtime.
> No hay bridge cross-chain ni sincronización entre redes.
> **Un solo VESTA.sol, tres deployments — solo cambia la red en el script:**
>
> ```typescript
> // deploy.ts — correr una vez por red
> const NETWORKS = {
>   bsc_testnet: {
>     rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
>     chainId: 97,
>     faucet: "testnet.bnbchain.org/faucet-smart",
>   },
>   rsk_testnet: {
>     rpc: "https://public-node.testnet.rsk.co",
>     chainId: 31,
>     faucet: "faucet.rootstock.io",
>   },
>   hedera_testnet: {
>     rpc: "https://testnet.hashio.io/api",
>     chainId: 296,
>     faucet: "portal.hedera.com (crear cuenta gratis)",
>   },
> };
> // npx hardhat run scripts/deploy.ts --network bsc_testnet
> // npx hardhat run scripts/deploy.ts --network rsk_testnet
> // npx hardhat run scripts/deploy.ts --network hedera_testnet
> ```
>
> Guardar cada address en `.env.local`:
>
> ```
> NEXT_PUBLIC_CONTRACT_BSC=0x...
> NEXT_PUBLIC_CONTRACT_RSK=0x...
> NEXT_PUBLIC_CONTRACT_HEDERA=0x...
> ```
>
> El frontend usa el address correcto según qué red tiene conectada la wallet del usuario.

---

## PARTE 1b — Arquitectura de Cadena Seleccionable (sin bridge)

> **Objetivo:** mantener 1 solo proyecto y permitir que el usuario elija la blockchain al certificar.
> **No usar LayerZero para el MVP del hackathon.**

### El concepto

```
Frontend único (Next.js)
        |
Selector de chain en UI (BNB | Rootstock | Hedera | Stellar)
        |
API /api/certify
        |
Router de adapters por chain
   ├─ bnb.ts      -> mintCertificate (BSC)
   ├─ rsk.ts      -> mintCertificate (RSK)
   ├─ hedera.ts   -> HCS / EVM
   └─ stellar.ts  -> trigger_payout (Soroban)

Cada certificación se ejecuta en UNA chain elegida por el usuario.
Sin replicación automática entre chains.
```

### Decisión de arquitectura

- Menos riesgo operativo para hackathon.
- Menos complejidad de debugging.
- Demo más estable.
- Misma UX/producto, diferentes backends blockchain.

### Variables de entorno (selección de chain)

```
NEXT_PUBLIC_CHAIN_MODE=selectable

# EVM
NEXT_PUBLIC_BSC_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_RSK_RPC=https://public-node.testnet.rsk.co
NEXT_PUBLIC_CONTRACT_BSC=0x...
NEXT_PUBLIC_CONTRACT_RSK=0x...
NEXT_PUBLIC_CONTRACT_HEDERA=0x...

# Hedera HCS
HEDERA_ACCOUNT_ID=...
HEDERA_PRIVATE_KEY=...
HEDERA_TOPIC_ID=0.0....

# Stellar Soroban
NEXT_PUBLIC_STELLAR_RPC=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_CONTRACT=0x...
STELLAR_SECRET_KEY=...
```

### Contratos y adapters

### Orden de deploy (EVM)

```bash
# Mismo contrato VESTA.sol, diferentes redes
npx hardhat run scripts/deploy.ts --network bsc_testnet
npx hardhat run scripts/deploy.ts --network rsk_testnet
npx hardhat run scripts/deploy.ts --network hedera_testnet
```

### En frontend/backend — `app/api/certify/route.ts`

```typescript
type Chain = "bnb" | "rootstock" | "hedera" | "stellar";

const chain = body.chain as Chain;

const result = await certifyWithSelectedChain(chain, {
  bodega,
  coordenadas,
  imageHash,
  ndvi,
  ndre,
  ndwi,
  climateEvent,
  walletAddress,
});

return Response.json(result);
```

### Checklist Parte 1b — Chain Selectable

- [ ] Selector de red visible en UI (BNB, Rootstock, Hedera, Stellar)
- [ ] Router de adapters implementado en `lib/blockchain/index.ts`
- [ ] Adapter BNB mintea NFT y devuelve `{ tokenId, txHash }`
- [ ] Adapter Rootstock mintea NFT y devuelve `{ tokenId, txHash }`
- [ ] Adapter Hedera registra hash en HCS y devuelve `{ topicId, sequenceNumber }`
- [ ] Adapter Stellar ejecuta `trigger_payout` y devuelve `{ txHash }`
- [ ] `/api/certify` acepta `chain` y enruta correctamente
- [ ] UI muestra explorer URL según chain elegida

---

## PARTE 2 — API Routes backend

### 2a. `/api/analyze/route.ts`

**Qué hace:** Recibe un bbox (coordenadas), descarga imagen Sentinel-2, calcula índices, llama a Gemini, devuelve JSON completo.

**Input (POST):**

```json
{ "bbox": [-69.26, -33.69, -69.21, -33.64] }
```

**Flujo interno:**

1. Obtener token de Copernicus con client_credentials
2. Llamar a `https://sh.dataspace.copernicus.eu/api/v1/process` con este evalscript:

```javascript
// evalscript — devuelve PNG con 3 bandas UINT8
// Verde intenso: vegetación sana (NDVI alto + NDRE alto)
// Verde claro: madurez media
// Amarillo: vigor bajo (NDRE bajo)
// Azul: humedad foliar alta (alerta fúngica)
// Rojo: sin vegetación
function setup() {
  return {
    input: ["B03", "B04", "B08", "B8A", "B11"],
    output: { bands: 3, sampleType: "UINT8" },
  };
}
function evaluatePixel(s) {
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 0.0001);
  let ndre = (s.B8A - s.B04) / (s.B8A + s.B04 + 0.0001);
  let ndwi = (s.B08 - s.B11) / (s.B08 + s.B11 + 0.0001);
  if (ndvi < 0.15) return [191, 38, 38];
  if (ndwi > 0.4 && ndvi > 0.3) return [51, 102, 217];
  if (ndre < 0.2) return [204, 191, 25];
  let intensity = Math.min(ndre / 0.5, 1.0);
  return [13, Math.round(76 + intensity * 102), 25];
}
```

3. Calcular NDVI/NDRE/NDWI promedio de la imagen (simplificado: tomar valor del píxel central)
4. Llamar a Gemini 2.5 Flash con la imagen + prompt agronómico (ver Parte 2c)
5. Calcular SHA256 de la imagen para el certificado

**Output:**

```json
{
  "imageBase64": "...",
  "imageHash": "sha256hex",
  "indices": { "ndvi": 0.65, "ndre": 0.42, "ndwi": 0.18 },
  "geminiAnalysis": {
    "estado_general": "bueno",
    "cobertura_vegetal": "alta",
    "zonas_problematicas": ["..."],
    "posibles_problemas": ["..."],
    "urgencia": "esta_semana",
    "recomendaciones_generales": ["..."],
    "confianza_analisis": "alta"
  },
  "timestamp": "2026-03-26T02:43:04Z"
}
```

### 2b. `/api/weather/route.ts`

**Input (POST):** `{ "lat": number, "lon": number }` — coordenadas calculadas del centro del bbox ingresado por el usuario

**Llamada a OpenMeteo:**

```
GET https://api.open-meteo.com/v1/forecast?
  latitude=-33.6644&longitude=-69.2368
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,et0_fao_evapotranspiration
  &past_days=14
  &forecast_days=7
  &timezone=America/Argentina/Mendoza
```

**Output:** Devolver los datos diarios + calcular:

- `waterBalance`: precipitación - ET0 por día
- `frostRisk`: true si algún día de forecast tiene min < 4°C
- `frostAlert`: si frostRisk, incluir `{ date, minTemp, hoursUntil }`
- `fungalRisk`: true si hubo lluvia > 2mm en los últimos 3 días
- `tempDrops`: días donde dT/dt (max) < -6°C respecto al día anterior

### 2c. Prompt de Gemini (en `lib/gemini.ts`)

```typescript
const AGRO_PROMPT = `
Sos un agrónomo especialista en viticultura del Valle de Uco, Mendoza, Argentina.
El viñedo está a 1.000-1.200 msnm con riego por goteo controlado.

CONTEXTO DEL VALLE DE UCO:
- Los problemas principales son: granizo, heladas tardías, enfermedades fúngicas post-lluvia
- El riego es por goteo controlado — NO menciones déficit hídrico por falla de riego como causa primaria
- Variabilidad de madurez entre bloques es normal y valorada para cosecha diferenciada
- Malbec, Merlot, Cabernet son las variedades principales

LEYENDA DE LA IMAGEN SATELITAL:
- Verde intenso: vegetación sana, buena madurez (NDVI + NDRE altos)
- Verde claro: vegetación ok, madurez media
- Amarillo: vigor bajo o clorofila insuficiente
- Azul: humedad foliar alta (posible alerta fúngica post-lluvia)
- Rojo: sin vegetación (suelo, caminos, infraestructura, reservorios)

Analizá la imagen satelital y respondé ÚNICAMENTE con este JSON sin texto adicional:
{
  "estado_general": "bueno|regular|malo",
  "cobertura_vegetal": "alta|media|baja",
  "zonas_problematicas": ["descripción zona 1", "descripción zona 2"],
  "posibles_problemas": ["problema 1", "problema 2"],
  "urgencia": "inmediata|esta_semana|este_mes|sin_urgencia",
  "comparacion": "texto comparando sectores de la imagen",
  "recomendaciones_generales": ["acción 1", "acción 2", "acción 3"],
  "confianza_analisis": "alta|media|baja",
  "observaciones": "observaciones generales"
}
`;
```

### 2d. `/api/certify/route.ts`

**Input (POST):**

```json
{
  "chain": "bnb|rootstock|hedera|stellar",
  "bodega": "Bodega Monteviejo",
  "coordenadas": "-33.6644,-69.2368",
  "imageHash": "sha256hex",
  "ndvi": 650,
  "ndre": 420,
  "ndwi": 180,
  "climateEvent": "helada_23mar2026",
  "walletAddress": "0x..."
}
```

**Flujo:** `chain` define qué adapter ejecutar.

- `bnb` / `rootstock` / `hedera` (EVM): usar ethers.js y llamar `mintCertificate`
- `hedera` (HCS opcional): registrar hash en Consensus Service
- `stellar`: ejecutar `trigger_payout` en Soroban

**Output normalizado recomendado:**

```json
{
  "chain": "bnb",
  "status": "success",
  "txHash": "0x...",
  "tokenId": "12",
  "explorerUrl": "https://testnet.bscscan.com/tx/0x..."
}
```

### 2e. `/api/alert/route.ts`

**Lógica dT/dt:**

```typescript
// Calcular derivada de temperatura entre días consecutivos
function calcTempDerivative(temps: number[]): number[] {
  return temps.slice(1).map((t, i) => t - temps[i]);
}

// Alertas:
// - Si dT/dt < -6°C/día → shock térmico
// - Si forecast min < 4°C en próximas 24hs → alerta helada
// - Si lluvia > 2mm en últimos 3 días → riesgo fúngico
// - Si lluvia > 2mm AND dT/dt < -4 → doble alerta
```

**Checklist Parte 2:**

- [ ] /api/analyze funcionando con imagen PNG real de Sentinel-2
- [ ] /api/weather devolviendo datos + frostAlert calculado
- [ ] /api/certify minteando NFT en BSC testnet
- [ ] /api/alert devolviendo alertas con lógica dT/dt
- [ ] Prompt Gemini calibrado para Valle de Uco

---

## PARTE 3 — Frontend

### 3a. Página principal (`app/page.tsx`)

Mapa de Mendoza centrado en Valle de Uco (`[-33.9, -69.0]`, zoom 10).
**No hay coordenadas hardcodeadas.** El usuario define su parcela de tres formas posibles:

**Opción A — Dibujar en el mapa (principal):**

- Botón prominente "Analizar mi parcela" activa modo dibujo
- El usuario dibuja un rectángulo sobre su terreno en el mapa
- El bbox se calcula automáticamente de las esquinas del rectángulo dibujado

**Opción B — Buscar por nombre:**

- Campo de texto: "Buscar bodega o localidad..."
- Autocomplete con nombres de zonas vitivinícolas de Mendoza (Luján de Cuyo, Valle de Uco, Maipú, San Rafael, etc.)
- Al seleccionar, el mapa hace zoom a esa zona y el usuario dibuja encima

**Opción C — Ingresar coordenadas manualmente:**

- Link "Ingresar coordenadas" debajo del mapa
- Abre un panel con 4 campos: lat min, lat max, lon min, lon max
- Validación: debe estar dentro del bounding box de Mendoza (-35.5 a -31.5 lat, -70.5 a -66.5 lon)
- Botón "Usar mi ubicación" → geolocalización del browser si el usuario está en el campo

**Flujo tras confirmar el bbox:**

- Preview del área seleccionada con su tamaño en hectáreas estimado
- Botón "Analizar esta parcela" → spinner con los 3 pasos visibles → redirect a `/dashboard?bbox=lon_min,lat_min,lon_max,lat_max`

**Validaciones:**

- Área mínima: 1 hectárea (evitar análisis de puntos)
- Área máxima: 5.000 hectáreas (evitar requests enormes a Sentinel)
- Si el área supera el máximo: mensaje "Seleccioná una zona más pequeña para el análisis"

**Para el demo en el hackathon:**

- Un botón discreto "Cargar ejemplo — Monteviejo" que carga el bbox de Bodega Monteviejo sin hardcodearlo en el flujo principal. Solo visible en modo demo.

### 3b. Dashboard (`app/dashboard/page.tsx`)

**Layout tres columnas:**

Columna izquierda (40%):

- Componente `<Map>` con imagen PNG de Sentinel-2 superpuesta sobre Leaflet
- Opacidad ajustable con slider (60-100%)
- Leyenda de colores debajo: Verde = sano · Amarillo = atención · Rojo = sin vegetación · Azul = humedad

Columna central (35%):

- `<StatusCard estado={gemini.estado_general}>` — círculo color grande + "Viñedo Sano" o "Atención Requerida"
- Tres tarjetas chicas: Vigor · Madurez · Alertas
- Lista de recomendaciones de Gemini (máximo 3, texto simple)

Columna derecha (25%):

- `<WeatherChart>` — línea temperatura máx/mín 14 días con Recharts
- Puntos rojos en días con evento crítico
- Balance hídrico acumulado como número grande

**`<AlertBanner>`:**

- Se muestra SOLO si `frostRisk === true`
- Fondo rojo, texto blanco, ocupa todo el ancho arriba de todo
- Texto: `"⚠️ Alerta: temperatura proyectada ${minTemp}°C esta noche. Riesgo en lotes bajos. Tenés ${hoursUntil}hs."`
- Botón "Ver detalles" → modal con mapa de lotes en riesgo

**`<CertifyButton>`:**

- Botón azul al pie: "Certificar este análisis on-chain"
- Dropdown previo: "Elegir red" → BNB | Rootstock | Hedera | Stellar
- Al clickear: abre xo-connect para conectar wallet
- Llama a `/api/certify` con `chain` → muestra hash + QR/resultado según red
- Estado: idle → connecting → minting → success

### 3c. Pasaporte consumidor (`app/bottle/[tokenId]/page.tsx`)

Esta página es lo que se abre al escanear el QR de la botella.
Debe ser mobile-first. Sin navbar. Sin fricción.

**Secciones en scroll:**

1. Hero: foto del viñedo (imagen Sentinel-2 coloreada) + nombre bodega + variedad + cosecha. Grande y bonito.
2. Mapa simplificado: solo verde/amarillo, sin etiquetas técnicas. Texto: "Las uvas de esta botella crecieron aquí. El satélite confirmó vegetación sana."
3. Tres datos de clima con íconos SVG grandes: 🌡️ Temp media · 🌧️ Precipitación · ☀️ Días de sol
4. Sello blockchain: círculo verde "Verificado on-chain" + hash abreviado + link al explorador de la red elegida
5. Si `isLimitedEdition`: badge especial "Cosecha Histórica — Helada del 23 Mar 2026" con datos del evento
6. Botón "Agregar a mi colección" → conecta wallet con xo-connect
7. Botón "Compartir" → genera imagen para Instagram con el mapa + nombre del vino

### 3d. Colección TerroirCollect (`app/collection/page.tsx`)

**Vista del coleccionista:**

- Grid de NFTs del usuario ordenados por fecha
- Badge progress: "Te faltan 3 bodegas para desbloquear Explorador del Valle de Uco"
- Ranking global (los 10 primeros con más terroirs distintos)

**Sistema de badges (lógica en frontend):**

```typescript
const BADGES = [
  { id: "iniciado", name: "Iniciado del Vino", threshold: 1, type: "bodegas" },
  {
    id: "explorador",
    name: "Explorador del Valle de Uco",
    threshold: 5,
    type: "bodegas",
  },
  {
    id: "sommelier",
    name: "Sommelier Digital",
    threshold: 10,
    type: "bodegas",
  },
  { id: "fiel", name: "Fiel a la Bodega", threshold: 3, type: "same_bodega" },
  { id: "elite", name: "Coleccionista Élite", threshold: 1, type: "top10" },
];
```

### 3e. Integración xo-connect

```typescript
// En components/WalletButton.tsx
import { XOConnect } from 'xo-connect'

export function WalletButton({ onConnect }) {
  return (
    <XOConnect
      onConnect={(wallet) => onConnect(wallet)}
      onDisconnect={() => onConnect(null)}
      theme="light"
      buttonText="Conectar Wallet"
    />
  )
}
```

**Checklist Parte 3:**

- [ ] Mapa Leaflet con imagen Sentinel-2 superpuesta
- [ ] Dashboard tres columnas funcionando
- [ ] WeatherChart con eventos críticos marcados
- [ ] AlertBanner aparece cuando hay riesgo de helada
- [ ] CertifyButton conecta wallet y mintea NFT
- [ ] Pasaporte consumidor mobile-first
- [ ] Colección TerroirCollect con badges
- [ ] xo-connect integrado en header y certificación

---

## PARTE 4 — Hedera

**Archivo:** `lib/hedera.ts`

```typescript
import {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

// Registrar certificado en Hedera Consensus Service (HCS)
// Cada análisis genera un mensaje en un topic público verificable
export async function registerOnHedera(certificate: {
  imageHash: string;
  bodega: string;
  coordenadas: string;
  timestamp: string;
  indices: { ndvi: number; ndre: number; ndwi: number };
}) {
  const client = Client.forTestnet();
  client.setOperator(
    process.env.HEDERA_ACCOUNT_ID!,
    process.env.HEDERA_PRIVATE_KEY!,
  );

  // Crear topic si no existe (guardar el topicId en .env)
  // Enviar mensaje con el certificado como JSON
  // Devolver { topicId, sequenceNumber, consensusTimestamp }
}
```

**Checklist Parte 4:**

- [ ] Cuenta Hedera testnet creada en portal.hedera.com
- [ ] Topic creado y topicId guardado en .env
- [ ] Mensaje registrado exitosamente en HCS
- [ ] Verificable en hashscan.io

---

## PARTE 4b — Stellar Hackathon

> **Modalidad: Hackathon completo.** Código funcional con Soroban integrado al producto.

### Contexto del track Stellar

- **Hackathon (USD 1.500):** 1º USD 700 · 2º USD 600 · 3º USD 200
- **Deadline:** Viernes 17hs — igual que los demás tracks.
- **Jurado preselección (viernes):** Alberto Chaves (Trustless Work) y Maria Elisa Araya (Buen Día Builders)
- **Jurado final (sábado):** Ann (Stellar SDF), Alejandra Vargas (Starmark), Martin Gutter (BAF)
- **Guía oficial preparada para el evento:** `github.com/BuenDia-Builders/stellar-guide-vendimia-tech`
- **Docs Lendara (protocolo de pagos Stellar):** `lendaraprotocol.gitbook.io/lendara`

**Entregables obligatorios Stellar Hackathon:**

- Repo público (GitHub) con código original desarrollado en el evento
- Demo funcional accesible por link
- Video demo + pitch (5 min max)
- Deck de slides
- Evidencia de validación del problema (el PDF del estudio de clientes cubre esto)

**El argumento para el jurado de Stellar:**

```
"Los microseguros paramétricos de VESTA necesitan pagos instantáneos en stablecoin
al productor cuando se confirma una helada. Stellar Soroban es la infraestructura
ideal: bajo costo por transacción, finality en 5 segundos, y soporte nativo para
USDC. El smart contract tiene dos condiciones: oráculo climático confirma helada +
caída de NDVI ≥15% → pago automático al productor sin peritos ni burocracia.
Cero tasadores. Cero espera de 20 días. Liquidez automática la misma noche."
```

### Implementación Soroban

**Instalación:**

```bash
# Rust + Soroban CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked soroban-cli
soroban network add testnet --rpc-url https://soroban-testnet.stellar.org --network-passphrase "Test SDF Network ; September 2015"
```

**Qué construir — contrato mínimo (`contracts/vesta_stellar/src/lib.rs`):**

El contrato de microseguro paramétrico. Más simple que el ERC-721 — no necesita NFT, solo:

```rust
// Lógica mínima del contrato Soroban
// 1. register_policy(producer: Address, coverage_usdc: i128, frost_threshold: i32, ndvi_drop_threshold: i32)
//    → guarda la póliza del productor

// 2. trigger_payout(producer: Address, min_temp: i32, ndvi_drop: i32)
//    → si min_temp <= frost_threshold Y ndvi_drop >= ndvi_drop_threshold
//    → transfiere coverage_usdc en USDC al productor automáticamente

// 3. get_policy(producer: Address) → Policy
//    → devuelve los datos de la póliza
```

**Deploy en Stellar Testnet:**

```bash
soroban contract build
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/vesta_stellar.wasm --network testnet --source [TU_KEYPAIR]
```

**Integración con el frontend (lib/stellar.ts):**

```typescript
import * as StellarSdk from "@stellar/stellar-sdk";

// npm install @stellar/stellar-sdk
const server = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");

export async function triggerPayout(
  producerAddress: string,
  minTemp: number, // temperatura mínima real detectada x100 (ej: 310 = 3.1°C)
  ndviDrop: number, // caída de NDVI en % (ej: 20 = 20%)
) {
  // Llamar a trigger_payout del contrato Soroban
  // Si las condiciones se cumplen, el contrato ejecuta el pago automáticamente
}
```

**Caso de uso para el pitch de Stellar:**

```
El 23 de marzo de 2026:
1. VESTA detecta temperatura mínima proyectada: 3.1°C (umbral: 2°C)
2. Imagen Sentinel-2 post-evento confirma caída de NDVI ≥15%
3. El smart contract Soroban verifica ambas condiciones
4. Pago automático en USDC al productor — sin tasador, sin espera de 20 días
5. Todo verificable on-chain en Stellar Explorer
```

**Checklist Parte 4b — Stellar Hackathon:**

- [ ] Leer guía oficial: github.com/BuenDia-Builders/stellar-guide-vendimia-tech
- [ ] Leer docs Lendara: lendaraprotocol.gitbook.io/lendara
- [ ] Registrar en DoraHacks track Stellar Hackathon antes del viernes 17hs
- [ ] Contrato Soroban compilando sin errores (cargo build)
- [ ] Deploy en Stellar Testnet con address guardado en .env.local
- [ ] Función trigger_payout ejecutable desde el frontend de VESTA
- [ ] Al menos 1 transacción exitosa en Stellar Testnet
- [ ] Integración visible en el demo: botón "Activar Microseguro" en el dashboard

### Tracks actualizados con Stellar

```
TRACK           MODALIDAD        PREMIO POSIBLE     ESFUERZO
─────────────────────────────────────────────────────────────
Stellar         Hackathon        USD 200-700        ALTO (Soroban — PRIORIDAD)
Hedera          Hackathon        USD 300 + ~1000    MEDIO (JS SDK)
BNB Chain       Hackathon        USD 300-800        BAJO (Solidity ✅ ya hecho)
Rootstock       Hackathon        USD 100 bono       MUY BAJO (mismo deploy)
Beexo Connect   Add-on           USD 50 bono        MUY BAJO (npm install)
─────────────────────────────────────────────────────────────
MÍNIMO GARANTIZABLE (bonos + Hedera pool): USD 350-400
CON STELLAR HACKATHON TOP 3:               USD 550-1.100
```

## PARTE 5 — Demo y entregables

### El demo mínimo que debe funcionar

1. Abrir la app en Vercel
2. Coordenadas de Monteviejo pre-cargadas
3. Click "Analizar" → imagen Sentinel-2 real aparece en el mapa
4. Dashboard muestra análisis de Gemini en tarjetas
5. Gráfico de temperatura con la helada del 23 Mar marcada
6. Click "Certificar" → elegir red → conectar wallet → ejecutar transacción en la red elegida
7. Aparecer el hash + QR
8. Escanear el QR → pasaporte de la botella en mobile
9. Click "Agregar a colección" → badge desbloqueado

### README.md mínimo

```markdown
# VESTA — La Verdad del Vino

Satelite + Blockchain + IA para la vitivinicultura mendocina.

## Demo

https://vesta.vercel.app

## Contratos deployados

- BSC Testnet: 0x[address]
- RSK Testnet: 0x[address]
- Hedera Testnet EVM: 0x[address]
- Hedera Topic: 0.0.[topicId]
- Stellar Contract: [address]

## Cómo correr localmente

npm install
cp .env.example .env.local

# Completar variables de entorno

npm run dev

## Tracks

- Hedera: Certificados de sostenibilidad con HCS
- BNB Chain: NFT coleccionable ERC-721 en BSC
- Rootstock: Mismo contrato en RSK
- Beexo Connect: xo-connect para wallet UX

## Stack

Next.js 14 · TypeScript · Solidity · Hedera SDK · Gemini · Sentinel-2
```

### Video demo — guión 2 minutos

```
00:00 — "El 23 de marzo, la temperatura bajó a 3.1°C sobre Bodega Monteviejo.
         VESTA lo habría alertado 8 horas antes."
00:15 — Mostrar la app: mapa de Mendoza, click en Analizar
00:30 — Imagen Sentinel-2 real cargando sobre el mapa
00:45 — Dashboard: tarjetas de estado, gráfico con la helada marcada
01:00 — Click Certificar, conectar wallet, tx confirmada
01:15 — Escanear QR → pasaporte de la botella en mobile
01:30 — Badge desbloqueado en la colección
01:45 — "36 mil millones de botellas por año. Cada una puede tener una historia verificada."
02:00 — Mostrar contratos en BSC testnet y Hedera
```

**Checklist Parte 5:**

- [ ] App deployada en Vercel con URL pública
- [ ] README.md con contratos y instrucciones
- [ ] Video demo de 2-3 minutos subido
- [ ] Proyecto registrado en DoraHacks (ANTES DEL JUEVES 17hs)
- [ ] Tracks seleccionados en DoraHacks: Stellar Hackathon + Hedera + BNB + Beexo
- [ ] Deck de slides preparado

---

## Orden de implementación recomendado

```
DÍA 1 (mañana):
  09:00 — Crear repo GitHub, instalar Next.js, estructura de carpetas
  09:30 — Registrar en DoraHacks TODOS los tracks: Stellar + Hedera + BNB + Beexo (URGENTE)
  10:00 — Parte 1: Contrato Solidity + deploy BSC testnet + deploy RSK testnet + deploy Hedera EVM
  11:30 — Parte 4b: Arrancar Soroban — instalar Rust + Soroban CLI + leer guía
  12:30 — Parte 2a: /api/analyze (Sentinel-2 + Gemini)
  14:00 — Parte 2b: /api/weather (OpenMeteo + alertas dT/dt)
  15:30 — Parte 4b: Contrato Soroban — escribir y compilar
  17:00 — Parte 4: Hedera HCS registro
  18:00 — Review: ¿selector de chain funcionando? ¿2 txs en BSC? ¿Soroban compilando? ¿Hedera funcionando?

DÍA 2 (pasado mañana):
  09:00 — Parte 4b: Deploy Soroban en Stellar Testnet + test trigger_payout
  10:30 — Parte 3a/3b: Mapa + Dashboard
  12:00 — Parte 2d: /api/certify + CertifyButton (chain selectable + adapters)
  13:30 — Parte 3c: Pasaporte consumidor (QR)
  14:30 — Parte 3e: xo-connect integrado + Beexo SDK
  15:30 — Deploy Vercel, README con todos los contratos, video demo
  16:45 — DEADLINE DoraHacks — subir todo antes de las 17hs

DÍA 3 (pitch):
  Mañana: Ensayar pitch 3 veces en voz alta
  Tarde: Grand Pitch en el escenario
```

---

## Datos reales disponibles para el demo

Estos datos ya están calculados y pueden usarse hardcodeados en el demo:

```typescript
// Coordenadas de EJEMPLO para el botón de demo — no hardcodear en el flujo principal
// El flujo real usa el bbox que dibuja o ingresa el usuario
const DEMO_BBOX = [-69.26, -33.69, -69.21, -33.64]; // solo para botón "Cargar ejemplo"
const DEMO_CENTER = { lat: -33.6644, lon: -69.2368 }; // solo para botón "Cargar ejemplo"

// Helper para calcular el centro de cualquier bbox ingresado por el usuario:
// const center = { lat: (bbox[1] + bbox[3]) / 2, lon: (bbox[0] + bbox[2]) / 2 }

// Evento de helada real detectado
const FROST_EVENT = {
  date: "2026-03-23",
  minTemp: 3.1,
  alertDate: "2026-03-22",
  hoursOfWarning: 8,
  climateEventId: "helada_23mar2026",
};

// Clima real 31 días (Feb 23 – Mar 25, 2026)
const WEATHER_SUMMARY = {
  avgTempMax: 24.0,
  avgTempMin: 11.5,
  totalPrecip: 11.9, // mm
  totalET0: 126.29, // mm
  waterBalance: -114.39, // mm (negativo = déficit)
};

// Análisis Gemini ya testeado
const GEMINI_RESULT = {
  estado_general: "bueno",
  cobertura_vegetal: "alta",
  urgencia: "esta_semana",
  confianza_analisis: "alta",
};
```

---

## Notas importantes

1. **No mostrar "NDVI" en ninguna pantalla visible** — usar "vigor vegetativo" o "salud de la planta"
2. **El banner de alerta de helada** debe ser imposible de ignorar — fondo rojo, ancho completo
3. **El pasaporte del consumidor** debe abrir en 2 segundos en mobile — optimizar imágenes
4. **Las credenciales de Copernicus** tienen que regenerarse antes del hackathon — las actuales fueron compartidas en un chat público
5. **DoraHacks registro** — sin este paso no evalúan el proyecto aunque esté perfecto
6. **2 transacciones en BSC** son OBLIGATORIAS para el track BNB — hacerlo el día 1

---

## Estado del proyecto al momento de crear este spec

| Área               | Estado                                     |
| ------------------ | ------------------------------------------ |
| Producto e idea    | ✅ Completo                                |
| Datos satelitales  | ✅ API testeada, código Python funcionando |
| Pipeline IA Gemini | ✅ Testeado con output JSON real           |
| Datos climáticos   | ✅ 31 días reales de Monteviejo            |
| Contrato Solidity  | ⚠️ Diseñado, no escrito                    |
| Frontend           | ❌ Pendiente                               |
| Backend API Routes | ❌ Pendiente                               |
| Hedera             | ❌ Pendiente                               |
| Deploy Vercel      | ❌ Pendiente                               |
| DoraHacks          | ❌ URGENTE                                 |

---

## Estudio de clientes — para orientar decisiones de UX

### Segmento 1 — Roberto P. (productor mediano)

- 20-80 ha · Valle de Uco · sin agrónomo permanente
- Tecnología actual: WhatsApp, cuaderno de campo, pronóstico de radio genérico para Mendoza
- **Pain principal:** se entera del daño caminando el viñedo, días después. Enciende calentadores con 2hs de margen — demasiado tarde.
- **Lo que quiere:** alerta 8hs antes, en su celular, para su parcela específica — no para Mendoza en general
- **Barrera:** conectividad rural irregular → la app DEBE funcionar con 3G básico
- **WTP:** USD 99-150/mes si evita UNA noche crítica de helada. ROI inmediato.
- **Canal de adopción:** recomendación de pares, ACOVI, cooperativas locales

### Segmento 2 — Claudia L. (bodega exportadora)

- 100-500 ha · Luján de Cuyo/Valle de Uco · exporta a Europa y Asia
- **Pain principal:** auditorías de sostenibilidad USD 5.000-15.000/año, lentas y manipulables
- **Lo que quiere:** certificado automático que el importador europeo acepte sin intermediarios
- **Postura blockchain:** escéptica — solo si el importador europeo lo acepta como evidencia válida
- **WTP:** USD 299/mes si reemplaza la auditoría anual
- **Ciclo de venta:** 3-6 meses, requiere aprobación técnica + legal + comercial

### Segmento 3 — Estado / aseguradoras (año 2-3)

- Ministerio de Producción Mendoza, DACC, ACOVI, reaseguradoras
- FCA actual: tasadores presenciales, 20 días para denunciar siniestro, burocracia
- **Lo que ofrece VESTA:** NDVI drop ≥15% como evidencia objetiva automática para el FCA
- **NO es cliente año 1** — pero si el Ministerio valida el dato satelital, el mercado se abre a todos

### Implicaciones de UX críticas

- La app del productor DEBE funcionar en mobile con 3G — no depender de imágenes pesadas
- El banner de alerta de helada debe ser la primera cosa visible, no el mapa bonito
- El lenguaje es "tu parcela", "tus lotes", "esta noche" — nunca "NDVI", "índice espectral", "on-chain"
- El certificado de la bodega es un PDF normal — el blockchain es invisible para el usuario

---

## Pitch de VESTA — estructura para el día 3

```
00:00-00:45 — EL PROBLEMA (con datos reales)
  "En 2023 y 2024, Mendoza declaró emergencia agropecuaria dos años seguidos.
   +60.000 hectáreas afectadas. Productores que perdieron el 100% de su cosecha.
   El presidente del INV lo dijo: necesitamos defensas efectivas y modernas.
   Esa defensa no existe todavía en LATAM."

00:45-01:30 — LA SOLUCIÓN
  "El 22 de marzo de este año, sobre Bodega Monteviejo, la temperatura iba a
   bajar a 3.1°C esa noche. VESTA lo detectó a las 18hs y generó esta alerta."
  [mostrar el banner rojo en la pantalla]
  "8 horas de ventaja para encender los calentadores."

01:30-02:30 — EL DEMO
  [imagen Sentinel-2 real cargando en el mapa]
  [dashboard con análisis de Gemini]
  [certificar on-chain → hash → QR]
  [escanear QR → pasaporte de la botella]

02:30-03:15 — EL MERCADO
  "896 bodegas en Mendoza. 14.593 viñedos.
   USD 99/mes para el productor. USD 299/mes para la bodega.
   SpectralGeo hace esto en España. Nosotros lo hacemos aquí, con blockchain nativo."

03:15-04:00 — BLOCKCHAIN (por qué no es decorativo)
  Hedera: certificados de sostenibilidad — el mismo satélite que alerta la helada
           certifica el daño para el Fondo Compensador sin tasador
  BNB:    NFT coleccionable — cada botella es un terroir verificado
  Beexo:  wallet sin fricción — onboarding con un QR

04:00-05:00 — CIERRE
  "36 mil millones de botellas por año. Cada una puede tener una historia verificada.
   VESTA empieza con el productor mendocino que no durmió esa noche de helada.
   Termina con el consumidor en Tokio que escanea el QR y ve el mapa satelital
   de dónde creció su vino."
```
