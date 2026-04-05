import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { X, MapPin, Calendar, Clock, Gauge } from 'lucide-react';

L.Marker.prototype.options.icon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

/**
 * Gets all stored route points for a given vehicleId and date string (YYYY-MM-DD)
 */
export const getStoredRoute = (vehicleId, dateStr) => {
    try {
        const raw = localStorage.getItem(`route_${vehicleId}_${dateStr}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

/**
 * Saves a new position point for a vehicle in localStorage
 */
export const saveRoutePoint = (vehicleId, point) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const key = `route_${vehicleId}_${dateStr}`;
    try {
        const existing = getStoredRoute(vehicleId, dateStr);
        // Avoid duplicates: only add if position changed or 10s passed
        const last = existing[existing.length - 1];
        if (last && last.lat === point.lat && last.lng === point.lng) return;
        existing.push(point);
        // Keep max 2000 points per day per vehicle
        if (existing.length > 2000) existing.shift();
        localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
        console.warn('Route storage full:', e);
    }
};

/**
 * Returns all vehicle IDs that have stored routes
 */
const getStoredVehicleIds = () => {
    const ids = new Set();
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('route_')) {
            const parts = key.split('_');
            // key = route_{id}_{date}, date is last 10 chars
            if (parts.length >= 3) ids.add(parts.slice(1, -1).join('_'));
        }
    }
    return [...ids];
};

const RouteHistory = ({ onClose, fleet }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedId, setSelectedId] = useState('');
    const [selectedDate, setSelectedDate] = useState(today);
    const [routePoints, setRoutePoints] = useState([]);

    const storedIds = getStoredVehicleIds();
    // Merge active fleet + stored historical vehicles
    const allVehicles = [...new Set([...fleet.map(v => v.id), ...storedIds])];

    useEffect(() => {
        if (selectedId && selectedDate) {
            const pts = getStoredRoute(selectedId, selectedDate);
            setRoutePoints(pts);
        }
    }, [selectedId, selectedDate]);

    const positions = routePoints.map(p => [p.lat, p.lng]);
    const startPoint = positions[0];
    const endPoint = positions[positions.length - 1];

    const totalDistance = routePoints.reduce((acc, pt, i) => {
        if (i === 0) return 0;
        const prev = routePoints[i - 1];
        const R = 6371;
        const dLat = (pt.lat - prev.lat) * Math.PI / 180;
        const dLon = (pt.lng - prev.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(pt.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }, 0);

    const maxSpeed = routePoints.length ? Math.max(...routePoints.map(p => p.speed || 0)) : 0;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px', width: '100%', maxWidth: '900px',
                maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MapPin size={20} color="#3b82f6" />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Historial de Recorrido</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Controls */}
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Vehículo (Placa)</label>
                        <select
                            value={selectedId}
                            onChange={e => setSelectedId(e.target.value)}
                            style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem', color: 'white', fontFamily: 'inherit' }}
                        >
                            <option value="">-- Seleccionar --</option>
                            {allVehicles.map(id => <option key={id} value={id}>{id}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Fecha</label>
                        <input
                            type="date"
                            value={selectedDate}
                            max={today}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem', color: 'white', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>

                {/* Stats */}
                {routePoints.length > 0 && (
                    <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1.5rem', background: 'rgba(59,130,246,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                        {[
                            { icon: <MapPin size={14} />, label: 'Puntos registrados', value: routePoints.length },
                            { icon: <Clock size={14} />, label: 'Inicio', value: new Date(routePoints[0].time).toLocaleTimeString() },
                            { icon: <Clock size={14} />, label: 'Último registro', value: new Date(routePoints[routePoints.length - 1].time).toLocaleTimeString() },
                            { icon: <Gauge size={14} />, label: 'Vel. máxima', value: `${maxSpeed} km/h` },
                            { icon: <MapPin size={14} />, label: 'Distancia aprox.', value: `${totalDistance.toFixed(2)} km` },
                        ].map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                <span style={{ color: '#3b82f6' }}>{s.icon}</span>
                                <span>{s.label}: <strong style={{ color: 'white' }}>{s.value}</strong></span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Map */}
                <div style={{ flex: 1, minHeight: '350px', position: 'relative' }}>
                    {!selectedId ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '0.5rem' }}>
                            <MapPin size={32} />
                            <p>Selecciona un vehículo y una fecha para ver el recorrido</p>
                        </div>
                    ) : routePoints.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '0.5rem' }}>
                            <Calendar size={32} />
                            <p>Sin datos para <strong style={{ color: 'white' }}>{selectedId}</strong> el <strong style={{ color: 'white' }}>{selectedDate}</strong></p>
                            <p style={{ fontSize: '0.8rem' }}>El vehículo debe estar activo con el admin abierto para guardar el recorrido.</p>
                        </div>
                    ) : (
                        <MapContainer
                            center={startPoint || [4.6097, -74.0817]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                            />
                            <Polyline positions={positions} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85 }} />
                            {startPoint && (
                                <Marker position={startPoint}>
                                    <Popup><div style={{ color: '#000' }}>🟢 Inicio de recorrido<br />{new Date(routePoints[0].time).toLocaleTimeString()}</div></Popup>
                                </Marker>
                            )}
                            {endPoint && positions.length > 1 && (
                                <Marker position={endPoint}>
                                    <Popup><div style={{ color: '#000' }}>🔴 Último registro<br />{new Date(routePoints[routePoints.length - 1].time).toLocaleTimeString()}</div></Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RouteHistory;
