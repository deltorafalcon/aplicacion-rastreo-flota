from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
from datetime import datetime

app = FastAPI(title="PESV Dynamic Risk API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UNGRD_API = "https://datos.gov.co/resource/wwkg-r6te.json"
VIAS_API = "https://datos.gov.co/resource/v5m2-p35c.json"

async def fetch_ungrd_events(depto: str):
    async with httpx.AsyncClient() as client:
        params = {
            "departamento": depto.upper(),
            "$where": "vias_averiadas > 0 OR puentes_vehiculares > 0",
            "$order": "fecha_inicio DESC",
            "$limit": 10
        }
        response = await client.get(UNGRD_API, params=params, timeout=20.0)
        response.raise_for_status()
        return response.json()

async def fetch_weather_risk(lat: float, lon: float):
    # Simulamos respuesta de OpenWeather para el flujo del rutograma.
    return {
        "precipitacion": "Moderada",
        "visibilidad": "80%",
        "alerta": "Neblina en zona de montaña"
    }

@app.get("/api/v1/rutograma/analisis")
async def get_route_risk(lat: float, lon: float, depto: str = "CUNDINAMARCA"):
    ungrd_task = fetch_ungrd_events(depto)
    weather_task = fetch_weather_risk(lat, lon)

    events, weather = await asyncio.gather(ungrd_task, weather_task)

    risk_level = "Bajo"
    if len(events) > 0 or "Lluvia" in weather.get('precipitacion', ''):
        risk_level = "Alto - Requiere validación de Despacho"

    return {
        "timestamp": datetime.now().isoformat(),
        "coordenadas_consulta": {"lat": lat, "lon": lon},
        "estado_vias_ungrd": events,
        "condiciones_climaticas": weather,
        "score_pesv": {
            "nivel_riesgo": risk_level,
            "recomendacion": "Verificar cadena de tracción y luces antiniebla."
        }
    }

@app.get("/api/v1/salud")
def health_check():
    return {"status": "online", "engine": "FastAPI on Vercel"}
