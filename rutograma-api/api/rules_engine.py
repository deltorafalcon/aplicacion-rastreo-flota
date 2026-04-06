from datetime import datetime
import holidays

co_holidays = holidays.Colombia()

def es_festivo_o_víspera(fecha=None):
    if fecha is None:
        fecha = datetime.now()
    # Verifica si es festivo, sábado o domingo (días comunes de restricción)
    es_festivo = fecha in co_holidays
    es_fin_de_semana = fecha.weekday() in [5, 6]
    return es_festivo or es_fin_de_semana

def obtener_restriccion_carga(tipo_vehiculo, fecha=None):
    """
    Simula la consulta a la base de datos de INVÍAS para restricciones de carga.
    """
    if tipo_vehiculo.lower() not in ["sencillo", "dobletroque", "tractocamion"]:
        return None

    if es_festivo_o_víspera(fecha):
        return {
            "estado": "RESTRICCIÓN ACTIVA",
            "motivo": "Puente Festivo / Fin de Semana",
            "normativa": "Resolución 0002307 de 2022",
            "excepciones": "Perecederos, Combustibles, Oxígeno medicinal"
        }
    return {"estado": "SIN RESTRICCIÓN", "motivo": "Día laboral estándar"}