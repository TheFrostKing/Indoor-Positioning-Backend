import request from 'supertest';
import app from './src/app'; // Assuming your Express app is exported from `app.ts`
import { connectDB } from './src/config/database';
import { Tag } from './src/models/Tag';
import { Beacon } from './src/models/Beacon';
import mongoose from 'mongoose';

describe('API Endpoints', () => {
    beforeAll(async () => {
        await connectDB();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Tag.deleteMany({});
        await Beacon.deleteMany({});
    });

    it('should fetch all tags', async () => {
        await Tag.create([{ id: 1 }, { id: 2 }]);

        const response = await request(app).get('/api/tags');
        expect(response.status).toBe(200);
        expect(response.body.tags).toHaveLength(2);
    });

    it('should fetch a specific tag by ID', async () => {
        await Tag.create({ id: 1, position: { x: 5, y: 10, accuracy: 1 }, floor_id: 1.25 });

        const response = await request(app).get('/api/tags/1');
        expect(response.status).toBe(200);
        expect(response.body.tag).toBeDefined();
        expect(response.body.tag.id).toBe(1);
    });

    it('should remove a tag by ID', async () => {
        await Tag.create({ id: 1 });

        const deleteResponse = await request(app).delete('/api/tags/1');
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.message).toBe('Tag removed successfully.');

        const fetchResponse = await request(app).get('/api/tags/1');
        expect(fetchResponse.status).toBe(404);
    });

    it('should fetch all beacons', async () => {
        await Beacon.create([{ id: 1 }, { id: 2 }]);

        const response = await request(app).get('/api/beacons');
        expect(response.status).toBe(200);
        expect(response.body.beacons).toHaveLength(2);
    });

    it('should remove a beacon by ID', async () => {
        await Beacon.create({ id: 1 });

        const deleteResponse = await request(app).delete('/api/beacons/1');
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.message).toBe('Beacon removed successfully.');

        const fetchResponse = await request(app).get('/api/beacons/1');
        expect(fetchResponse.status).toBe(404);
    });
});
