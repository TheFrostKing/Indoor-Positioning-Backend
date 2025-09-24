import { calculateDistance, trilaterate } from '../utils/trilateration';
import { Beacon } from '../models/Beacon';
import { Tag } from '../models/Tag';

// Types
type BeaconType = {
    id: number;
    rssi: number;
};

type BeaconTypePosition = {
    id: number;
    location?: { x: number; y: number; floor_id: number } | null;
};

/**
 * Processes trilateration data to calculate the position of a tag based on beacons.
 * Updates the RSSI in the database if it has changed and assigns floor ID to the tag.
 * @param beaconArrayData - The array of beacons and their RSSI values.
 * @returns The calculated position { x, y, accuracy, floor_id } or null if insufficient data.
 */
export async function processTrilaterationData(beaconArrayData: { tag: number; beacons: BeaconType[] }): Promise<{ x: number; y: number; accuracy: number; floor_id: number } | null> {
    console.log('[DEBUG] Received beaconArrayData for trilateration:', JSON.stringify(beaconArrayData, null, 2));

    const { tag: tagId, beacons } = beaconArrayData;

    // Validate that at least three beacons are available
    if (!beacons || beacons.length < 3) {
        console.error('[ERROR] Insufficient beacons for trilateration. At least 3 beacons are required.');
        return null;
    }

    // Fetch positions for all beacons from the database
    const beaconIds = beacons.map(beacon => beacon.id);

    let beaconPositions: BeaconTypePosition[] = [];
    try {
        beaconPositions = await Beacon.find({ id: { $in: beaconIds } }).exec();
        console.log('[DEBUG] Fetched beacon positions from database:', JSON.stringify(beaconPositions, null, 2));
    } catch (error) {
        console.error('[ERROR] Database query failed:', error);
        return null;
    }

    // Group beacons by floor ID
    const beaconsByFloor: Record<number, BeaconTypePosition[]> = {};
    for (const beacon of beaconPositions) {
        const floorId = beacon.location?.floor_id;
        if (floorId !== undefined) {
            if (!beaconsByFloor[floorId]) {
                beaconsByFloor[floorId] = [];
            }
            beaconsByFloor[floorId].push(beacon);
        }
    }

    console.log('[DEBUG] Grouped beacons by floor:', JSON.stringify(beaconsByFloor, null, 2));

    // Prioritize beacons on the floor with the most beacons
    let selectedFloorId: number | null = null;
    let selectedBeacons: BeaconTypePosition[] = [];

    for (const [floorId, floorBeacons] of Object.entries(beaconsByFloor)) {
        if (floorBeacons.length >= 3) {
            selectedFloorId = parseInt(floorId);
            selectedBeacons = floorBeacons;
            break;
        }
    }

    if (!selectedFloorId) {
        console.warn('[WARN] No floor has at least 3 beacons. Using strongest available beacons.');
        selectedBeacons = beaconPositions; // Fallback to all beacons
    }

    // Sort the selected beacons by RSSI and pick the top 3
    console.log('[DEBUG] Sorting selected beacons by RSSI values...');
    const top3Beacons = beacons
        .filter(b => selectedBeacons.some(sb => sb.id === b.id)) // Filter to selected beacons
        .sort((a, b) => b.rssi - a.rssi)
        .slice(0, 3);

    if (top3Beacons.length < 3) {
        console.error('[ERROR] Insufficient valid beacon data for trilateration.');
        return null;
    }

    console.log('[DEBUG] Top 3 beacons selected for trilateration:', JSON.stringify(top3Beacons, null, 2));

    // Prepare RSSI and position maps
    const rssiMap: Record<number, number> = {};
    const positionMap: Record<number, { x: number; y: number }> = {};

    for (const beacon of top3Beacons) {
        const beaconData = beaconPositions.find(b => b.id === beacon.id);

        if (beaconData?.location) {
            rssiMap[beacon.id] = beacon.rssi;
            positionMap[beacon.id] = { x: beaconData.location.x, y: beaconData.location.y };

            try {
                await Beacon.updateOne({ id: beacon.id }, { rssi: beacon.rssi });
                console.log(`[INFO] Updated RSSI for beacon ID ${beacon.id}: ${beacon.rssi}`);
            } catch (error) {
                console.error(`[ERROR] Failed to update RSSI for beacon ID ${beacon.id}:`, error);
            }
        } else {
            console.warn(`[WARN] Beacon with ID ${beacon.id} not found in database or missing location.`);
        }
    }

    console.log('[DEBUG] Final RSSI Map for trilateration:', JSON.stringify(rssiMap, null, 2));
    console.log('[DEBUG] Final Position Map for trilateration:', JSON.stringify(positionMap, null, 2));

    try {
        console.log('[DEBUG] Performing trilateration calculations...');
        const { x, y } = trilaterate(rssiMap, positionMap);
        const residualError = calculateResidualError({ x, y }, positionMap, rssiMap);

        // Save tag position in the database
        if (selectedFloorId === null) {
            console.error('[ERROR] selectedFloorId is null. Unable to save tag position.');
            return null;
        }

        await Tag.updateOne(
            { id: tagId },
            {
                $set: {
                    position: { x, y, accuracy: residualError },
                    floor_id: selectedFloorId,
                    timestamp: new Date(),
                },
            },
            { upsert: true }
        );

        console.log(`[INFO] Tag ${tagId} updated with position: { x: ${x}, y: ${y}, accuracy: ${residualError}, floor_id: ${selectedFloorId} }`);
        return { x, y, accuracy: residualError, floor_id: selectedFloorId };
    } catch (error) {
        console.error('[ERROR] Trilateration failed with error:', error);
        return null;
    }
}

/**
 * Calculates the residual error of the trilateration result by using Euclidean distance
 * @param calculatedPosition - The calculated { x, y } position.
 * @param positionMap - Map of beacon positions.
 * @param rssiMap - Map of beacon RSSI values.
 * @returns The average residual error.
 */
function calculateResidualError(
    calculatedPosition: { x: number; y: number },
    positionMap: Record<number, { x: number; y: number }>,
    rssiMap: Record<number, number>
): number {
    let totalResidual = 0;

    for (const [id, position] of Object.entries(positionMap)) {
        const beaconId = parseInt(id);
        const actualDistance = calculateDistance(rssiMap[beaconId]);
        const calculatedDistance = Math.sqrt(
            (calculatedPosition.x - position.x) ** 2 +
            (calculatedPosition.y - position.y) ** 2
        );
        totalResidual += Math.abs(actualDistance - calculatedDistance);
    }

    return totalResidual / Object.keys(positionMap).length; // Average residual error
}
