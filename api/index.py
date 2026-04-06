from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime
from spatial_utils import check_risks_on_route
from rules_engine import obtener_restriccion_carga

app = FastAPI(title="PESV Dynamic Risk API")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SOURCES = {
    "UNGRD": "https://datos.gov.co/resource/wwkg-r6te.json",
    "ACCIDENTES": "https://datos.gov.co/resource/v5m2-p35c.json"
}

async def fetch_data(url, params):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, params=params)
            return response.json()
        except:
            return []

async def fetch_all_data():
    tasks = [
        fetch_data(SOURCES["UNGRD"], {"$limit": 100, "$order": "fecha_inicio DESC"}),
        fetch_data(SOURCES["ACCIDENTES"], {"$limit": 100, "$order": "fecha DESC"})
    ]
    results = await asyncio.gather(*tasks)
    return (results[0] or []) + (results[1] or [])

def calcular_score(alertas, restriccion):
    if restriccion and restriccion["estado"] == "RESTRICCIÓN ACTIVA":
        return "CRÍTICO - NO DESPACHAR"
    if len(alertas) > 2:
        return "RIESGO ALTO - RUTA ALTERNA"
    return "ÓPTIMO"

@app.post("/api/analizar-ruta")
async def analizar_ruta(
    payload: dict = Body(...),
    radio: int = 1000
):
    """
    Recibe coordenadas de ruta y devuelve riesgos del PESV.
    """
    coords = payload.get("coordinates")

    if not coords or len(coords) < 2:
        return {"error": "Se requieren al menos 2 coordenadas"}

    # Consultas paralelas a fuentes oficiales
    all_incidents = await fetch_all_data()

    # Análisis espacial
    alertas = check_risks_on_route(coords, all_incidents, buffer_meters=radio)

    return {
        "status": "success",
        "riesgo_total": len(alertas),
        "alertas": alertas,
        "recomendacion_pesv": "ALTA PRECAUCIÓN" if alertas else "RUTA DESPEJADA"
    }

@app.post("/api/analizar-ruta-pro")
async def analizar_ruta_pro(
    payload: dict = Body(...), 
    tipo_vehiculo: str = "tractocamion",
    peso_toneladas: float = 3.5
):
    coords = payload.get("coordinates")
    
    if not coords or len(coords) < 2:
        return {"error": "Se requieren al menos 2 coordenadas"}

    # 1. Análisis de Riesgos Geográficos
    incidentes_crudos = await fetch_all_data() 
    alertas_geograficas = check_risks_on_route(coords, incidentes_crudos)
    
    # 2. Análisis Normativo de Carga
    restriccion = None
    if peso_toneladas >= 3.4:
        restriccion = obtener_restriccion_carga(tipo_vehiculo)
        
    # 3. Respuesta de Ingeniería de Información
    return {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "unidad_monitoreo": "PESV / Logística"
        },
        "analisis_vial": {
            "eventos_detectados": len(alertas_geograficas),
            "detalle_alertas": alertas_geograficas
        },
        "analisis_normativo": {
            "aplica_restriccion": peso_toneladas >= 3.4,
            "info_restriccion": restriccion
        },
        "score_seguridad": calcular_score(alertas_geograficas, restriccion)
    }

@app.get("/api/v1/salud")
def health_check():
    return {"status": "online", "engine": "FastAPI on Vercel"}

@app.get("/")
def root():
    return {"message": "PESV API is running", "docs": "/docs"}
