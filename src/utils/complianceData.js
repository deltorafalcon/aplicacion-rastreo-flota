/**
 * Colombia Transport Compliance Data - Decreto 1017 de 2025
 * Nueva regulación del transporte de carga en Colombia
 */

export const complianceRules = {
  decree: 'Decreto 1017 de 2025',
  maxLoadUnloadHours: 8, // Límite de 8 horas para carga/descarga
  paymentDays: 5, // Días hábiles para pago
  retentionRate: 0.001, // Retención del 0.1% sobre flete
  minSpeedLimit: 50, // km/h
  maxSpeedLimit: 120, // km/h
  
  // SICE-TAC: Sistema de Información de Costos Eficientes de Transporte
  siceTac: {
    name: 'SICE-TAC',
    description: 'Sistema de Información de Costos Eficientes de Transporte - Pagos Justos Basados en el Sistema',
    baseCosts: {
      diesel: 14000, // Costo base por galón
      maintenance: 0.08, // Por km
      insurance: 450000, // Mensual
      driver: 2500000, // Salario mensual
      depreciation: 0.15 // Depreciación anual
    }
  },

  // Vehículos sujetos a modernización
  vehicleModernization: {
    pbvThreshold: 3.5, // Toneladas - Vehículos >= 3.5T deben modernizarse
    fopat: {
      name: 'Fondo FOPAT',
      description: 'Fondo para Financiar la Modernización de Carga Pesada',
      contribution: 0.25, // 25% del valor comercial
      reposition: ['353', '352', '351', '2S1', '4'], // Configuraciones permitidas
      deintegration: 'En caso de desintegración de vehículo viejo'
    }
  },

  // Compensación por incumplimiento
  timeExcessCompensation: {
    lvd: 1100, // Vehículos LVD por hora adicional
    rigid: 2000, // Vehículos rígidos por hora adicional
    articulated: 3000 // Vehículos articulados por hora adicional
  },

  // Manifesto electrónico
  eTManifesto: {
    name: 'Manifiesto Electrónico',
    description: 'Título ejecutivo, Expedido gratuitamente vía RNDG/presa',
    isExecutiveTitle: true,
    requirement: 'Obligatorio para todas las operaciones'
  },

  // Excepciones especiales
  exceptions: {
    sanAndres: 'San Andrés y Providencia',
    smallOperators: 'Pequeños Propietarios (socios <= 3, capital < 250 SMMLV)',
    period: '5 años para alcanzar estándar'
  }
};

export const calculatePayment = (distance, weightTons, vehicleType = 'articulated') => {
  const basePricePerKm = {
    rigid: 5500,
    articulated: 7500,
    pickup: 3000,
    van: 4000
  };

  const basePrice = (basePricePerKm[vehicleType] || 7500) * distance;
  const weightSurcharge = weightTons > 10 ? (weightTons - 10) * 200 * distance : 0;
  const subtotal = basePrice + weightSurcharge;
  
  // Retención del 0.1%
  const retention = subtotal * complianceRules.retentionRate;
  const netPayment = subtotal - retention;

  return {
    basePrice,
    weightSurcharge,
    subtotal,
    retention,
    netPayment,
    paymentDue: complianceRules.paymentDays
  };
};

export const checkLoadUnloadCompliance = (duration, maxHours = 8) => {
  const isCompliant = duration <= maxHours * 60; // Convertir a minutos
  const excessMinutes = Math.max(0, duration - (maxHours * 60));
  
  return {
    isCompliant,
    duration,
    maxHours,
    excessMinutes,
    compensation: excessMinutes > 0 ? calculateTimeExcessCompensation(excessMinutes) : 0
  };
};

export const calculateTimeExcessCompensation = (excessMinutes, vehicleType = 'articulated') => {
  const excessHours = excessMinutes / 60;
  const hourlyRate = complianceRules.timeExcessCompensation[vehicleType] || 3000;
  return Math.ceil(excessHours * hourlyRate);
};

export const generateManifesto = (shipment) => {
  return {
    id: `MF-${Date.now()}`,
    type: 'electronic',
    date: new Date().toISOString(),
    shipperId: shipment.shipperId,
    shippingCompany: shipment.shippingCompany,
    origin: shipment.origin,
    destination: shipment.destination,
    cargo: shipment.cargo,
    weight: shipment.weight,
    vehicle: shipment.vehicle,
    driver: shipment.driver,
    estimatedDelivery: shipment.estimatedDelivery,
    payment: calculatePayment(
      shipment.distance,
      shipment.weight,
      shipment.vehicleType
    ),
    status: 'pending_signature',
    executiveTitle: true,
    createdAt: new Date().toISOString()
  };
};

export const complianceChecklist = [
  {
    id: 'vehicle_modern',
    name: 'Modernización Vehicular',
    description: 'Vehículos >= 3.5T deben estar modernizados según FOPAT',
    required: true
  },
  {
    id: 'speed_limit',
    name: 'Límites de Velocidad',
    description: 'Cumplimiento con límites establecidos (50-120 km/h)',
    required: true
  },
  {
    id: 'load_time',
    name: 'Tiempo de Carga/Descarga',
    description: 'Máximo 8 horas para operaciones logísticas',
    required: true
  },
  {
    id: 'manifesto',
    name: 'Manifesto Electrónico',
    description: 'Título ejecutivo emitido vía RNDG',
    required: true
  },
  {
    id: 'payment_terms',
    name: 'Términos de Pago',
    description: 'Pago dentro de 5 días hábiles',
    required: true
  },
  {
    id: 'retention',
    name: 'Retención 0.1%',
    description: 'Aplicación de retención del 0.1% sobre flete',
    required: true
  },
  {
    id: 'documentation',
    name: 'Documentación Completa',
    description: 'Póliza, seguro, licencia, revisión tecnicomecánica',
    required: true
  }
];
