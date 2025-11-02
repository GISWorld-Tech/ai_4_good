import axios from "axios";
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Math as CesiumMath,
  sampleTerrainMostDetailed,
} from "cesium";

const computeCircle = (radius) => {
  const positions = [];
  for (let i = 0; i < 360; i++) {
    const radians = CesiumMath.toRadians(i);
    positions.push(
      new Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)),
    );
  }
  return positions;
};

const fetchAndDisplayPipes = async ({
  viewer,
  apiUrl,
  pipeType,
  circleRadius = 0.5,
  fetchData = false,
  removeAll = false,
}) => {
  try {
    const response = await axios.get(apiUrl);
    const pipeData = response.data;
    removeAll && viewer.entities.removeAll();

    for (const pipe of pipeData) {
      const coordinates = pipe.geom.coordinates;

      const cartographicCoordinates = coordinates.map(([lon, lat]) =>
        Cartographic.fromDegrees(lon, lat),
      );

      const sampledTerrain = await sampleTerrainMostDetailed(
        viewer.terrainProvider,
        cartographicCoordinates,
      );

      const positions = sampledTerrain.map((point) =>
        Cartesian3.fromRadians(point.longitude, point.latitude, point.height),
      );
      viewer.entities.add({
        name: `${pipeType} Pipe ID: ${pipe.id}`,
        polylineVolume: {
          positions: positions,
          shape: computeCircle(circleRadius),
          material: pipe.color
            ? Color.fromCssColorString(pipe.color)
            : Color.GRAY.withAlpha(1),
        },
        description: `
          <strong>Pipe Data:</strong><br>
          Project ID: ${pipe.project_id}<br>
          Number: ${pipe.number}<br>
          Length: ${pipe.length} meters<br>
          Heat Density: ${pipe.heat_density} kWh/m`,
      });
    }

    !fetchData && viewer.zoomTo(viewer.entities);
  } catch (error) {
    console.error(
      `Error fetching or displaying ${pipeType.toLowerCase()} pipes:`,
      error,
    );
  }
};

export { fetchAndDisplayPipes };
