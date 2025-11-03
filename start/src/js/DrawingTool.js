import {
    CallbackProperty,
    Cartographic,
    ClassificationType,
    Color,
    defined,
    Entity,
    HeightReference,
    Math as CesiumMath,
    PolygonHierarchy,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType
} from "cesium";

let __lastPolygonEntity = null;
let __lastPointsLayer = null;

export function clearDrawingArtifacts(viewer) {
    try {
        if (__lastPolygonEntity) {
            viewer.entities.remove(__lastPolygonEntity);
            __lastPolygonEntity = null;
        }
        if (__lastPointsLayer) {
            const toRemove = viewer.entities.values.filter((e) => e.parent === __lastPointsLayer);
            toRemove.forEach((e) => viewer.entities.remove(e));
            viewer.entities.remove(__lastPointsLayer);
            __lastPointsLayer = null;
        }
    } catch (e) {
        // ignore cleanup errors
    }
}

export function startPolygonDrawing(viewer) {
    clearDrawingArtifacts(viewer);
    return new Promise((resolve, reject) => {
        let active = true;
        const scene = viewer.scene;

        const appHandler = viewer.screenSpaceEventHandler;
        const prevLeft = appHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK);
        const prevLeftDouble = appHandler.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        const prevRight = appHandler.getInputAction(ScreenSpaceEventType.RIGHT_CLICK);
        appHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        appHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        appHandler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);

        const handler = new ScreenSpaceEventHandler(scene.canvas);

        const positionsCartesian = [];
        const positionsLonLat = [];

        const polygonEntity = viewer.entities.add(new Entity({
            polygon: {
                hierarchy: new CallbackProperty(() => {
                    if (positionsCartesian.length < 3) return undefined;
                    return new PolygonHierarchy(positionsCartesian);
                }, false),
                material: Color.YELLOW.withAlpha(0.3),
                outline: true,
                outlineColor: Color.YELLOW,
                perPositionHeight: false,
                classificationType: ClassificationType.TERRAIN
            }
        }));
        __lastPolygonEntity = polygonEntity;

        const pointsLayer = viewer.entities.add(new Entity());
        __lastPointsLayer = pointsLayer;

        function addPoint(cartesian) {
            if (!defined(cartesian)) return;
            positionsCartesian.push(cartesian);
            const carto = Cartographic.fromCartesian(cartesian);
            const lon = CesiumMath.toDegrees(carto.longitude);
            const lat = CesiumMath.toDegrees(carto.latitude);
            positionsLonLat.push([lon, lat]);

            viewer.entities.add({
                parent: pointsLayer,
                position: cartesian,
                point: {
                    pixelSize: 8,
                    color: Color.ORANGE,
                    outlineColor: Color.BLACK,
                    outlineWidth: 1,
                    heightReference: HeightReference.CLAMP_TO_GROUND
                }
            });
        }

        function restoreAppHandlers() {
            if (prevLeft) appHandler.setInputAction(prevLeft, ScreenSpaceEventType.LEFT_CLICK);
            if (prevLeftDouble) appHandler.setInputAction(prevLeftDouble, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            if (prevRight) appHandler.setInputAction(prevRight, ScreenSpaceEventType.RIGHT_CLICK);
        }

        let keyHandlerRef = null;

        function cleanup() {
            active = false;
            handler.destroy();
            if (polygonEntity) viewer.entities.remove(polygonEntity);
            if (pointsLayer) {
                const toRemove = viewer.entities.values.filter((e) => e.parent === pointsLayer);
                toRemove.forEach((e) => viewer.entities.remove(e));
                viewer.entities.remove(pointsLayer);
            }
            if (keyHandlerRef) window.removeEventListener('keydown', keyHandlerRef);
            __lastPolygonEntity = null;
            __lastPointsLayer = null;
            restoreAppHandlers();
        }

        function finish() {
            if (!active) return;
            if (positionsLonLat.length < 3) {
                cleanup();
                reject(new Error("Polygon needs at least 3 points."));
                return;
            }
            const ring = positionsLonLat.slice();
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                ring.push([first[0], first[1]]);
            }
            cleanup();
            resolve(ring);
        }

        handler.setInputAction((movement) => {
            let cartesian = null;
            const ray = viewer.camera.getPickRay(movement.position);
            if (ray) {
                cartesian = scene.globe.pick(ray, scene);
            }
            if (!cartesian) {
                cartesian = viewer.camera.pickEllipsoid(movement.position, scene.globe.ellipsoid);
            }
            if (cartesian) addPoint(cartesian);
        }, ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((_movement) => {
            finish();
        }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

        handler.setInputAction((_movement) => {
            finish();
        }, ScreenSpaceEventType.RIGHT_CLICK);

        keyHandlerRef = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                reject(new Error('Drawing canceled'));
            }
        };
        window.addEventListener('keydown', keyHandlerRef);
    });
}
