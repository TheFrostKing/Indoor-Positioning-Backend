import mongoose from 'mongoose';
import { Device } from '../models/Device';
import { DeviceAirSensing } from '../models/Device';

export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/position_service';
        await mongoose.connect(mongoUri, {
            dbName: 'position_service',
        });
        console.log('MongoDB connected');

        // Ensure collections are created
        await DeviceAirSensing.createCollection();
        await Device.createCollection();
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }

    mongoose.connection.on('connected', () => {
        console.log('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err: unknown) => {
        if (err instanceof Error) {
            console.error('Mongoose connection error:', err.message);
        } else {
            console.error('Mongoose connection error:', err);
        }
    });

    mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected');
    });
};
