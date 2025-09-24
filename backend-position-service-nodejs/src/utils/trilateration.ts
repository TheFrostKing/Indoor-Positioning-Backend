/**
 * Types for better type safety and readability
 */
type RSSIMap = Record<number, number>; // Maps beacon ID to RSSI
type PositionMap = Record<number, { x: number; y: number }>; // Maps beacon ID to its position
type Position = { x: number; y: number }; // Represents a 2D position


/**
 * Calculates the distance based on the RSSI value using the formula:
 * 
 *      d = 10^((P_measured - RSSI) / (10 * n))
 * 
 * @param rssi - Received Signal Strength Indicator (RSSI)
 * @returns The calculated distance in meters
 */
export function calculateDistance(rssi: number): number {
    const measuredPower = -57; // RSSI value at 1 meter
    const envFactor = 4.0;     // Environmental attenuation factor

    // Guard against invalid RSSI values
    if (rssi >= 0) {
        console.warn('Invalid RSSI value; it should be negative.');
        return Infinity; // Signal strength should always be negative
    }

    const exponent = (measuredPower - rssi) / (10 * envFactor);
    return Math.pow(10, exponent);
}

/**
 * Performs trilateration to calculate the 2D position of a point based on three reference beacons.
 * 
 * @param rssiMap - A map of beacon IDs to their RSSI values
 * @param positionMap - A map of beacon IDs to their (x, y) coordinates
 * @returns The calculated position { x, y } or { x: 0, y: 0 } if trilateration fails
 */
export function trilaterate(
    rssiMap: Record<number, number>,
    positionMap: Record<number, { x: number; y: number }>
): { x: number; y: number } {
    const [beaconA, beaconB, beaconC] = Object.entries(rssiMap).map(([id, rssi]) => ({
        rssi,
        position: positionMap[parseInt(id)],
    }));

    const distanceA = calculateDistance(beaconA.rssi);
    const distanceB = calculateDistance(beaconB.rssi);
    const distanceC = calculateDistance(beaconC.rssi);

    const a = 2 * (beaconB.position.x - beaconA.position.x);
    const b = 2 * (beaconB.position.y - beaconA.position.y);
    const c =
        distanceA ** 2 -
        distanceB ** 2 -
        beaconA.position.x ** 2 +
        beaconB.position.x ** 2 -
        beaconA.position.y ** 2 +
        beaconB.position.y ** 2;
    const d = 2 * (beaconC.position.x - beaconB.position.x);
    const e = 2 * (beaconC.position.y - beaconB.position.y);
    const f =
        distanceB ** 2 -
        distanceC ** 2 -
        beaconB.position.x ** 2 +
        beaconC.position.x ** 2 -
        beaconB.position.y ** 2 +
        beaconC.position.y ** 2;

    console.log("[DEBUG] Trilateration coefficients:");
    console.log("a =", a, "b =", b, "c =", c, "d =", d, "e =", e, "f =", f);

    // Check for division by zero
    const denominator = a * e - b * d;
    if (denominator === 0) {
        console.error("[ERROR] Trilateration equations result in division by zero.");
        return { x: 0, y: 0 };
    }

    const x = (c * e - f * b) / denominator;
    const y = (c * d - a * f) / denominator;

    return { x, y };
}
