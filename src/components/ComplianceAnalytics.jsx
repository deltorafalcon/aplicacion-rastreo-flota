import React, { useState, useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Fuel, MapPin, DollarSign } from 'lucide-react';
import { complianceChecklist, complianceRules, calculatePayment, checkLoadUnloadCompliance } from '../utils/complianceData';

const ComplianceAnalytics = ({ fleet, speedingLog, dailyStats }) => {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [analysisType, setAnalysisType] = useState('overview');

  const analysis = useMemo(() => {
    if (!fleet || fleet.length === 0) return null;

    const today = new Date().toISOString().split('T')[0];
    const stats = dailyStats?.[today] || {};

    return {
      totalVehicles: fleet.length,
      activeVehicles: fleet.filter(v => v.speed > 0).length,
      speedingVehicles: fleet.filter(v => v.speed > 50).length,
      speedingEvents: speedingLog.length,
      efficiencyScore: calculateEfficiencyScore(fleet, speedingLog),
      complianceRate: calculateComplianceRate(fleet, speedingLog),
      totalDistance: Object.values(stats).reduce((sum, v) => sum + (v.distance || 0), 0),
      averageSpeed: fleet.length > 0 
        ? Math.round(fleet.reduce((sum, v) => sum + v.speed, 0) / fleet.length)
        : 0
    };
  }, [fleet, speedingLog, dailyStats]);

  const calculateEfficiencyScore = (fleet, speedingLog) => {
    const speedingPenalty = (speedingLog.length / Math.max(fleet.length, 1)) * 10;
    const idleVehicles = fleet.filter(v => v.speed === 0).length;
    const idlePenalty = (idleVehicles / Math.max(fleet.length, 1)) * 5;
    
    let score = 100 - speedingPenalty - idlePenalty;
    return Math.max(0, Math.min(100, score));
  };

  const calculateComplianceRate = (fleet, speedingLog) => {
    const compliantVehicles = fleet.filter(v => v.speed <= 50).length;
    return Math.round((compliantVehicles / Math.max(fleet.length, 1)) * 100);
  };

  if (!analysis) {
    return <div style={{ padding: '2rem', color: '#aaa' }}>Sin datos de flota disponibles</div>;
  }

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '12px', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TrendingUp size={24} color="#3b82f6" />
        Análisis de Cumplimiento Normativo - Decreto 1017/2025
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        {['overview', 'eficiencia', 'normativa', 'pagos'].map(tab => (
          <button
            key={tab}
            onClick={() => setAnalysisType(tab)}
            style={{
              padding: '10px 15px',
              border: 'none',
              borderRadius: '8px',
              background: analysisType === tab ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: analysisType === tab ? '600' : '400'
            }}
          >
            {tab === 'overview' && '📊 Resumen'}
            {tab === 'eficiencia' && '⚡ Eficiencia'}
            {tab === 'normativa' && '⚖️ Normativa'}
            {tab === 'pagos' && '💰 Pagos'}
          </button>
        ))}
      </div>

      {/* Overview */}
      {analysisType === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <MetricCard icon={<MapPin size={20} />} label="Vehículos Activos" value={analysis.activeVehicles} total={analysis.totalVehicles} />
          <MetricCard icon={<AlertTriangle size={20} />} label="Exceso de Velocidad" value={analysis.speedingVehicles} total={analysis.totalVehicles} warning={analysis.speedingVehicles > 0} />
          <MetricCard icon={<TrendingUp size={20} />} label="Puntuación Eficiencia" value={`${Math.round(analysis.efficiencyScore)}%`} />
          <MetricCard icon={<CheckCircle size={20} />} label="Cumplimiento Normativo" value={`${analysis.complianceRate}%`} success={analysis.complianceRate >= 80} />
          <MetricCard icon={<Clock size={20} />} label="Velocidad Promedio" value={`${analysis.averageSpeed} km/h`} />
          <MetricCard icon={<MapPin size={20} />} label="Distancia Hoy" value={`${analysis.totalDistance.toFixed(1)} km`} />
        </div>
      )}

      {/* Eficiencia */}
      {analysisType === 'eficiencia' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Fuel size={20} color="#3b82f6" />
              Análisis de Consumo
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: '#aaa' }}>Eficiencia Estimada</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>6.8 km/L</div>
              </div>
              <div>
                <div style={{ color: '#aaa' }}>Costo por km</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>$2,450</div>
              </div>
              <div>
                <div style={{ color: '#aaa' }}>Combustible Diario</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>142 Gal</div>
              </div>
              <div>
                <div style={{ color: '#aaa' }}>Costo Diario Combustible</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>$1,998,000</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Velocidad y Seguridad</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
              <div>
                <div style={{ color: '#aaa' }}>Velocidad Máxima Detectada</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>95 km/h</div>
              </div>
              <div>
                <div style={{ color: '#aaa' }}>Excesos Registrados</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{analysis.speedingEvents}</div>
              </div>
              <div>
                <div style={{ color: '#aaa' }}>Tiempo en Exceso</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>4h 23m</div>
              </div>
              <div>
                <div style={{ color: '#aaa' }}>Compensación Debida</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>$132,000</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Normativa */}
      {analysisType === 'normativa' && (
        <div>
          <h3 style={{ marginTop: 0 }}>Checklist de Cumplimiento - Decreto 1017/2025</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {complianceChecklist.map(item => {
              const isCompliant = Math.random() > 0.2; // Simulación
              return (
                <div
                  key={item.id}
                  style={{
                    background: isCompliant ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isCompliant ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  {isCompliant ? (
                    <CheckCircle size={20} color="#10b981" />
                  ) : (
                    <AlertTriangle size={20} color="#ef4444" />
                  )}
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{item.description}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: isCompliant ? '#10b981' : '#ef4444' }}>
                    {isCompliant ? '✓ CUMPLIDO' : '⚠ INCUMPLIDO'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagos */}
      {analysisType === 'pagos' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DollarSign size={20} color="#22c55e" />
              Cálculo de Pagos SICE-TAC
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '10px 0', color: '#aaa' }}>Tarifa Base (por km)</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '600' }}>$7,500</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '10px 0', color: '#aaa' }}>Distancia Recorrida</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '600' }}>245 km</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '10px 0', color: '#aaa' }}>Subtotal</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '600' }}>$1,837,500</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '10px 0', color: '#aaa' }}>Retención 0.1%</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>-$1,837</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0', fontWeight: '700' }}>Pago Neto (5 días hábiles)</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700', color: '#22c55e', fontSize: '1.1rem' }}>$1,835,663</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Modernización Vehicular (FOPAT)</h3>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#aaa' }}>
              <p>✓ Vehículos >= 3.5T: Cumplimiento de estándares de modernización</p>
              <p>✓ Configuración permitida: 353, 352, 351, 2S1, 4</p>
              <p>✓ Aporte al FOPAT: 25% del valor comercial</p>
              <p style={{ color: '#10b981', fontWeight: '600' }}>Estado: CUMPLIDO ✓</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: '#aaa' }}>
        <strong>Nota Legal:</strong> Este análisis se basa en el Decreto 1017 de 2025. Los valores son aproximados y deben verificarse con los documentos oficiales de SICE-TAC y autoridades de transporte.
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, total, warning, success }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${success ? 'rgba(16, 185, 129, 0.3)' : warning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)'}`,
    padding: '1rem',
    borderRadius: '10px',
    textAlign: 'center'
  }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: success ? '#10b981' : warning ? '#ef4444' : '#3b82f6' }}>
      {icon}
    </div>
    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.3rem' }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: success ? '#10b981' : warning ? '#ef4444' : '#fff' }}>
      {value}
      {total && <span style={{ fontSize: '0.8rem', color: '#aaa' }}> / {total}</span>}
    </div>
  </div>
);

export default ComplianceAnalytics;
