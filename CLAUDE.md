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
Tracks: Hedera + BNB + Rootstock + Beexo Connect.
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
  - xo-connect → conexión de wallet en frontend
```

```
Variables de entorno (.env.local):
COPERNICUS_CLIENT_ID=sh-a8721ab2-8fe6-4019-8d31-ef89dca9354e
COPERNICUS_CLIENT_SECRET=[regenerar antes del hackathon]
GEMINI_API_KEY=[obtener de Google AI Studio]
NEXT_PUBLIC_BSC_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
NEXT_PUBLIC_RSK_RPC=https://public-node.testnet.rsk.co
NEXT_PUBLIC_CONTRACT_ADDRESS=[después del deploy]
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
│   ├── blockchain.ts               # ethers.js + contrato ABI
│   ├── hedera.ts                   # Hedera JS SDK
│   └── alerts.ts                   # Lógica dT/dt predictiva
├── contracts/
│   ├── VESTA.sol             # Contrato ERC-721 principal
│   └── deploy.ts                   # Script deploy BSC + RSK
└── public/
    └── sample-ndvi.png             # Imagen Monteviejo pre-generada para demo
```

---

## PARTE 1 — Contrato Solidity

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

- [ ] VESTA.sol escrito y compilando sin errores
- [ ] Deploy exitoso en BSC Testnet con address guardado
- [ ] Deploy exitoso en RSK Testnet con address guardado
- [ ] Al menos 2 transacciones de test en BSC (requerido BNB track)
- [ ] ABI exportado a `lib/abi.json`

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

**Input (POST):** `{ "lat": -33.6644, "lon": -69.2368 }`

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

**Flujo:** Usar ethers.js para llamar a `mintCertificate` en el contrato deployado en BSC Testnet. Devolver `{ tokenId, txHash, blockNumber }`.

**También:** Llamar a Hedera JS SDK para registrar el mismo hash en HCS (Hedera Consensus Service) como segundo registro.

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
Botón prominente "Analizar mi parcela".
Al clickear: modo dibujo sobre el mapa para seleccionar bbox.
Coordenadas pre-cargadas de Monteviejo para el demo: `[-69.26, -33.69, -69.21, -33.64]`
Al confirmar bbox → spinner → redirect a `/dashboard?bbox=...`

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
- Al clickear: abre xo-connect para conectar wallet
- Llama a `/api/certify` → muestra hash + QR del tokenId generado
- Estado: idle → connecting → minting → success

### 3c. Pasaporte consumidor (`app/bottle/[tokenId]/page.tsx`)

Esta página es lo que se abre al escanear el QR de la botella.
Debe ser mobile-first. Sin navbar. Sin fricción.

**Secciones en scroll:**

1. Hero: foto del viñedo (imagen Sentinel-2 coloreada) + nombre bodega + variedad + cosecha. Grande y bonito.
2. Mapa simplificado: solo verde/amarillo, sin etiquetas técnicas. Texto: "Las uvas de esta botella crecieron aquí. El satélite confirmó vegetación sana."
3. Tres datos de clima con íconos SVG grandes: 🌡️ Temp media · 🌧️ Precipitación · ☀️ Días de sol
4. Sello blockchain: círculo verde "Verificado on-chain" + hash abreviado + link al explorador BSC
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

## PARTE 5 — Demo y entregables

### El demo mínimo que debe funcionar

1. Abrir la app en Vercel
2. Coordenadas de Monteviejo pre-cargadas
3. Click "Analizar" → imagen Sentinel-2 real aparece en el mapa
4. Dashboard muestra análisis de Gemini en tarjetas
5. Gráfico de temperatura con la helada del 23 Mar marcada
6. Click "Certificar" → conectar wallet → mintear NFT en BSC testnet
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
- Hedera Topic: 0.0.[topicId]

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
- [ ] Tracks seleccionados en DoraHacks: Hedera + BNB + Beexo
- [ ] Deck de slides preparado

---

## Orden de implementación recomendado

```
DÍA 1 (mañana):
  09:00 — Crear repo GitHub, instalar Next.js, estructura de carpetas
  09:30 — Registrar en DoraHacks (URGENTE, no olvidar)
  10:00 — Parte 1: Contrato Solidity + deploy BSC testnet
  12:00 — Parte 2a: /api/analyze (Sentinel-2 + Gemini)
  14:00 — Parte 2b: /api/weather (OpenMeteo + alertas)
  16:00 — Parte 4: Hedera HCS registro
  18:00 — Review: ¿hay 2 txs en BSC? ¿Hedera funcionando?

DÍA 2 (pasado mañana):
  09:00 — Parte 3a/3b: Mapa + Dashboard
  11:00 — Parte 2d: /api/certify + CertifyButton
  13:00 — Parte 3c: Pasaporte consumidor (QR)
  15:00 — Parte 3e: xo-connect integrado
  16:00 — Deploy Vercel, README, video demo
  17:00 — DEADLINE DoraHacks — subir todo

DÍA 3 (pitch):
  Mañana: Ensayar pitch 3 veces en voz alta
  Tarde: Grand Pitch en el escenario
```

---

## Datos reales disponibles para el demo

Estos datos ya están calculados y pueden usarse hardcodeados en el demo:

```typescript
// Coordenadas Bodega Monteviejo (testeadas y funcionando)
const MONTEVIEJO_BBOX = [-69.26, -33.69, -69.21, -33.64];
const MONTEVIEJO_CENTER = { lat: -33.6644, lon: -69.2368 };

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
