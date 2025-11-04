import requests
from qgis.PyQt.QtCore import QVariant
from qgis.core import (
    QgsProject, QgsVectorLayer, QgsField, QgsFeature,
    QgsGeometry, QgsPointXY, QgsCoordinateReferenceSystem, QgsCoordinateTransform
)

COMMUNITY_ID = "08417008"
BASE_URL = "https://backend.gisworld-tech.com"
TOKEN_URL = f"{BASE_URL}/api/token/"
DATA_URL = f"{BASE_URL}/geospatial/communities/{COMMUNITY_ID}/buildings/"
USERNAME = "guest"
PASSWORD = "guest20252025"

VERIFY_SSL = False
TIMEOUT = 30


def coords_to_geom(coords):
    coordinates = []
    for coordinate in coords:
        coordinates.append([transformer.transform(QgsPointXY(x, y)) for x, y in coordinate])
    return QgsGeometry.fromPolygonXY(coordinates)


if __name__ == '__console__':
    # Get token
    r = requests.post(
        TOKEN_URL,
        data={"username": USERNAME, "password": PASSWORD},
        timeout=TIMEOUT,
        verify=VERIFY_SSL
    )
    token = r.json().get("access") or r.json().get("token")

    # Get building data
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(DATA_URL, headers=headers, timeout=TIMEOUT, verify=VERIFY_SSL)
    data = r.json()
    if isinstance(data, dict) and "results" in data:
        data = data["results"]

    # Coordinate systems
    crs_src = QgsCoordinateReferenceSystem("EPSG:4326")
    crs_dst = QgsCoordinateReferenceSystem("EPSG:25832")
    transformer = QgsCoordinateTransform(crs_src, crs_dst, QgsProject.instance().transformContext())

    # Create memory layer
    vl = QgsVectorLayer("Polygon?crs=EPSG:25832", f"buildings_{COMMUNITY_ID}", "memory")
    pr = vl.dataProvider()
    pr.addAttributes([
        QgsField("id", QVariant.Int),
        QgsField("gml_id", QVariant.String),
        QgsField("modified_gml_id", QVariant.String),
        QgsField("community", QVariant.String),
        QgsField("district", QVariant.String),
        QgsField("area", QVariant.Double),
        QgsField("address", QVariant.String),
        QgsField("type", QVariant.String),
        QgsField("begin_co2_from_energy_demand", QVariant.Double),
        QgsField("end_co2_from_energy_demand", QVariant.Double),
        QgsField("begin_energy_demand_specific", QVariant.Double),
        QgsField("end_energy_demand_specific", QVariant.Double),
    ])
    vl.updateFields()

    # Create features
    features = []
    for item in data:
        geom_obj = item.get("geom", {})
        coords = geom_obj.get("coordinates")
        if not coords:
            continue

        geom = coords_to_geom(coords)
        f = QgsFeature(vl.fields())
        f.setGeometry(geom)
        f["id"] = item.get("id")
        f["gml_id"] = item.get("gml_id")
        f["modified_gml_id"] = item.get("modified_gml_id")
        f["community"] = item.get("community_id")
        f["district"] = item.get("district_id")
        f["area"] = item.get("area")
        f["address"] = item.get("address")
        f["type"] = item.get("type")
        f["begin_co2_from_energy_demand"] = item.get("begin_co2_from_energy_demand")
        f["end_co2_from_energy_demand"] = item.get("end_co2_from_energy_demand")
        f["begin_energy_demand_specific"] = item.get("begin_energy_demand_specific")
        f["end_energy_demand_specific"] = item.get("end_energy_demand_specific")
        features.append(f)

    pr.addFeatures(features)
    vl.updateExtents()
    QgsProject.instance().addMapLayer(vl)
