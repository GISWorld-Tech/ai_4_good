import axios from "axios";
import { Cesium3DTileStyle, Entity, ScreenSpaceEventType } from "cesium";

export const fetchApplyBuildingColors = async (apiUrl, tileSet, viewer) => {
  try {
    const response = await axios.get(apiUrl);

    if (response.status === 200 && Array.isArray(response.data)) {
      const buildingData = response.data;

      const conditions = buildingData.map((building) => {
        return [
          `'\${gml:id}' === '${building.modified_gml_id}'`,
          `color('${building.color}')`,
        ];
      });

      conditions.push(["true", "color('#FFFFFF')"]);

      tileSet.style = new Cesium3DTileStyle({
        color: {
          conditions: conditions,
        },
      });

      setupFeatureInfo(viewer, buildingData);
    } else {
      console.error("Unexpected API response format", response.data);
    }
  } catch (error) {
    console.error("Error fetching building data from API:", error);
  }
};

const setupFeatureInfo = (viewer, buildingData) => {
  viewer.screenSpaceEventHandler.setInputAction((click) => {
    const pickedFeature = viewer.scene.pick(click.position);

    if (pickedFeature && pickedFeature.getProperty) {
      const featureId = pickedFeature.getProperty("gml:id");

      const buildingInfo = buildingData.find(
        (building) => building.modified_gml_id === featureId,
      );

      if (buildingInfo) {
        const featureName = buildingInfo.gml_id || "Unknown";
        const begin_energy_demand = buildingInfo.begin_energy_demand || "N/A";
        const begin_energy_demand_specific =
          buildingInfo.begin_energy_demand_specific || "N/A";
        const begin_co2_from_energy_demand =
          buildingInfo.begin_co2_from_energy_demand || "N/A";

        viewer.selectedEntity = new Entity({
          name: featureName,
          description: `
            <p><strong>Energy Demand:</strong> ${begin_energy_demand} (kWh/a)</p>
            <p><strong>Energy Demand Specific:</strong> ${begin_energy_demand_specific} (kWh/m²a)</p>
            <p><strong>CO₂ Emissions:</strong> ${begin_co2_from_energy_demand} (kg/a)</p>
          `,
        });
      } else {
        console.warn("No additional data available for the selected building.");
        viewer.selectedEntity = new Entity({
          name: viewer.selectedEntity?.id || "Unknown",
          description:
            viewer.selectedEntity?.description || "No description available",
        });
      }
    } else if (pickedFeature && pickedFeature.id) {
      const selectedEntity = pickedFeature.id;
      if (selectedEntity && selectedEntity.description) {
        viewer.selectedEntity = selectedEntity;
      } else {
        console.warn("No description found for the selected entity.");
      }
    } else {
      viewer.selectedEntity = undefined;
    }
  }, ScreenSpaceEventType.LEFT_CLICK);
};
