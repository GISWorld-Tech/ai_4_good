import {Cartographic, Color, defined, Entity, ScreenSpaceEventHandler, ScreenSpaceEventType, CallbackProperty, Math as CesiumMath, HeightReference, ClassificationType, PolygonHierarchy} from "cesium";

// Starts an interactive polygon drawing session.
// Returns a Promise that resolves with an array of [lon, lat] pairs (outer ring, closed)
export function startPolygonDrawing(viewer) {
  return new Promise((resolve, reject) => {
    let active = true;
    const scene = viewer.scene;

    // Temporarily disable app-level click handlers to avoid conflicts during drawing
    const appHandler = viewer.screenSpaceEventHandler;
    const prevLeft = appHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK);
    const prevLeftDouble = appHandler.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    const prevRight = appHandler.getInputAction(ScreenSpaceEventType.RIGHT_CLICK);
    appHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    appHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    appHandler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);

    const handler = new ScreenSpaceEventHandler(scene.canvas);

    const positionsCartesian = [];
    const positionsLonLat = []; // not closed while drawing

    // Visual feedback: polygon while drawing + points
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

    const pointsLayer = viewer.entities.add(new Entity());

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
        point: { pixelSize: 8, color: Color.ORANGE, outlineColor: Color.BLACK, outlineWidth: 1, heightReference: HeightReference.CLAMP_TO_GROUND }
      });
    }

    function restoreAppHandlers() {
      // Restore previous app-level handlers
      if (prevLeft) appHandler.setInputAction(prevLeft, ScreenSpaceEventType.LEFT_CLICK);
      if (prevLeftDouble) appHandler.setInputAction(prevLeftDouble, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      if (prevRight) appHandler.setInputAction(prevRight, ScreenSpaceEventType.RIGHT_CLICK);
    }

    let keyHandlerRef = null;

    function cleanup() {
      active = false;
      handler.destroy();
      if (polygonEntity) viewer.entities.remove(polygonEntity);
      if (pointsLayer) viewer.entities.remove(pointsLayer);
      if (keyHandlerRef) window.removeEventListener('keydown', keyHandlerRef);
      restoreAppHandlers();
    }

    function finish() {
      if (!active) return;
      // Need at least 3 points to form a polygon
      if (positionsLonLat.length < 3) {
        cleanup();
        reject(new Error("Polygon needs at least 3 points."));
        return;
      }
      // Close ring if not closed
      const ring = positionsLonLat.slice();
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      cleanup();
      resolve(ring);
    }

    // Left click: add vertex (prefer terrain/ground pick; fall back to ellipsoid)
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

    // Double click: finish
    handler.setInputAction((_movement) => {
      finish();
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Right click: finish
    handler.setInputAction((_movement) => {
      finish();
    }, ScreenSpaceEventType.RIGHT_CLICK);

    // Escape to cancel
    keyHandlerRef = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        reject(new Error('Drawing canceled'));
      }
    };
    window.addEventListener('keydown', keyHandlerRef);
  });
}
