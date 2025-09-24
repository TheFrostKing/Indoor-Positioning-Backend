import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface representing a Beacon's Location
 */
interface Location {
    floor_id: number; // ID of the floor where the beacon is located
    x: number; // X-coordinate of the beacon
    y: number; // Y-coordinate of the beacon
}

/**
 * Interface representing a Beacon
 */
export interface Beacon extends Document {
    id: number; // Unique identifier for the beacon
    location?: Location | null; // Optional location
    rssi?: number; // Optional RSSI value
}

/**
 * Sub-schema for Location
 */
const LocationSchema = new Schema<Location>({
    floor_id: { type: Number, required: false }, // Floor ID is optional
    x: { type: Number, required: false }, // X-coordinate is optional
    y: { type: Number, required: false }, // Y-coordinate is optional
});

/**
 * Main schema for Beacon
 */
const BeaconSchema = new Schema<Beacon>({
    id: { type: Number, required: true, unique: true }, // Unique identifier for the beacon
    location: { type: LocationSchema, required: false }, // Optional location
    rssi: { type: Number, required: false }, // Optional RSSI value
});

/**
 * Exporting the Beacon model
 */
export const Beacon = mongoose.model<Beacon>('Beacon', BeaconSchema);
