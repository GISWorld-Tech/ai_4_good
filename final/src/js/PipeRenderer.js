import {Cartesian2, Cartesian3, Cartographic, Color, Math as CesiumMath, sampleTerrainMostDetailed} from "cesium";

let pipesRoot = null;
let houseParent = null;
let mainParent = null;

function ensureParents(viewer) {
    if (!pipesRoot || viewer.entities.getById(pipesRoot?.id) == null) {
        pipesRoot = viewer.entities.add({name: "Pipes Root"});
    }
    if (!houseParent || viewer.entities.getById(houseParent?.id) == null) {
        houseParent = viewer.entities.add({name: "House Pipes", parent: pipesRoot});
    }
    if (!mainParent || viewer.entities.getById(mainParent?.id) == null) {
        mainParent = viewer.entities.add({name: "Main Pipes", parent: pipesRoot});
    }
}

export function clearPipes(viewer) {
    if (houseParent) {
        const toRemove = viewer.entities.values.filter((e) => e.parent === houseParent);
        toRemove.forEach((e) => viewer.entities.remove(e));
    }
    if (mainParent) {
        const toRemove = viewer.entities.values.filter((e) => e.parent === mainParent);
        toRemove.forEach((e) => viewer.entities.remove(e));
    }
}

function computeCircle(radius) {
    const positions = [];
    for (let i = 0; i < 360; i++) {
        const radians = CesiumMath.toRadians(i);
        positions.push(new Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
    }
    return positions;
}

function toCartographicArray(coords) {
    const arr = [];
    for (let i = 0; i < coords.length; i++) {
        const pair = coords[i];
        if (
            Array.isArray(pair) &&
            pair.length >= 2 &&
            Number.isFinite(pair[0]) &&
            Number.isFinite(pair[1])
        ) {
            arr.push(Cartographic.fromDegrees(pair[0], pair[1]));
        }
    }
    return arr;
}

async function addPolylineVolume(viewer, parent, coords, colorHex, radius) {
    const cartographic = toCartographicArray(coords);
    if (cartographic.length < 2) return null;

    const sampled = await sampleTerrainMostDetailed(viewer.terrainProvider, cartographic);
    const positions = sampled.map((p) => Cartesian3.fromRadians(p.longitude, p.latitude, p.height));
    const color = colorHex ? Color.fromCssColorString(colorHex) : Color.GRAY;

    return viewer.entities.add({
        parent,
        polylineVolume: {
            positions,
            shape: computeCircle(radius),
            material: color,
        },
    });
}

export async function renderPipes(viewer, data, options = {}) {
    ensureParents(viewer);
    const {zoom = false, houseRadius = 0.4, mainRadius = 0.6} = options;

    if (!data || (Array.isArray(data) && data.length === 0)) {
        console.warn("renderPipes: no data provided");
        return;
    }

    const house = data.house_pipes || [];
    const main = data.main_pipes || [];

    let count = 0;

    for (const p of house) {
        try {
            if (p?.geom?.type !== "LineString" || !Array.isArray(p?.geom?.coordinates)) continue;
            await addPolylineVolume(viewer, houseParent, p.geom.coordinates, p.color, houseRadius);
            count++;
        } catch (e) {
            console.warn("Failed to draw house pipe", p, e);
        }
    }

    for (const p of main) {
        try {
            if (p?.geom?.type !== "LineString" || !Array.isArray(p?.geom?.coordinates)) continue;
            await addPolylineVolume(viewer, mainParent, p.geom.coordinates, p.color, mainRadius);
            count++;
        } catch (e) {
            console.warn("Failed to draw main pipe", p, e);
        }
    }

    if (zoom && pipesRoot) {
        try {
            await viewer.zoomTo(pipesRoot);
        } catch (e) {
            // ignore zoom errors
        }
    }

    return {count, houseCount: house.length, mainCount: main.length};
}
