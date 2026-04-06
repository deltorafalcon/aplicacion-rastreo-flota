import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as Esri from 'esri-leaflet';
import 'leaflet.heat';
import { getStoredRoute } from './RouteHistory';

// Fix for default marker icons in Leaflet + Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// === BASEMAP DEFINITIONS ===
const BASEMAPS = {
    carto_dark: {
        name: 'CARTO Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        icon: '🌑',
        preview: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)'
    },
    arcgis_street: {
        name: 'ArcGIS Calles',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, NGA',
        icon: '🗺️',
        preview: 'linear-gradient(135deg, #f5e6ca, #e8d5b7, #d4c4a8)'
    },
    arcgis_satellite: {
        name: 'ArcGIS Satélite',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri &mdash; Sources: Esri, Maxar, Earthstar Geographics',
        icon: '🛰️',
        preview: 'linear-gradient(135deg, #1a3c1a, #2d5a27, #1e4620)'
    },
    arcgis_dark: {
        name: 'ArcGIS Oscuro',
        url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri &mdash; Sources: Esri, HERE, Garmin, NGA, USGS',
        icon: '🌃',
        preview: 'linear-gradient(135deg, #2c2c2c, #3d3d3d, #4a4a4a)'
    },
    arcgis_topo: {
        name: 'ArcGIS Topográfico',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri &mdash; Sources: Esri, HERE, Garmin, FAO, NOAA, USGS',
        icon: '🏔️',
        preview: 'linear-gradient(135deg, #e8dcc8, #c9d6a3, #a8c68f)'
    }
};

// === OVERLAY DEFINITIONS (ANSV & INVIAS) ===
const OVERLAYS = {
    ansv_siniestros: {
        id: 'ansv_siniestros',
        name: 'Mapa de Calor Accidents (ANSV)',
        url: 'https://services9.arcgis.com/cCK0fP0sWCjveNe8/arcgis/rest/services/ServicioML/FeatureServer/1',
        attribution: '&copy; ANSV Colombia',
        type: 'heatmap',
        icon: '🔥'
    },
    ansv_mortalidad: {
        id: 'ansv_mortalidad',
        name: 'Mortalidad por Municipio',
        url: 'https://services9.arcgis.com/cCK0fP0sWCjveNe8/arcgis/rest/services/MortalidadMunicipio/FeatureServer/23',
        attribution: '&copy; ANSV Colombia',
        type: 'feature',
        icon: '📊'
    },
    ansv_irap: {
        id: 'ansv_irap',
        name: 'Seguridad Vías (iRAP)',
        url: 'https://services9.arcgis.com/cCK0fP0sWCjveNe8/arcgis/rest/services/IRAP_Colombia_2023/FeatureServer/0',
        attribution: '&copy; iRAP / ANSV',
        type: 'feature',
        icon: '⭐'
    },
};

// Heatmap Layer using leaflet.heat
const HeatmapLayer = ({ url, attribution }) => {
    const map = useMap();

    useEffect(() => {
        const heatLayer = L.heatLayer([], {
            radius: 20,
            blur: 15,
            maxZoom: 15,
            gradient: { 0.4: 'rgba(0, 0, 255, 0.7)', 0.6: 'rgba(0, 255, 255, 0.8)', 0.8: 'rgba(255, 255, 0, 0.9)', 1.0: 'rgba(255, 0, 0, 1)' }
        }).addTo(map);

        // Fetch points via FeatureLayer (internal query) to get heatmap data
        const queryLayer = Esri.featureLayer({
            url: url,
            attribution: attribution,
            pointToLayer: (geojson, latlng) => null, // Don't show markers
            style: () => ({ opacity: 0, fillOpacity: 0 })
        });

        queryLayer.on('load', () => {
            const points = [];
            queryLayer.eachFeature((layer) => {
                const latlng = layer.getLatLng();
                points.push([latlng.lat, latlng.lng, 0.6]);
            });
            heatLayer.setLatLngs(points);
        });

        queryLayer.addTo(map);

        return () => {
            map.removeLayer(heatLayer);
            map.removeLayer(queryLayer);
        };
    }, [map, url, attribution]);

    return null;
};

// Speeding Heatmap Layer - Shows vehicle speed violations
const SpeedingHeatmapLayer = ({ fleet, speedLimit = 50 }) => {
    const map = useMap();

    useEffect(() => {
        const heatLayer = L.heatLayer([], {
            radius: 30,
            blur: 20,
            maxZoom: 14,
            gradient: { 0.2: 'rgba(255, 165, 0, 0.5)', 0.5: 'rgba(255, 100, 0, 0.7)', 1.0: 'rgba(255, 0, 0, 0.9)' }
        }).addTo(map);

        // Generate heatmap points from speeding vehicles
        const speedingPoints = fleet
            .filter(vehicle => vehicle.speed > speedLimit)
            .map(vehicle => {
                const intensity = Math.min((vehicle.speed - speedLimit) / 50, 1); // Normalize intensity
                return [vehicle.location[0], vehicle.location[1], intensity];
            });

        if (speedingPoints.length > 0) {
            heatLayer.setLatLngs(speedingPoints);
        }

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, fleet, speedLimit]);

    return null;
};

// Custom Esri Layer bridge for React-Leaflet
const EsriLayer = ({ type, url, attribution, opacity = 0.8 }) => {
    const map = useMap();

    useEffect(() => {
        let layer;
        if (type === 'feature') {
            layer = Esri.featureLayer({
                url,
                attribution,
                opacity
            }).addTo(map);
        } else if (type === 'dynamic') {
            layer = Esri.dynamicMapLayer({
                url,
                attribution,
                opacity
            }).addTo(map);
        }

        return () => {
            if (layer) map.removeLayer(layer);
        };
    }, [map, type, url, attribution, opacity]);

    return null;
};

// Custom vehicle icons based on status
const getVehicleIcon = (status) => {
    const color = status === 'speeding' ? '#ef4444' : '#3b82f6';
    const svgIcon = `
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/>
                <circle cx="12" cy="12" r="4" fill="${color}"/>
            </svg>
        `;
    return L.divIcon({
        html: svgIcon,
        className: 'custom-vehicle-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
};

const SAFETY_FACILITIES = [
    { id: 'police-1', name: 'Estación Policía Fontibón', type: 'police', location: [4.6954, -74.1443] },
    { id: 'police-2', name: 'Puesto de Control Policía Suba', type: 'police', location: [4.7801, -74.1024] },
    { id: 'fire-1', name: 'Bomberos Bogotá Estación Central', type: 'fire', location: [4.5981, -74.0758] },
    { id: 'fire-2', name: 'Bomberos Usaquén', type: 'fire', location: [4.7427, -74.0257] },
    { id: 'health-1', name: 'Cruz Roja Colombiana - Seccional Bogotá', type: 'health', location: [4.6708, -74.0395] },
    { id: 'rescue-1', name: 'Entidad de Socorro Local', type: 'rescue', location: [4.6302, -74.0701] }
];

const getSafetyIcon = (type) => {
    const icons = {
        police: '👮‍♂️',
        fire: '🔥',
        health: '🚑',
        rescue: '🛟'
    };
    const background = {
        police: '#0ea5e9',
        fire: '#ef4444',
        health: '#10b981',
        rescue: '#f59e0b'
    };
    return L.divIcon({
        html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${background[type]};color:#fff;border:2px solid rgba(255,255,255,0.9);font-size:18px;">${icons[type] || '❗'}</div>`,
        className: 'safety-facility-icon',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
};

const getSpeedSegmentStyle = (speed) => {
    if (speed <= 30) return { color: '#22c55e', weight: 4, opacity: 0.9 };
    if (speed <= 50) return { color: '#f59e0b', weight: 5, opacity: 0.95 };
    if (speed <= 90) return { color: '#ef4444', weight: 6, opacity: 0.95 };
    return { color: '#b91c1c', weight: 8, opacity: 1 };
};

function ChangeView({ center, zoom }) {
    const map = useMap();
    if (center) map.setView(center, zoom);
    return null;
}

// Basemap Switcher Component
const BasemapSwitcher = ({ activeBasemap, onSwitch, activeOverlays, onToggleOverlay, routeAlerts, alertsLoading, tipoVehiculo, setTipoVehiculo, pesoToneladas, setPesoToneladas, normativeAnalysis, setNormativeAnalysis, normativeLoading, setNormativeLoading, routePolyline }) => {
    const [isOpen, setIsOpen] = useState(false);

    const analyzeNormativeRoute = async () => {
        if (!routePolyline || routePolyline.length < 2) {
            alert('Primero selecciona un vehículo con ruta para analizar.');
            return;
        }

        setNormativeLoading(true);
        try {
            const coordinates = routePolyline.map(point => [point[1], point[0]]);

            const response = await fetch('https://tu-api.vercel.app/api/analizar-ruta-pro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    coordinates: coordinates
                }),
                params: {
                    tipo_vehiculo: tipoVehiculo,
                    peso_toneladas: pesoToneladas
                }
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del API');
            }

            const data = await response.json();
            setNormativeAnalysis(data);
        } catch (error) {
            console.error('Error analizando ruta normativa:', error);
            setNormativeAnalysis(null);
        } finally {
            setNormativeLoading(false);
        }
    };

    return (
        <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1000,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Capas y mapas"
                style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255,255,255,0.15)',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                }}
            >
                {isOpen ? '✕' : '🗺️'}
            </button>

            {/* Panel */}
            {isOpen && (
                <div style={{
                    marginTop: '8px',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    width: '220px',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '8px',
                        paddingLeft: '4px'
                    }}>
                        Mapa Base
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
                        {Object.entries(BASEMAPS).map(([key, basemap]) => (
                            <button
                                key={key}
                                onClick={() => onSwitch(key)}
                                title={basemap.name}
                                style={{
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: basemap.preview,
                                    border: activeBasemap === key
                                        ? '2px solid #3b82f6'
                                        : '2px solid transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.1rem',
                                    transition: 'transform 0.1s ease',
                                    opacity: activeBasemap === key ? 1 : 0.6
                                }}
                            >
                                {basemap.icon}
                            </button>
                        ))}
                    </div>

                    <div style={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '8px',
                        paddingLeft: '4px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '12px'
                    }}>
                        Capas de Seguridad (ANSV)
                    </div>
                    {Object.entries(OVERLAYS).map(([key, overlay]) => (
                        <button
                            key={key}
                            onClick={() => onToggleOverlay(key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '8px 10px',
                                border: '1px solid transparent',
                                borderRadius: '8px',
                                background: activeOverlays.includes(key)
                                    ? 'rgba(59, 130, 246, 0.2)'
                                    : 'transparent',
                                color: '#fff',
                                cursor: 'pointer',
                                marginBottom: '4px',
                                transition: 'all 0.15s ease',
                                textAlign: 'left'
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '5px',
                                background: activeOverlays.includes(key) ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                flexShrink: 0
                            }}>
                                {overlay.icon}
                            </div>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: activeOverlays.includes(key) ? 600 : 400,
                                opacity: activeOverlays.includes(key) ? 1 : 0.7
                            }}>
                                {overlay.name}
                            </span>
                        </button>
                    ))}

                    {activeOverlays.includes('ansv_mortalidad') && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>Mortalidad Municipal</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>
                                Datos ANSV via datos.gov.co (dataset v5m2-p35c). Consulta en JSON con filtros de municipio.
                            </div>
                            {mortalityLoading ? (
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Cargando datos...</div>
                            ) : mortalityData.length === 0 ? (
                                <div style={{ fontSize: '0.72rem', color: '#f97316' }}>No se encontraron resultados.</div>
                            ) : (
                                <div style={{ display: 'grid', gap: '6px' }}>
                                    {mortalityData.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '0.72rem', color: '#e2e8f0' }}>
                                            <span>{item.municipio}</span>
                                            <strong style={{ color: '#fff' }}>{item.fallecidos}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <a href="https://datos.gov.co/resource/v5m2-p35c.json?$select=a%C3%B1o,municipio,cantidad_fallecidos" target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '10px', color: '#60a5fa', fontSize: '0.7rem' }}>
                                Ver consulta en datos.gov.co
                            </a>
                        </div>
                    )}

                    {/* Route Risk Analysis Panel */}
                    {routeAlerts.length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            borderRadius: '12px',
                            background: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.3)'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#fca5a5' }}>🚨 Alertas de Ruta PESV</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>
                                Análisis espacial detectó {routeAlerts.length} riesgo(s) en la ruta.
                            </div>
                            <div style={{ display: 'grid', gap: '6px' }}>
                                {routeAlerts.slice(0, 3).map((alert, index) => (
                                    <div key={index} style={{ fontSize: '0.7rem', color: '#fecaca', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                                        <strong>{alert.evento}</strong><br />
                                        <small>Distancia: {alert.distancia_via}m</small>
                                    </div>
                                ))}
                                {routeAlerts.length > 3 && (
                                    <div style={{ fontSize: '0.7rem', color: '#fca5a5', fontStyle: 'italic' }}>
                                        ...y {routeAlerts.length - 3} más
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {alertsLoading && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>🔍 Analizando Ruta</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                Consultando APIs de UNGRD y accidentes viales...
                            </div>
                        </div>
                    )}

                    {/* Normative Analysis Section */}
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '8px',
                        paddingLeft: '4px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '12px'
                    }}>
                        Análisis Normativo PESV
                    </div>
                    <div style={{
                        marginBottom: '12px',
                        padding: '10px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.7rem', color: '#e2e8f0', display: 'block', marginBottom: '4px' }}>Tipo de Vehículo</label>
                            <select
                                value={tipoVehiculo}
                                onChange={(e) => setTipoVehiculo(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    fontSize: '0.7rem'
                                }}
                            >
                                <option value="sencillo">Sencillo</option>
                                <option value="dobletroque">Doble Troque</option>
                                <option value="tractocamion">Tracto Camión</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.7rem', color: '#e2e8f0', display: 'block', marginBottom: '4px' }}>Peso (Toneladas)</label>
                            <input
                                type="number"
                                value={pesoToneladas}
                                onChange={(e) => setPesoToneladas(parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.1"
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    fontSize: '0.7rem'
                                }}
                            />
                        </div>
                        <button
                            onClick={analyzeNormativeRoute}
                            disabled={normativeLoading}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '6px',
                                border: 'none',
                                background: normativeLoading ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6',
                                color: '#fff',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: normativeLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {normativeLoading ? 'Analizando...' : 'Analizar Ruta PESV'}
                        </button>
                    </div>

                    {normativeAnalysis && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            borderRadius: '12px',
                            background: normativeAnalysis.score_seguridad.includes('CRÍTICO') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            border: normativeAnalysis.score_seguridad.includes('CRÍTICO') ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: normativeAnalysis.score_seguridad.includes('CRÍTICO') ? '#fca5a5' : '#86efac' }}>
                                📋 Análisis Normativo PESV
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>
                                <strong>Score de Seguridad:</strong> {normativeAnalysis.score_seguridad}
                            </div>
                            {normativeAnalysis.analisis_normativo.info_restriccion && (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff' }}>
                                        Restricción de Carga: {normativeAnalysis.analisis_normativo.info_restriccion.estado}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)' }}>
                                        {normativeAnalysis.analisis_normativo.info_restriccion.motivo}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Norma: {normativeAnalysis.analisis_normativo.info_restriccion.normativa}
                                    </div>
                                </div>
                            )}
                            <div style={{ fontSize: '0.7rem', color: '#e2e8f0' }}>
                                Eventos detectados: {normativeAnalysis.analisis_vial.eventos_detectados}
                            </div>
                        </div>
                    )}

                    <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.55rem',
                        color: 'rgba(255,255,255,0.3)',
                        textAlign: 'center'
                    }}>
                        Datos: ANSV, INVIAS, ArcGIS | Análisis: PESV API
                    </div>
                </div>
            )}
        </div>
    );
};

const MapView = ({ fleet, selectedVehicle, routePolyline }) => {
    const [activeBasemap, setActiveBasemap] = useState('carto_dark');
    const [activeOverlays, setActiveOverlays] = useState([]);
    const [mortalityData, setMortalityData] = useState([]);
    const [mortalityLoading, setMortalityLoading] = useState(false);
    const [routePoints, setRoutePoints] = useState([]);
    const [routeAlerts, setRouteAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [tipoVehiculo, setTipoVehiculo] = useState('tractocamion');
    const [pesoToneladas, setPesoToneladas] = useState(3.5);
    const [normativeAnalysis, setNormativeAnalysis] = useState(null);
    const [normativeLoading, setNormativeLoading] = useState(false);
    const currentBasemap = BASEMAPS[activeBasemap];
    const today = new Date().toISOString().split('T')[0];

    const toggleOverlay = (id) => {
        setActiveOverlays(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        if (!activeOverlays.includes('ansv_mortalidad')) return;

        setMortalityLoading(true);
        fetch('https://datos.gov.co/resource/v5m2-p35c.json?$select=municipio,sum(cantidad_fallecidos) as fallecidos&$group=municipio&$order=sum(cantidad_fallecidos)%20DESC&$limit=8')
            .then(res => res.json())
            .then(data => {
                setMortalityData(data.map(item => ({ municipio: item.municipio, fallecidos: Number(item.fallecidos || 0) })));
                setMortalityLoading(false);
            })
            .catch(() => {
                setMortalityData([]);
                setMortalityLoading(false);
            });
    }, [activeOverlays]);

    useEffect(() => {
        if (selectedVehicle) {
            setRoutePoints(getStoredRoute(selectedVehicle.id, today));
        } else {
            setRoutePoints([]);
        }
    }, [selectedVehicle, today]);

    // Analyze route for risks when routePolyline changes
    useEffect(() => {
        if (!routePolyline || routePolyline.length < 2) {
            setRouteAlerts([]);
            return;
        }

        const analyzeRoute = async () => {
            setAlertsLoading(true);
            try {
                // Convert routePolyline to coordinates format [lon, lat]
                const coordinates = routePolyline.map(point => [point[1], point[0]]); // Leaflet uses [lat, lon], API expects [lon, lat]

                const response = await fetch('https://tu-api.vercel.app/api/analizar-ruta-pro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        coordinates: coordinates
                    }),
                    params: {
                        tipo_vehiculo: 'tractocamion',
                        peso_toneladas: 3.5
                    }
                });

                if (!response.ok) {
                    throw new Error('Error en la respuesta del API');
                }

                const data = await response.json();
                setRouteAlerts(data.alertas || []);
            } catch (error) {
                console.error('Error analizando ruta:', error);
                setRouteAlerts([]);
            } finally {
                setAlertsLoading(false);
            }
        };

        analyzeRoute();
    }, [routePolyline]);

    const speedSegments = useMemo(() => {
        if (!routePoints || routePoints.length < 2) return [];
        return routePoints.slice(1).map((point, index) => {
            const prev = routePoints[index];
            return {
                positions: [[prev.lat, prev.lng], [point.lat, point.lng]],
                speed: point.speed || 0,
                style: getSpeedSegmentStyle(point.speed || 0)
            };
        });
    }, [routePoints]);

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer
                center={[4.6097, -74.0817]}
                zoom={12}
                className="map-view-container"
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                {/* Base Map Layer */}
                <TileLayer
                    key={activeBasemap}
                    attribution={currentBasemap.attribution}
                    url={currentBasemap.url}
                    maxZoom={19}
                />

                {/* Satellite Labels Overlay */}
                {activeBasemap === 'arcgis_satellite' && (
                    <TileLayer
                        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                        pane="markerPane" // Ensure labels are on top of images
                        zIndex={10}
                    />
                )}

                {/* Active Overlays (ANSV / INVIAS) using EsriLayer bridge or Heatmap */}
                {activeOverlays.map(id => {
                    const overlay = OVERLAYS[id];
                    if (!overlay) return null;

                    if (overlay.type === 'heatmap') {
                        return (
                            <HeatmapLayer
                                key={id}
                                url={overlay.url}
                                attribution={overlay.attribution}
                            />
                        );
                    }
                    return (
                        <EsriLayer
                            key={id}
                            type={overlay.type}
                            url={overlay.url}
                            attribution={overlay.attribution}
                            opacity={0.8}
                        />
                    );
                })}

                {/* Speeding Heatmap Layer - Shows excess speed violations */}
                <SpeedingHeatmapLayer fleet={fleet} speedLimit={50} />

                {/* Route segments color by speed for selected vehicle */}
                {speedSegments.map((segment, index) => (
                    <Polyline
                        key={`speed-seg-${index}`}
                        positions={segment.positions}
                        pathOptions={segment.style}
                    />
                ))}

                {fleet.map(vehicle => (
                    <Marker
                        key={vehicle.id}
                        position={vehicle.location}
                        icon={getVehicleIcon(vehicle.status)}
                    >
                        <Popup>
                            <div style={{ color: '#000' }}>
                                <strong>{vehicle.name}</strong><br />
                                Conductor: {vehicle.driver}<br />
                                Velocidad: {vehicle.speed} km/h<br />
                                Placa: {vehicle.plate}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {routePolyline && routePolyline.length > 1 && (
                    <Polyline positions={routePolyline} pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.9, dashArray: '8,4' }} />
                )}

                {SAFETY_FACILITIES.map(station => (
                    <Marker key={station.id} position={station.location} icon={getSafetyIcon(station.type)}>
                        <Popup>
                            <div style={{ minWidth: '150px' }}>
                                <strong>{station.name}</strong><br />
                                Tipo: {station.type === 'police' ? 'Policía' : station.type === 'fire' ? 'Bomberos' : station.type === 'health' ? 'Cruz Roja' : 'Entidad de Socorro'}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Route Risk Alerts */}
                {routeAlerts.map((alert, index) => (
                    <Marker
                        key={`alert-${index}`}
                        position={[alert.coords[0], alert.coords[1]]}
                        icon={L.divIcon({
                            html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#dc2626;color:#fff;border:3px solid rgba(255,255,255,0.9);font-size:16px;font-weight:bold;">⚠️</div>`,
                            className: 'route-alert-icon',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        })}
                    >
                        <Popup>
                            <div style={{ minWidth: '200px', color: '#000' }}>
                                <strong style={{ color: '#dc2626' }}>🚨 ALERTA DE RUTA</strong><br />
                                <strong>Evento:</strong> {alert.evento}<br />
                                <strong>Detalle:</strong> {alert.detalle}<br />
                                <strong>Distancia a la vía:</strong> {alert.distancia_via} metros<br />
                                <small style={{ color: '#666' }}>Detectado por análisis espacial PESV</small>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {selectedVehicle && (
                    <ChangeView center={selectedVehicle.location} zoom={15} />
                )}
            </MapContainer>

            <BasemapSwitcher
                activeBasemap={activeBasemap}
                onSwitch={setActiveBasemap}
                activeOverlays={activeOverlays}
                onToggleOverlay={toggleOverlay}
                routeAlerts={routeAlerts}
                alertsLoading={alertsLoading}
                tipoVehiculo={tipoVehiculo}
                setTipoVehiculo={setTipoVehiculo}
                pesoToneladas={pesoToneladas}
                setPesoToneladas={setPesoToneladas}
                normativeAnalysis={normativeAnalysis}
                setNormativeAnalysis={setNormativeAnalysis}
                normativeLoading={normativeLoading}
                setNormativeLoading={setNormativeLoading}
                routePolyline={routePolyline}
            />
        </div>
    );
}

export default MapView;
