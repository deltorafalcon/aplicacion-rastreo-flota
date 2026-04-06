#!/usr/bin/env python3
"""
Script para ejecutar el API de PESV localmente durante desarrollo.
"""
import uvicorn
import sys
import os

# Agregar el directorio actual al path para importar los módulos
sys.path.insert(0, os.path.dirname(__file__))

if __name__ == "__main__":
    print("🚀 Iniciando API de PESV en modo desarrollo local...")
    print("📍 URL: http://localhost:8000")
    print("📚 Documentación: http://localhost:8000/docs")
    print("🔄 Presiona Ctrl+C para detener")

    uvicorn.run(
        "api.index:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Recarga automática en cambios
        log_level="info"
    )