from shapely.geometry import LineString, Point
from pyproj import Transformer

# Configuración de transformación: WGS84 a MAGNA-SIRGAS / Colombia Bogota (EPSG:3116)
transformer_to_meters = Transformer.from_crs("EPSG:4326", "EPSG:3116", always_xy=True)
transformer_to_deg = Transformer.from_crs("EPSG:3116", "EPSG:4326", always_xy=True)

def check_risks_on_route(route_coords, incidents, buffer_meters=500):
    """
    route_coords: List of [lon, lat]
    incidents: List of dicts con {'latitud': x, 'longitud': y, 'descripcion': z}
    """
    # 1. Proyectar la ruta a metros
    projected_route = [transformer_to_meters.transform(lon, lat) for lon, lat in route_coords]
    line = LineString(projected_route)

    # 2. Crear el área de influencia
    route_buffer = line.buffer(buffer_meters)

    hits = []
    for inc in incidents:
        try:
            # 3. Proyectar cada incidente
            inc_lon, inc_lat = float(inc['longitud']), float(inc['latitud'])
            p_lon, p_lat = transformer_to_meters.transform(inc_lon, inc_lat)
            point = Point(p_lon, p_lat)

            # 4. Intersección
            if point.within(route_buffer):
                hits.append({
                    "evento": inc.get('evento', 'Desconocido'),
                    "detalle": inc.get('observaciones', 'Sin detalle'),
                    "distancia_via": round(line.distance(point), 2),
                    "coords": [inc_lat, inc_lon]
                })
        except:
            continue

    return hits
