/**
 * Utilidad para determinar la URL del API según el entorno
 */
export const getApiUrl = () => {
  // En desarrollo local, usar el servidor local
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }

  // En producción, usar el mismo dominio del frontend y el prefijo /api
  return '';
};