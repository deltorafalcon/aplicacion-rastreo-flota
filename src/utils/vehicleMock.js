export const generateMockFleet = () => [
    {
        id: 'V-001',
        name: 'Camión Norte 01',
        driver: 'Luis Rodríguez',
        location: [4.6097, -74.0817], // Bogota
        speed: 45,
        status: 'active',
        plate: 'SKR-456',
        route: 'Bogotá - Medellín'
    },
    {
        id: 'V-002',
        name: 'Van Entrega 02',
        driver: 'María García',
        location: [4.6597, -74.1017],
        speed: 85,
        status: 'speeding',
        plate: 'ZXC-789',
        route: 'Bogotá - Cali'
    },
    {
        id: 'V-003',
        name: 'Trailer Pesado 03',
        driver: 'Carlos Pérez',
        location: [4.6297, -74.0517],
        speed: 0,
        status: 'stopped',
        plate: 'BNM-123',
        route: 'Local - Fontibón'
    },
    {
        id: 'V-004',
        name: 'Pickup Logística 04',
        driver: 'Ana López',
        location: [6.2442, -75.5812], // Medellin
        speed: 62,
        status: 'active',
        plate: 'CVB-456',
        route: 'Medellín Centro'
    },
    {
        id: 'V-005',
        name: 'Moto Mensajería 05',
        driver: 'Jorge Ruiz',
        location: [3.4516, -76.5320], // Cali
        speed: 30,
        status: 'active',
        plate: 'DFG-123',
        route: 'Cali Sur'
    }
];
