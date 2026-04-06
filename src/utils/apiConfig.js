/**
 * Utilidad para determinar la URL del API según el entorno
 */
export const getApiUrl = () => {
  // En desarrollo local, usar el servidor local
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }

  // En producción, usar Vercel (esta URL debe actualizarse cuando se despliegue)
  return 'https://tu-api.vercel.app';
};