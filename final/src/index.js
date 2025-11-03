import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./css/main.css";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {Cesium3DTileset, createWorldTerrainAsync, Ion, Viewer} from "cesium";
import {accessToken, assetIds} from "./js/CesiumConfig";
import {fetchApplyBuildingColors} from "./js/FetchApplyBuildingColors";
import {getAuthToken} from "./js/AuthService";

Ion.defaultAccessToken = accessToken;

let authToken = null;
try {
    authToken = await getAuthToken();
} catch (error) {
    console.error("Failed to authenticate:", error);
    alert("Authentication failed. Please check your credentials.");
}

const viewer = new Viewer("cesiumContainer", {
    terrainProvider: await createWorldTerrainAsync(),
});

const tileSet = {
    cityGml: await Cesium3DTileset.fromIonAssetId(assetIds.cityGml),
};

viewer.scene.primitives.add(tileSet.cityGml);

await viewer.zoomTo(tileSet.cityGml);

const apiBuildingUrl =
    "https://backend.gisworld-tech.com/geospatial/communities/08417008/buildings/";

fetchApplyBuildingColors(apiBuildingUrl, tileSet.cityGml, viewer, authToken);

document.getElementById("fetchData").addEventListener("click", () => {
    fetchApplyBuildingColors(apiBuildingUrl, tileSet.cityGml, viewer, authToken);
});