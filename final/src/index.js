import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./css/main.css";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {Cesium3DTileset, createWorldTerrainAsync, Ion, Viewer, ScreenSpaceEventType} from "cesium";
import {accessToken, assetIds} from "./js/CesiumConfig";
import {fetchApplyBuildingColors} from "./js/FetchApplyBuildingColors";
import {getAuthToken} from "./js/AuthService";
import axios from "axios";
import {startPolygonDrawing, clearDrawingArtifacts} from "./js/DrawingTool";
import { renderPipes, clearPipes } from "./js/PipeRenderer";

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

const selectConnectionsUrl = `${apiBuildingUrl}select-connections/`;

const drawBtn = document.getElementById("drawPolygon");
if (drawBtn) {
    drawBtn.addEventListener("click", async () => {
        try {
            // Remove previous pipes and any lingering drawing artifacts before starting a new polygon
            clearPipes(viewer);
            clearDrawingArtifacts(viewer);
            // Start interactive drawing
            const ring = await startPolygonDrawing(viewer); // [[lon, lat], ... closed]

            const polygon = {
                type: "Polygon",
                coordinates: [ring],
            };

            const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

            const response = await axios.post(selectConnectionsUrl, { polygon }, { headers });
            console.log("Polygon submitted successfully.", response.data);

            // Clear previously drawn pipes and render new ones (clamped to terrain)
            try {
                clearPipes(viewer);
                const stats = await renderPipes(viewer, response.data, { zoom: true, houseRadius: 0.4, mainRadius: 0.6 });
                console.log(`Rendered pipes: total=${stats?.count} house=${stats?.houseCount} main=${stats?.mainCount}`);
                alert(`Rendered pipes. House: ${stats?.houseCount ?? 0}, Main: ${stats?.mainCount ?? 0}`);
            } catch (renderErr) {
                console.error("Failed to render pipes:", renderErr);
                alert("Selection submitted, but failed to render pipes. See console.");
            }
        } catch (err) {
            if (err && err.message === "Drawing canceled") {
                console.log("Polygon drawing canceled by user.");
            } else if (err && err.message) {
                console.error("Error during drawing/submission:", err);
                alert(`Error: ${err.message}`);
            } else {
                console.error("Unknown error during drawing/submission", err);
                alert("Unknown error. See console.");
            }
        }
    });
}