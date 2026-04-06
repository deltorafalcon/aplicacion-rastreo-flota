# Despliegue en Vercel - Aplicación de Rastreo de Flota con Análisis PESV

## 🚀 Despliegue del Microservicio API

### 1. Crear Repositorio Separado para el API
```bash
# Crear nuevo repositorio en GitHub llamado "pesv-rutograma-api"
# Copiar solo la carpeta rutograma-api/ al nuevo repositorio
```

### 2. Desplegar en Vercel
1. Ve a [vercel.com](https://vercel.com) y conecta tu cuenta de GitHub
2. Importa el repositorio `pesv-rutograma-api`
3. Vercel detectará automáticamente que es un proyecto Python con FastAPI
4. El despliegue debería completarse automáticamente

### 3. Obtener la URL del API
Después del despliegue, Vercel te dará una URL como:
`https://pesv-rutograma-api.vercel.app`

## 🔧 Configuración del Frontend

### Actualizar URL del API
En `src/components/MapView.jsx`, reemplaza:
```javascript
const response = await fetch('https://tu-api.vercel.app/api/analizar-ruta-pro', {
```
Con la URL real de Vercel:
```javascript
const response = await fetch('https://pesv-rutograma-api.vercel.app/api/analizar-ruta-pro', {
```

### Desplegar Frontend en Vercel
1. Crea un nuevo proyecto en Vercel
2. Importa el repositorio principal `aplicacion-rastreo-flota`
3. Vercel detectará automáticamente que es un proyecto Vite
4. El despliegue debería completarse automáticamente

## 📋 Funcionalidades Implementadas

### API de Análisis Espacial
- **Motor de Intersección**: Usa Shapely y PyProj para análisis geométrico preciso
- **Sistema de Coordenadas**: EPSG:3116 (Magna-Sirgas / Colombia Bogota) para cálculos en metros
- **Buffer de Seguridad**: Área de influencia configurable (por defecto 500m) alrededor de la ruta
- **Fuentes de Datos**:
  - UNGRD: Eventos de vías averiadas
  - ANSV: Accidentes viales históricos
- **Respuesta**: Lista de alertas con distancia exacta a la vía

### Frontend Integrado
- **Análisis Automático**: Se ejecuta cuando se dibuja una ruta en el mapa
- **Marcadores de Alerta**: Iconos rojos ⚠️ en puntos de riesgo
- **Panel de Información**: Muestra alertas detectadas en tiempo real
- **Indicador de Carga**: Feedback visual durante el análisis

### Recomendaciones PESV
- **Ruta Segura**: "RUTA DESPEJADA"
- **Riesgo Detectado**: "ALTA PRECAUCIÓN" con detalles específicos

## 🧪 Pruebas

### Probar el API
```bash
curl -X POST "https://tu-api.vercel.app/api/analizar-ruta" \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [
      [-74.26, 4.72],
      [-74.20, 4.75]
    ]
  }'
```

### Respuesta Esperada
```json
{
  "status": "success",
  "riesgo_total": 2,
  "alertas": [
    {
      "evento": "Derrumbe",
      "detalle": "Caída de árboles en vía",
      "distancia_via": 150.5,
      "coords": [4.73, -74.22]
    }
  ],
  "recomendacion_pesv": "ALTA PRECAUCIÓN"
}
```

## 📊 Arquitectura

```
Frontend (React + Vite)
    ↓ POST /api/analizar-ruta-pro
API (FastAPI + Vercel)
    ├── Motor Espacial (Shapely + PyProj)
    ├── Motor de Reglas (Holidays + Lógica PESV)
    └── Consultas concurrentes
        ├── UNGRD API
        └── ANSV API
```

## ⚖️ Cumplimiento Normativo

### Resolución 0002307 de 2022
- Restricciones de carga para vehículos > 3.4 toneladas
- Aplicación automática durante festivos y fines de semana
- Excepciones: Perecederos, Combustibles, Oxígeno medicinal

### Plan Estratégico de Seguridad Vial (PESV)
- Análisis dinámico de rutas basado en datos reales
- Score de seguridad integrado
- Recomendaciones automáticas para el despacho

### Nuevas Funcionalidades
- **Motor de Reglas Normativas**: Verifica restricciones de carga según normativa colombiana
- **Análisis PESV Completo**: Combina riesgos viales con restricciones normativas
- **Panel Normativo en Frontend**: Inputs para tipo de vehículo y peso, análisis en tiempo real
- **Score de Seguridad**: Indicador visual (ÓPTIMO, RIESGO ALTO, CRÍTICO)

### Endpoint Pro
```bash
curl -X POST "https://tu-api.vercel.app/api/analizar-ruta-pro?tipo_vehiculo=tractocamion&peso_toneladas=3.5" \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [
      [-74.26, 4.72],
      [-74.20, 4.75]
    ]
  }'
```

### Respuesta del API Pro
```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00",
    "unidad_monitoreo": "PESV / Logística"
  },
  "analisis_vial": {
    "eventos_detectados": 2,
    "detalle_alertas": [...]
  },
  "analisis_normativo": {
    "aplica_restriccion": true,
    "info_restriccion": {
      "estado": "RESTRICCIÓN ACTIVA",
      "motivo": "Puente Festivo / Fin de Semana",
      "normativa": "Resolución 0002307 de 2022"
    }
  },
  "score_seguridad": "CRÍTICO - NO DESPACHAR"
}
```
    ↓ Respuesta JSON
Frontend (Marcadores + Panel)
```

## 🔒 Seguridad y Rendimiento

- **Librerías Optimizadas**: Shapely y PyProj son puras Python, sin dependencias C++
- **Consultas Asíncronas**: Múltiples APIs consultadas en paralelo
- **Caché Recomendado**: Implementar Redis para datos de APIs (no incluido en esta versión)
- **Rate Limiting**: Vercel maneja automáticamente límites de tasa

## 🎯 Próximos Pasos

1. **Implementar Caché**: Agregar Redis para datos de UNGRD/ANSV
2. **Alertas en Tiempo Real**: WebSockets para actualizaciones live
3. **Machine Learning**: Predicción de riesgos basada en histórico
4. **Dashboard Administrativo**: Panel de control para gestores de flota