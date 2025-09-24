import mongoose from 'mongoose';
import { Beacon } from './src/models/Beacon';
import { Tag } from './src/models/Tag';

const seedData = async () => {
  try {
    // MongoDB connection URI
    const mongoUri = process.env.MONGO_URI || 'mongodb://root:password@localhost:27017/position_service?authSource=admin';

    // Connect to the database
    await mongoose.connect(mongoUri);

    console.log('MongoDB connected for seeding.');

    // Seed Beacons
    const beacons = [
      {
        id: 1,
        location: { floor_id: 1, x: 0, y: 0 },
        rssi: -50,
      },
      {
        id: 2,
        location: { floor_id: 1, x: 4, y: 0 },
        rssi: -60,
      },
      {
        id: 3,
        location: { floor_id: 1, x: 2, y: 3 },
        rssi: -70,
      },
    ];

    await Beacon.deleteMany({});
    await Beacon.insertMany(beacons);
    console.log('Beacons seeded successfully.');

    // Seed Tag
    const tag = {
      id: 1,
      position: { x: 1.5, y: 1.5},
      timestamp: new Date(),
    };

    await Tag.deleteMany({});
    await Tag.create(tag);
    console.log('Tag seeded successfully.');

    // Disconnect from the database
    await mongoose.disconnect();
    console.log('MongoDB disconnected after seeding.');
  } catch (error) {
    console.error('Error seeding the database:', error);
    process.exit(1);
  }
};

// Run the seed script
seedData();
