import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as Esri from 'esri-leaflet';
import 'leaflet.heat';

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
    invias_postes: {
        id: 'invias_postes',
        name: 'Postes Kilométricos (INVIAS)',
        url: 'https://hermes.invias.gov.co/arcgis/rest/services/Mapa_Carreteras/Mapa_de_Carreteras/MapServer/0',
        attribution: '&copy; INVIAS Colombia',
        type: 'feature',
        icon: '📍'
    }
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
                <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
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

function ChangeView({ center, zoom }) {
    const map = useMap();
    if (center) map.setView(center, zoom);
    return null;
}

// Basemap Switcher Component
const BasemapSwitcher = ({ activeBasemap, onSwitch, activeOverlays, onToggleOverlay }) => {
    const [isOpen, setIsOpen] = useState(false);

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

                    <div style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.55rem',
                        color: 'rgba(255,255,255,0.3)',
                        textAlign: 'center'
                    }}>
                        Datos: ANSV, INVIAS, ArcGIS
                    </div>
                </div>
            )}
        </div>
    );
};

const MapView = ({ fleet, selectedVehicle, routePolyline }) => {
    const [activeBasemap, setActiveBasemap] = useState('carto_dark');
    const [activeOverlays, setActiveOverlays] = useState([]);
    const currentBasemap = BASEMAPS[activeBasemap];

    const toggleOverlay = (id) => {
        setActiveOverlays(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

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

                {selectedVehicle && (
                    <ChangeView center={selectedVehicle.location} zoom={15} />
                )}
            </MapContainer>

            <BasemapSwitcher
                activeBasemap={activeBasemap}
                onSwitch={setActiveBasemap}
                activeOverlays={activeOverlays}
                onToggleOverlay={toggleOverlay}
            />
        </div>
    );
}

export default MapView;
