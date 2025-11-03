import json

import requests
from qgis.PyQt.QtCore import QVariant
from qgis.core import (
    QgsProject, QgsVectorLayer, QgsFeatureRequest, QgsFeature,
    QgsGeometry, QgsPointXY, QgsCoordinateReferenceSystem, QgsCoordinateTransform, QgsField
)

COMMUNITY_ID = "08417008"
BASE_URL = "https://backend.gisworld-tech.com"
TOKEN_URL = f"{BASE_URL}/api/token/"
POST_URL = f"{BASE_URL}/geospatial/communities/{COMMUNITY_ID}/buildings/select-connections/"

USERNAME = "guest"
PASSWORD = "guest20252025"

VERIFY_SSL = False
TIMEOUT = 30
TEMP_LAYER_NAME = "selected_area"


def get_selected_area_layer():
    proj = QgsProject.instance()
    for lyr in proj.mapLayers().values():
        if lyr.name() == TEMP_LAYER_NAME:
            return lyr
    lyr = QgsVectorLayer("Polygon?crs=EPSG:25832", TEMP_LAYER_NAME, "memory")
    proj.addMapLayer(lyr)
    return lyr


def polygon_to_wgs84_coords(geom):
    crs_src = QgsCoordinateReferenceSystem("EPSG:25832")
    crs_dst = QgsCoordinateReferenceSystem("EPSG:4326")
    xform = QgsCoordinateTransform(crs_src, crs_dst, QgsProject.instance().transformContext())

    rings = geom.asPolygon()
    if not rings:
        return None

    ring = rings[0]
    coords = []
    for pt in ring:
        p = xform.transform(QgsPointXY(pt.x(), pt.y()))
        coords.append([round(p.x(), 6), round(p.y(), 6)])

    if coords[0] != coords[-1]:
        coords.append(coords[0])

    return coords


def load_line_layer(data, layer_name):
    vl = QgsVectorLayer("LineString?crs=EPSG:4326", layer_name, "memory")
    pr = vl.dataProvider()
    pr.addAttributes([
        QgsField("id", QVariant.Int),
        QgsField("community", QVariant.String),
        QgsField("building_id", QVariant.String),
        QgsField("length", QVariant.Double),
        QgsField("heat_density", QVariant.Double),
        QgsField("color", QVariant.String),
    ])
    vl.updateFields()

    for item in data:
        coords = item["geom"]["coordinates"]
        line = [QgsPointXY(x, y) for x, y in coords]
        geom = QgsGeometry.fromPolylineXY(line)

        f = QgsFeature()
        f.setFields(vl.fields())
        f.setGeometry(geom)
        f["id"] = item.get("id")
        f["community"] = item.get("community_id")
        f["building_id"] = item.get("building_gml_id") or item.get("number")
        f["length"] = item.get("length")
        f["heat_density"] = item.get("heat_density")
        f["color"] = item.get("color")
        pr.addFeature(f)

    vl.updateExtents()
    QgsProject.instance().addMapLayer(vl)


def post_polygon_and_load_layers(coords):
    r = requests.post(TOKEN_URL, data={"username": USERNAME, "password": PASSWORD},
                      timeout=TIMEOUT, verify=VERIFY_SSL)
    token = r.json().get("access") or r.json().get("token")

    payload = {
        "polygon": {
            "type": "Polygon",
            "coordinates": [coords]
        }
    }

    print("\n--- POST Request Payload ---")
    print(json.dumps(payload, indent=2))

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(POST_URL, headers=headers, data=json.dumps(payload),
                         timeout=TIMEOUT, verify=VERIFY_SSL)

    print("\n--- Server Response ---")
    try:
        result = resp.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception:
        print(resp.text)
        return

    house_pipes = result.get("house_pipes", [])
    main_pipes = result.get("main_pipes", [])

    if house_pipes:
        load_line_layer(house_pipes, "house_pipes")
    if main_pipes:
        load_line_layer(main_pipes, "main_pipes")


if __name__ == '__console__':
    layer = get_selected_area_layer()
    feat = next(layer.getFeatures(QgsFeatureRequest().setLimit(1)), None)

    if not feat:
        print("Draw a polygon in 'selected_area' first.")
    else:
        coords = polygon_to_wgs84_coords(feat.geometry())
        if not coords:
            print("Invalid geometry.")
        else:
            post_polygon_and_load_layers(coords)
