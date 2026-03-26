import os
from dotenv import load_dotenv
import requests

load_dotenv()

# 1. Token
r = requests.post(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    data={
        "client_id": os.getenv("COPERNICUS_CLIENT_ID"),
        "client_secret": os.getenv("COPERNICUS_CLIENT_SECRET"),
        "grant_type": "client_credentials"
    }
)
token = r.json()["access_token"]

evalscript = """
//VERSION=3
function setup() {
  return {
    input: ["B03", "B04", "B08", "B8A", "B11"],
    output: { bands: 3, sampleType: "UINT8" }
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
"""

payload = {
    "input": {
        "bounds": {
           "bbox": [-69.26, -33.69, -69.21, -33.64]
        },
        "data": [{
            "type": "sentinel-2-l2a",
            "dataFilter": { "maxCloudCoverage": 20 }
        }]
    },
    "evalscript": evalscript,
    "output": {
        "width": 512,
        "height": 512,
        "format": {
            "type": "image/png",
            "sampleType": "UINT8"
        }
    }
}

img = requests.post(
    "https://sh.dataspace.copernicus.eu/api/v1/process",
    headers={"Authorization": f"Bearer {token}"},
    json=payload
)

print("Status:", img.status_code)
if img.status_code == 200:
    with open("indices_monteviejo.png", "wb") as f:
        f.write(img.content)
    print("Guardado como indices_monteviejo.png")
    print()
    print("LEYENDA:")
    print("  Verde intenso  → vegetación sana, buena madurez")
    print("  Verde claro    → vegetación ok, madurez media")
    print("  Amarillo       → vigor bajo o clorofila insuficiente")
    print("  Azul           → humedad foliar alta (alerta fúngica potencial)")
    print("  Rojo           → sin vegetación")
else:
    print("Error:", img.text)