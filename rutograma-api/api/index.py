from fastapi import FastAPI, Body
import httpx
import asyncio
from .spatial_utils import check_risks_on_route

app = FastAPI(title="PESV Dynamic Risk API")

SOURCES = {
    "UNGRD": "https://datos.gov.co/resource/wwkg-r6te.json",
    "ACCIDENTES": "https://datos.gov.co/resource/v5m2-p35c.json"
}

async def fetch_data(url, params):
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        return response.json()

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
    tasks = [
        fetch_data(SOURCES["UNGRD"], {"$limit": 100, "$order": "fecha_inicio DESC"}),
        fetch_data(SOURCES["ACCIDENTES"], {"$limit": 100, "$order": "fecha DESC"})
    ]

    results = await asyncio.gather(*tasks)
    all_incidents = results[0] + results[1]

    # Análisis espacial
    alertas = check_risks_on_route(coords, all_incidents, buffer_meters=radio)

    return {
        "status": "success",
        "riesgo_total": len(alertas),
        "alertas": alertas,
        "recomendacion_pesv": "ALTA PRECAUCIÓN" if alertas else "RUTA DESPEJADA"
    }

@app.get("/api/v1/salud")
def health_check():
    return {"status": "online", "engine": "FastAPI on Vercel"}
