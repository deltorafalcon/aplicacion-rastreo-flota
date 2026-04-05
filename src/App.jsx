import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import MapView from './components/MapView';
import FleetDashboard from './components/FleetDashboard';
import SpeedDashboard from './components/SpeedDashboard';
import Login from './components/Login';
import RouteHistory, { saveRoutePoint } from './components/RouteHistory';
import { generateMockFleet } from './utils/vehicleMock';
import { gpsService } from './utils/gpsService';
import { apiService } from './utils/api';

function App() {
  const [auth, setAuth] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [adminView, setAdminView] = useState('map');
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [speedingLog, setSpeedingLog] = useState(() => {
    const saved = localStorage.getItem('fleet_speeding_log');
    return saved ? JSON.parse(saved) : [];
  });
  const [speedLimit, setSpeedLimit] = useState(60); // Default city limit
  const [dailyStats, setDailyStats] = useState(() => {
    const saved = localStorage.getItem('fleet_daily_stats');
    const today = new Date().toISOString().split('T')[0];
    const data = saved ? JSON.parse(saved) : {};
    return data[today] ? data : { [today]: {} };
  });
  const [watchId, setWatchId] = useState(null);
  const lastPosRef = useRef(null);

  // role-based side effects
  useEffect(() => {
    if (!auth) return;

    if (auth.role === 'driver') {
      let intervalId = null;

      const startDriverTracking = async () => {
        // Default position (Bogotá center) to use when GPS isn't available
        const defaultPos = { lat: 4.6097, lng: -74.0817, speed: 0, timestamp: Date.now() };

        const buildDriverData = (pos) => ({
          id: auth.username,
          name: auth.driverName,
          driver: auth.driverName,
          plate: auth.username,
          location: [pos.lat, pos.lng],
          speed: pos.speed,
          status: pos.speed > 60 ? 'speeding' : 'active',
          lastUpdate: pos.timestamp
        });

        // 1. Send an IMMEDIATE heartbeat so the driver appears instantly in admin
        lastPosRef.current = defaultPos;
        const initialData = buildDriverData(defaultPos);
        setFleet([initialData]);
        apiService.updateVehicle(initialData);

        // 2. Start GPS in the background to get real coordinates
        gpsService.requestPermissions().then(() => {
          gpsService.startBackgroundTracking((pos) => {
            lastPosRef.current = pos;
            setFleet([buildDriverData(pos)]);
          }).then(id => setWatchId(id))
            .catch(err => console.warn('GPS unavailable, using default location:', err));
        });

        // 3. Sync interval — always fires, uses GPS pos if available, otherwise default
        intervalId = setInterval(() => {
          const pos = lastPosRef.current || defaultPos;
          pos.timestamp = Date.now(); // keep timestamp fresh
          const driverData = buildDriverData(pos);
          setFleet([driverData]);
          apiService.updateVehicle(driverData);
        }, 5000);
      };

      startDriverTracking();

      return () => {
        if (intervalId) clearInterval(intervalId);
        if (watchId) {
          gpsService.stopBackgroundTracking(watchId);
        }
      };
    } else {
      // ADMIN LOGIC: Subscribe to all cloud updates
      const unsubscribe = apiService.subscribeToFleet((allVehicles) => {
        setFleet(allVehicles);
        // Save each vehicle's position for route history
        allVehicles.forEach(v => {
          if (v.location && Array.isArray(v.location)) {
            saveRoutePoint(v.id, {
              lat: v.location[0], lng: v.location[1],
              speed: v.speed || 0, time: v.lastUpdate || Date.now()
            });
          }
        });
      });
      return () => unsubscribe();
    }

    return () => {
      if (watchId) {
        if (auth.role === 'driver') gpsService.stopBackgroundTracking(watchId);
        else gpsService.stopTracking(watchId);
      }
    };
  }, [auth]);

  // Distance calculation (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Persist speeding log and daily stats
  useEffect(() => {
    localStorage.setItem('fleet_speeding_log', JSON.stringify(speedingLog));
  }, [speedingLog]);

  useEffect(() => {
    localStorage.setItem('fleet_daily_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  // Monitor for distance and speeding
  useEffect(() => {
    if (auth?.role !== 'admin' || fleet.length === 0) return;

    const today = new Date().toISOString().split('T')[0];

    setDailyStats(prev => {
      const dayData = prev[today] || {};
      let changed = false;
      const newDayData = { ...dayData };

      fleet.forEach(vehicle => {
        const vId = vehicle.id;
        const currentPos = vehicle.location; // [lat, lng]

        if (!currentPos || !Array.isArray(currentPos)) return;

        const vStats = newDayData[vId] || { distance: 0, lastPos: null };

        if (vStats.lastPos) {
          const dist = calculateDistance(
            vStats.lastPos[0], vStats.lastPos[1],
            currentPos[0], currentPos[1]
          );

          // Only add if movement is significant (> 10 meters) to avoid GPS jitter
          if (dist > 0.01) {
            newDayData[vId] = {
              distance: vStats.distance + dist,
              lastPos: currentPos
            };
            changed = true;
          }
        } else {
          newDayData[vId] = {
            ...vStats,
            lastPos: currentPos
          };
          changed = true;
        }
      });

      return changed ? { ...prev, [today]: newDayData } : prev;
    });

    // Speeding Logic
    fleet.forEach(vehicle => {
      if (vehicle.speed > speedLimit) {
        setSpeedingLog(prev => {
          // Avoid duplicate alerts within 30 seconds for same vehicle
          const recentAlert = prev.find(a =>
            a.vehicleId === vehicle.id && (Date.now() - a.timestamp) < 30000
          );
          if (recentAlert) return prev;

          const newAlert = {
            id: `${vehicle.id}-${Date.now()}`,
            vehicleId: vehicle.id,
            vehicleName: vehicle.name || vehicle.id,
            driver: vehicle.driver || 'Desconocido',
            speed: vehicle.speed,
            limit: speedLimit,
            excess: vehicle.speed - speedLimit,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now()
          };
          return [newAlert, ...prev].slice(0, 1000); // Keep up to 1000 records
        });
      }
    });
  }, [fleet, speedLimit, auth]);

  const handleClearLog = () => {
    if (window.confirm('¿Está seguro de que desea borrar todos los registros de excesos de velocidad?')) {
      setSpeedingLog([]);
    }
  };

  const handleLogin = (userData) => {
    setAuth(userData);
  };

  const handleLogout = () => {
    setAuth(null);
    setFleet([]);
    setSelectedVehicle(null);
  };

  if (!auth) {
    return <Login onLogin={handleLogin} />;
  }

  // --- Driver View Rendering ---
  if (auth.role === 'driver') {
    return (
      <div className="driver-view app-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div className="status-dot pulsing" style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 10px var(--success)'
            }}></div>
            <h2 style={{ color: 'var(--accent-color)', margin: 0 }}>Tracking Activo</h2>
          </div>
          <div style={{ margin: '1.5rem 0', textAlign: 'left' }}>
            <p style={{ margin: '0.5rem 0' }}>Conductor: <strong>{auth.driverName}</strong></p>
            <p style={{ margin: '0.5rem 0' }}>Vehículo (Placa): <strong>{auth.username}</strong></p>
          </div>

          <div className="stats-grid" style={{ marginTop: '2rem' }}>
            <div className="stat-card">
              <span className="label">Velocidad Actual</span>
              <span className="value" style={{ fontSize: '3rem' }}>
                {fleet[0]?.speed || 0}
                <span style={{ fontSize: '1rem', marginLeft: '0.5rem' }}>km/h</span>
              </span>
            </div>
          </div>

          <div style={{ marginTop: '2rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            <p>Tu ubicación y velocidad están siendo monitoreadas.</p>
          </div>

          <button
            onClick={handleLogout}
            className="logout-button"
            style={{ marginTop: '2rem', width: '100%' }}
          >Detener y Salir</button>
        </div>
      </div>
    );
  }

  // --- Admin Dashboard Rendering ---
  return (
    <div className="app-container">
      {showRouteHistory && (
        <RouteHistory fleet={fleet} onClose={() => setShowRouteHistory(false)} />
      )}
      <FleetDashboard
        fleet={fleet}
        onSelect={setSelectedVehicle}
        selectedId={selectedVehicle?.id}
        onLogout={handleLogout}
        speedingLogCount={speedingLog.length}
        dailyStats={dailyStats[new Date().toISOString().split('T')[0]] || {}}
        onShowRouteHistory={() => setShowRouteHistory(true)}
      />
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            const mockVehicle = {
              id: 'MOCK-999',
              name: 'Vehículo de Prueba',
              driver: 'Simulador',
              plate: 'MOCK-999',
              location: [4.6097, -74.0817],
              speed: 95,
              status: 'speeding',
              route: 'Prueba de Alerta',
              lastUpdate: Date.now()
            };
            setFleet(prev => {
              const exists = prev.find(v => v.id === mockVehicle.id);
              if (exists) return prev.map(v => v.id === mockVehicle.id ? mockVehicle : v);
              return [...prev, mockVehicle];
            });
          }}
          className="glass-card"
          style={{
            padding: '8px 12px',
            fontSize: '0.7rem',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid var(--danger)',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '8px'
          }}
        >
          🚨 Simular Exceso
        </button>
      </div>
      <div className="map-container">
        <MapView
          fleet={fleet}
          selectedVehicle={selectedVehicle}
        />
      </div>
      <SpeedDashboard
        fleet={fleet}
        speedingLog={speedingLog}
        speedLimit={speedLimit}
        onSetLimit={(l) => setSpeedLimit(l)}
        onClearLog={handleClearLog}
      />
    </div>
  );
}

export default App;
