import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./css/main.css";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { Cesium3DTileset, createWorldTerrainAsync, Ion, Viewer } from "cesium";
import { accessToken, assetIds } from "./js/CesiumConfig";
import { fetchAndDisplayPipes } from "./js/FetchAndDisplayPipes";
import { fetchApplyBuildingColors } from "./js/FetchApplyBuildingColors";

Ion.defaultAccessToken = accessToken;

const viewer = new Viewer("cesiumContainer", {
  terrainProvider: await createWorldTerrainAsync(),
});

const tileSet = {
  cityGml: await Cesium3DTileset.fromIonAssetId(assetIds.cityGml),
};

viewer.scene.primitives.add(tileSet.cityGml);

await viewer.zoomTo(tileSet.cityGml);

const apiMainPipe =
  "https://backend.gisworld-tech.com/geospatial/main-pipes/?project_id=00001";
const apiHousePipe =
  "https://backend.gisworld-tech.com/geospatial/house-pipes/?project_id=00001";
const apiBuildingUrl =
  "https://backend.gisworld-tech.com/geospatial/buildings-energy/?project_id=00001";

fetchApplyBuildingColors(apiBuildingUrl, tileSet.cityGml, viewer);

fetchAndDisplayPipes({
  viewer: viewer,
  apiUrl: apiMainPipe,
  pipeType: "Main",
  circleRadius: 0.8,
});

fetchAndDisplayPipes({
  viewer: viewer,
  apiUrl: apiHousePipe,
  pipeType: "House",
  circleRadius: 0.4,
});

document.getElementById("fetchData").addEventListener("click", () => {
  fetchApplyBuildingColors(apiBuildingUrl, tileSet.cityGml, viewer);
  fetchAndDisplayPipes({
    viewer: viewer,
    apiUrl: apiMainPipe,
    pipeType: "Main Pipe",
    circleRadius: 0.8,
    fetchData: true,
    removeAll: true,
  });
  fetchAndDisplayPipes({
    viewer: viewer,
    apiUrl: apiHousePipe,
    pipeType: "House Connecting Pipe",
    circleRadius: 0.4,
    fetchData: true,
    removeAll: false,
  });
});
