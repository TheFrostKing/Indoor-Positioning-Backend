// models/Device.ts
import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  id: Number,
  type: String,
  location: {
    x: Number,
    y: Number,
  },
});

// Schema for device location
const locationSchema = new mongoose.Schema({
  x: { type: Number, required: false },
  y: { type: Number, required: false },
});

// Schema for air sensing devices
const deviceAirSensingSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  type: { type: String, required: true, default: "air_sensing" }, // Default type as air_sensing
  name: { type: String, required: false },
  humidity: { type: String, required: false },
  temperature: { type: String, required: false },
  location: { type: locationSchema, required: false }, // Add location field
});

// Export the model
export const DeviceAirSensing = mongoose.model('DeviceAirSensing', deviceAirSensingSchema, "deviceAirSensing");
//the third specifies which collection would the schema go
export const Device = mongoose.model('Device', deviceSchema,"device");

