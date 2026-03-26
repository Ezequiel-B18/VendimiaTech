import base64
import json
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
IMAGENES = [
	r"D:\proyectos\VendimiaTech\foto1.jpeg",
	r"D:\proyectos\VendimiaTech\foto2.jpeg",
]

client = genai.Client(api_key=API_KEY)

# Construir el input con ambas imágenes en una sola consulta
input_parts = []

for i, path in enumerate(IMAGENES, start=1):
    with open(path, "rb") as f:
        base64_image = base64.b64encode(f.read()).decode("utf-8")
    ext = path.split(".")[-1].lower()
    mime_types = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
    mime_type = mime_types.get(ext, "image/jpeg")

    input_parts.append({"type": "text", "text": f"--- IMAGEN {i} ---"})
    input_parts.append({"type": "image", "data": base64_image, "mime_type": mime_type})

# Agregar el prompt al final
input_parts.append({"type": "text", "text": """
Sos un agrónomo especialista en viticultura. Te envío DOS imágenes de parcelas de viña.
Analizalas en conjunto y respondé ÚNICAMENTE con este JSON, sin texto adicional:

{
  "parcela_1": {
    "estado_general": "bueno|regular|malo",
    "cobertura_vegetal": "alta|media|baja",
    "zonas_problematicas": ["descripción"],
    "posibles_problemas": ["problema"],
    "urgencia": "inmediata|esta_semana|este_mes|sin_urgencia"
  },
  "parcela_2": {
    "estado_general": "bueno|regular|malo",
    "cobertura_vegetal": "alta|media|baja",
    "zonas_problematicas": ["descripción"],
    "posibles_problemas": ["problema"],
    "urgencia": "inmediata|esta_semana|este_mes|sin_urgencia"
  },
  "comparacion": "texto comparando ambas parcelas",
  "recomendaciones_generales": ["acción 1", "acción 2", "acción 3"],
  "confianza_analisis": "alta|media|baja",
  "observaciones": "observaciones generales sobre ambas imágenes"
}
"""})

print("Enviando ambas imágenes en una sola consulta...")
print("Consultando Gemini...\n")

interaction = client.interactions.create(
    model="gemini-2.5-flash",
    input=input_parts
)

raw = interaction.outputs[-1].text
print("=== RESPUESTA RAW ===")
print(raw)

print("\n=== RESPUESTA PARSEADA ===")
try:
    clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    resultado = json.loads(clean)
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
except json.JSONDecodeError:
    print("(No se pudo parsear como JSON)")
    print(raw)

print("\n=== USO DE TOKENS ===")
print("Total tokens usados:", interaction.usage.total_tokens)