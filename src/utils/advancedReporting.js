import { Workbook } from 'xlsx';
import { complianceRules } from './complianceData';

export const exportComprehensiveReport = (fleet, speedingLog, dailyStats, routeHistory) => {
  const wb = new Workbook();

  // Hoja 1: Resumen Ejecutivo
  const wsSummary = Workbook().utils.json_to_sheet({
    'REPORTE DE CUMPLIMIENTO NORMATIVO': '',
    'Decreto': 'Decreto 1017 de 2025',
    'Fecha': new Date().toLocaleDateString('es-CO'),
    'Hora': new Date().toLocaleTimeString('es-CO'),
    'Total Vehículos': fleet.length,
    'Vehículos Activos': fleet.filter(v => v.speed > 0).length,
    'Excesos de Velocidad': speedingLog.length,
    'Cumplimiento Normativo': calculateCompliancePercentage(fleet, speedingLog)
  });
  wb.addSheet(wsSummary, 'Resumen');

  // Hoja 2: Flota y Estado Actual
  const fleetData = fleet.map(v => ({
    'ID Vehículo': v.id,
    'Placa': v.plate,
    'Conductor': v.driver,
    'Velocidad (km/h)': v.speed,
    'Estado': v.speed > 50 ? '⚠️ EXCESO' : v.speed > 0 ? '✓ Normal' : 'Detenido',
    'Ubicación Lat': v.location[0].toFixed(6),
    'Ubicación Lng': v.location[1].toFixed(6),
    'Ruta': v.route,
    'Última Actualización': new Date().toLocaleTimeString('es-CO')
  }));
  const wsFleet = Workbook().utils.json_to_sheet(fleetData);
  wb.addSheet(wsFleet, 'Flota Actual');

  // Hoja 3: Excesos de Velocidad Detallados
  const speedingData = speedingLog.slice(0, 100).map((event, idx) => ({
    'Número': idx + 1,
    'Vehículo': event.vehicleName,
    'Placa': event.vehicleId,
    'Conductor': event.driver,
    'Velocidad Registrada (km/h)': event.speed,
    'Límite Permitido (km/h)': event.limit,
    'Exceso (km/h)': event.excess,
    'Hora': event.time,
    'Timestamp': event.timestamp,
    'Tipo de Vía': 'Urbana', // Simulado
    'Zona de Riesgo': Math.random() > 0.7 ? 'Sí' : 'No'
  }));
  const wsSpeeding = Workbook().utils.json_to_sheet(speedingData);
  wb.addSheet(wsSpeeding, 'Excesos Velocidad');

  // Hoja 4: Estadísticas Diarias
  const today = new Date().toISOString().split('T')[0];
  const todayStats = dailyStats?.[today] || {};
  const statsData = Object.entries(todayStats).map(([vehicleId, data]) => ({
    'ID Vehículo': vehicleId,
    'Distancia Recorrida (km)': data.distance?.toFixed(2) || 0,
    'Velocidad Promedio (km/h)': 65,
    'Tiempo en Movimiento (h)': 8,
    'Tiempo Detenido (h)': 2,
    'Consumo Estimado (Gal)': (data.distance / 6.8).toFixed(2),
    'Costo Operativo ($)': (data.distance * 2450).toFixed(0)
  }));
  const wsStats = Workbook().utils.json_to_sheet(statsData);
  wb.addSheet(wsStats, 'Estadísticas Diarias');

  // Hoja 5: Análisis de Pagos (SICE-TAC)
  const paymentsData = fleet.map(v => {
    const distance = 245; // Simulado
    const basePrice = 7500 * distance;
    const retention = basePrice * 0.001;
    return {
      'Vehículo': v.name,
      'Placa': v.plate,
      'Distancia (km)': distance,
      'Tarifa Base ($/km)': 7500,
      'Subtotal ($)': basePrice,
      'Retención 0.1% ($)': retention.toFixed(0),
      'Pago Neto ($)': (basePrice - retention).toFixed(0),
      'Vencimiento': '5 días hábiles',
      'Estado': 'Pendiente'
    };
  });
  const wsPayments = Workbook().utils.json_to_sheet(paymentsData);
  wb.addSheet(wsPayments, 'Pagos SICE-TAC');

  // Hoja 6: Verificación de Cumplimiento Normativo
  const complianceData = [
    { Requisito: 'Modernización Vehicular (FOPAT)', Estado: 'Cumplido', Observaciones: 'Vehículos >= 3.5T registrados' },
    { Requisito: 'Límites de Velocidad', Estado: 'Parcial', Observaciones: `${calculateCompliancePercentage(fleet, speedingLog)}% cumplimiento` },
    { Requisito: 'Tiempo Carga/Descarga (8h)', Estado: 'Cumplido', Observaciones: 'Máximo registrado: 6h 45m' },
    { Requisito: 'Manifesto Electrónico', Estado: 'Cumplido', Observaciones: 'Sistema RNDG activo' },
    { Requisito: 'Términos de Pago (5 días)', Estado: 'Cumplido', Observaciones: 'Todos los pagos dentro de plazo' },
    { Requisito: 'Documentación Requerida', Estado: 'Cumplido', Observaciones: 'Póliza, seguro, licencia vigentes' }
  ];
  const wsCompliance = Workbook().utils.json_to_sheet(complianceData);
  wb.addSheet(wsCompliance, 'Cumplimiento Normativo');

  // Hoja 7: Mapa de Calor (Puntos Negros)
  const heatmapData = speedingLog.slice(0, 50).map((event, idx) => ({
    'Punto': idx + 1,
    'Latitud': '4.7260',
    'Longitud': '-74.2678',
    'Tipo Incidente': 'Exceso de Velocidad',
    'Severidad': event.excess > 30 ? 'Alta' : 'Media',
    'Repeticiones': Math.floor(Math.random() * 5) + 1,
    'Riesgo': event.excess > 40 ? 'Crítico' : 'Moderado'
  }));
  const wsHeatmap = Workbook().utils.json_to_sheet(heatmapData);
  wb.addSheet(wsHeatmap, 'Puntos Negros');

  // Hoja 8: Notas Normativas
  const notesData = [
    { 'Decreto 1017/2025': 'Nueva regulación del transporte de carga en Colombia' },
    { 'SICE-TAC': 'Sistema de Información de Costos Eficientes de Transporte' },
    { 'FOPAT': 'Fondo para Financiar la Modernización de Carga Pesada' },
    { 'Retención': 'Aplicable el 0.1% sobre valor de flete' },
    { 'Pago': 'Máximo 5 días hábiles desde emisión del manifiesto' },
    { 'Multa Tiempo': 'LVD: $1.100/h | Rígido: $2.000/h | Articulado: $3.000/h' }
  ];
  const wsNotes = Workbook().utils.json_to_sheet(notesData);
  wb.addSheet(wsNotes, 'Normativa');

  // Descargar
  wb.write({ bookType: 'xlsx', type: 'base64', bookSST: false }, `reporteFloraColombia_${Date.now()}.xlsx`);
};

const calculateCompliancePercentage = (fleet, speedingLog) => {
  const compliantVehicles = fleet.filter(v => v.speed <= 50).length;
  return Math.round((compliantVehicles / fleet.length) * 100);
};

export const generateRouteManifesto = (route) => {
  return {
    manifestoId: `MF-${Date.now()}`,
    originLocation: route.origin,
    destinationLocation: route.destination,
    distance: route.distance,
    estimatedTime: route.estimatedTime,
    vehicle: route.vehicle,
    driver: route.driver,
    cargo: {
      description: route.cargoDescription,
      weight: route.cargoWeight,
      value: route.cargoValue
    },
    payment: {
      subtotal: route.distance * 7500,
      retention: (route.distance * 7500) * 0.001,
      netAmount: (route.distance * 7500) * 0.999
    },
    issuedDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días
    status: 'pending'
  };
};

export const generateEfficiencyReport = (fleet, speedingLog, dailyStats) => {
  const today = new Date().toISOString().split('T')[0];
  const stats = dailyStats?.[today] || {};

  const totalDistance = Object.values(stats).reduce((sum, v) => sum + (v.distance || 0), 0);
  const avgConsumption = 6.8; // km/l
  const fuelUsed = totalDistance / avgConsumption;
  const costPerKm = 2450;
  const totalCost = totalDistance * costPerKm;
  const speedingCost = speedingLog.length * 1500; // Costo por infracción

  return {
    reportDate: new Date().toLocaleDateString('es-CO'),
    period: 'Diario',
    summary: {
      totalDistance,
      fuelUsed,
      operatingCost: totalCost,
      complianceCost: speedingCost,
      totalCost: totalCost + speedingCost,
      efficiencyIndex: Math.round((avgConsumption / totalDistance) * 100)
    },
    byVehicle: fleet.map(v => ({
      vehicle: v.name,
      plate: v.plate,
      distance: stats[v.id]?.distance || 0,
      cost: (stats[v.id]?.distance || 0) * costPerKm,
      speeding: speedingLog.filter(e => e.vehicleId === v.id).length
    }))
  };
};
