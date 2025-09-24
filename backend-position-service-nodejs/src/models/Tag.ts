import mongoose, { Schema, Document } from 'mongoose';

interface Position {
    x: number;
    y: number;
    accuracy: number;
}

const PositionSchema = new Schema<Position>({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    accuracy: { type: Number, required: false },
});

interface Tag extends Document {
    id: number; // Unique identifier for the tag
    position: Position; // Calculated position
    floor_id: number; // Floor ID associated with the tag
    timestamp: Date; // Timestamp of the calculation
}

const TagSchema = new Schema<Tag>({
    id: { type: Number, required: true, unique: true, min: 1 },
    position: { type: PositionSchema, required: false },
    floor_id: { type: Number, required: false }, // New field for floor ID
    timestamp: { type: Date, default: Date.now },
});

export const Tag = mongoose.model<Tag>('Tag', TagSchema);
