import express, { Request, Response } from 'express';
import { Device } from '../../models/Device';
import { DeviceAirSensing } from '../../models/Device';
import mongoose from 'mongoose';
import { WhitelistService } from '../whitelistService';
import { Tag } from '../../models/Tag';
import { Beacon } from '../../models/Beacon';
import { MqttService } from '../../services/mqttService';

var conn = mongoose.connection;
export const devicesRouter = express.Router();
const mqttService = MqttService.getInstance();

// Configure the whitelist service
const whitelistService = new WhitelistService({
    mqttBrokerUrl: 'mqtt://mqtt-public.smartindustries.duckdns.org',
    whitelistTopic: 'smartclassroom/devices/gateway/whitelist/share',
});

devicesRouter.use(express.json());

/**
 * @swagger
 * /airsensing_devices:
 *   get:
 *     summary: Get all air-sensing devices
 *     responses:
 *       200:
 *         description: List of all air-sensing devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeviceAirSensing'
 */
devicesRouter.get('/airsensing_devices', async (req: Request, res: Response) => {
    const devices = await DeviceAirSensing.find({});
    res.status(200).send(devices);
});

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Get all tags
 *     responses:
 *       200:
 *         description: List of all tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tag'
 */
devicesRouter.get('/tags', async (req: Request, res: Response) => {
    try {
        const tags = await Tag.find({});
        res.status(200).json({ tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * @swagger
 * /api/beacons:
 *   get:
 *     summary: Get all beacons
 *     responses:
 *       200:
 *         description: List of all beacons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Beacon'
 *       500:
 *         description: Internal server error
 */
devicesRouter.get('/api/beacons', async (req: Request, res: Response) => {
    try {
        const beacons = await Beacon.find({});
        res.status(200).json({ beacons });
    } catch (error) {
        console.error('Error fetching beacons:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get all devices
 *     responses:
 *       200:
 *         description: List of all devices
 *         content:
 *           application/json:
 */
devicesRouter.get('/', async (req: Request, res: Response) => {
    try {
        // Fetch data from all collections concurrently
        const [tags, beacons, devices, airsensingDevices] = await Promise.all([
            Tag.find(),
            Beacon.find(),
            Device.find(),
            DeviceAirSensing.find(),
        ]);

        // Normalize each collection's data into a unified structure
        const normalizedDevices = [
            ...tags.map((tag) => ({
                entity: {
                    id: tag.id,
                    type: "tag",
                    location: tag.position ? { x: tag.position.x, y: tag.position.y } : null,
                    floor_id: tag.floor_id,
                    timestamp: tag.timestamp,
                },
            })),
            ...beacons.map((beacon) => ({
                entity: {
                    id: beacon.id,
                    type: "beacon",
                    location: beacon.location ? { x: beacon.location.x, y: beacon.location.y,floor_id: beacon.location.floor_id } : null,
                    rssi: beacon.rssi,
                },
            })),
            ...devices.map((device) => ({
                entity: {
                    id: device.id,
                    type: device.type,
                    location: device.location,
                },
            })),
            ...airsensingDevices.map((airSensing) => ({
                entity: {
                    id: airSensing.id,
                    type: "air_sensing",
                    location: airSensing.location || { x: 0, y: 0 },
                    name: airSensing.name,
                    temperature: airSensing.temperature,
                    humidity: airSensing.humidity,
                },
            })),
        ];

        // Send the combined normalized devices as the response
        res.status(200).json(normalizedDevices);
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * @swagger
 * /DeviceAirsensing:
 *   get:
 *     summary: Get all air-sensing devices
 *     responses:
 *       200:
 *         description: List of all air-sensing devices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeviceAirSensing'
 */
devicesRouter.get('/DeviceAirsensing', async (req: Request, res: Response) => {
    const devices = await DeviceAirSensing.find({});
    res.status(200).send(devices);
});

/**
 * @swagger
 * /DeviceAirsensing/{id}:
 *   get:
 *     summary: Get a specific air-sensing device by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the air-sensing device
 *     responses:
 *       200:
 *         description: The requested air-sensing device
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceAirSensing'
 *       404:
 *         description: Device not found
 */
devicesRouter.get('/DeviceAirsensing/:id', async (req: Request, res: Response) => {
    const id = req?.params?.id;
    const devices = await DeviceAirSensing.find({ id });
    res.status(200).send(devices);
});

/**
 * @swagger
 * /DeviceAirsensing:
 *   post:
 *     summary: Create or update an air-sensing device
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceAirSensing'
 *     responses:
 *       200:
 *         description: Device successfully created or updated
 *       500:
 *         description: Internal server error
 */
devicesRouter.post('/DeviceAirsensing', async (req: Request, res: Response) => {
    const { entity } = req.body;

    
    if (!entity || !entity.id || !entity.name) {
        res.status(400).json({ error: 'Invalid input data. Ensure all required fields are provided.' });
        return;
    }

    try {
        
        const updatePayload: Record<string, any> = {
            type: "air_sensing",
            name: entity.name,
            location: entity.location, 
        };

        
        if (entity.temperature !== undefined && entity.temperature !== null) {
            updatePayload.temperature = entity.temperature;
        }
        if (entity.humidity !== undefined && entity.humidity !== null) {
            updatePayload.humidity = entity.humidity;
        }

        const result = await DeviceAirSensing.updateOne(
            { id: entity.id }, 
            { $set: updatePayload }, 
            { upsert: true }
        );

        res.status(200).json({
            message: 'Air sensing device updated successfully',
            result,
        });
    } catch (error) {
        console.error('Error updating air sensing device:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



/**
 * @swagger
 * /device/{id}:
 *   get:
 *     summary: Get a specific device by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the device
 *     responses:
 *       200:
 *         description: The requested device
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Device'
 *       404:
 *         description: Device not found
 */
devicesRouter.get('/device/:id', async (req: Request, res: Response) => {
    const id = req?.params?.id;
    const devices = await Device.find({ id });
    res.status(200).send(devices);
});

/**
 * @swagger
 * /api/beacons:
 *   post:
 *     summary: Add or update a beacon
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Beacon'
 *     responses:
 *       200:
 *         description: Beacon successfully added or updated
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
devicesRouter.post('/api/beacons', async (req: Request, res: Response) => {
    try {
        const { id, location, rssi } = req.body;

        if (!id || typeof id !== 'number') {
            res.status(400).json({ error: 'Invalid input: "id" must be a number.' });
            return;
        }

        if (!location || typeof location.x !== 'number' || typeof location.y !== 'number') {
            res.status(400).json({ error: 'Invalid input: "location" must contain numeric "x" and "y" values.' });
            return;
        }

        const updatePayload: Record<string, any> = { location };
        if (rssi !== undefined && rssi !== null) {
            updatePayload.rssi = rssi;
        }

        const result = await Beacon.updateOne({ id }, { $set: updatePayload }, { upsert: true });
        await whitelistService.updateWhitelistFromDatabase();

        res.status(200).json({ message: 'Beacon updated successfully', result });
    } catch (error) {
        console.error('Error updating beacon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: Get a specific tag by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the tag
 *     responses:
 *       200:
 *         description: The requested tag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       404:
 *         description: Tag not found
 */
devicesRouter.get('/api/tags/:id', async (req: Request, res: Response) => {
    const id = req.params.id;
    const tag = await Tag.findOne({ id });
    if (tag) {
        res.status(200).json(tag);
    } else {
        res.status(404).json({ message: 'Tag not found' });
    }
});

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Add or update a tag
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tag'
 *     responses:
 *       200:
 *         description: Tag successfully added or updated
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
devicesRouter.post('/api/tags', async (req: Request, res: Response) => {
    try {
        const { id, position, floor_id } = req.body;

        if (!id || typeof id !== 'number') {
            res.status(400).json({ error: 'Invalid input: "id" must be a number.' });
            return;
        }

        const updatePayload: Record<string, any> = { timestamp: new Date() };

        if (position) {
            if (typeof position.x !== 'number' || typeof position.y !== 'number') {
                res.status(400).json({ error: 'Invalid input: "position" must contain numeric "x" and "y" values.' });
                return;
            }
            updatePayload.position = position;
        }

        if (floor_id !== undefined && floor_id !== null) {
            if (typeof floor_id !== 'number') {
                res.status(400).json({ error: 'Invalid input: "floor_id" must be a number.' });
                return;
            }
            updatePayload.floor_id = floor_id;
        }

        const result = await Tag.updateOne({ id }, { $set: updatePayload }, { upsert: true });
        await whitelistService.updateWhitelistFromDatabase();

        res.status(200).json({ message: 'Tag updated successfully', result });
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/tags/delete/{id}:
 *   delete:
 *     summary: Delete a specific tag by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the tag
 *     responses:
 *       200:
 *         description: Tag successfully deleted
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Internal server error
 */
devicesRouter.delete('/api/tags/delete/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (isNaN(Number(id))) {
            res.status(400).json({ error: 'Invalid tag ID. Ensure it is a number.' });
            return;
        }

        const result = await Tag.deleteOne({ id: Number(id) });

        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Tag not found.' });
            return;
        }

        await whitelistService.updateWhitelistFromDatabase();
        res.status(200).json({ message: 'Tag deleted successfully.', result });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * @swagger
 * /api/beacons/delete/{id}:
 *   delete:
 *     summary: Delete a specific beacon by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the beacon
 *     responses:
 *       200:
 *         description: Beacon successfully deleted
 *       404:
 *         description: Beacon not found
 *       500:
 *         description: Internal server error
 */
devicesRouter.delete('/api/beacons/delete/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (isNaN(Number(id))) {
            res.status(400).json({ error: 'Invalid beacon ID. Ensure it is a number.' });
            return;
        }

        const result = await Beacon.deleteOne({ id: Number(id) });

        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Beacon not found.' });
            return;
        }

        await whitelistService.updateWhitelistFromDatabase();
        res.status(200).json({ message: 'Beacon deleted successfully.', result });
    } catch (error) {
        console.error('Error deleting beacon:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * @swagger
 * /DeviceAirsensing/delete{id}:
 *   delete:
 *     summary: Delete a specific air-sensing device by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID of the air-sensing device
 *     responses:
 *       200:
 *         description: Air-sensing device successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Air-sensing device deleted successfully.
 *                 result:
 *                   type: object
 *                   properties:
 *                     acknowledged:
 *                       type: boolean
 *                       example: true
 *                     deletedCount:
 *                       type: number
 *                       example: 1
 *       404:
 *         description: Air-sensing device not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Air-sensing device not found.
 *       400:
 *         description: Invalid air-sensing device ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid air-sensing device ID. Ensure it is a number.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error.
 */

devicesRouter.delete('/DeviceAirsensing/delete/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Validate the ID
        if (isNaN(Number(id))) {
            res.status(400).json({ error: 'Invalid air-sensing device ID. Ensure it is a number.' });
            return;
        }

        // Attempt to delete the air-sensing device
        const result = await DeviceAirSensing.deleteOne({ id: Number(id) });

        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Air-sensing device not found.' });
            return;
        }

        // Update any related dependencies (if necessary)
        await whitelistService.updateWhitelistFromDatabase();

        // Respond with success
        res.status(200).json({ message: 'Air-sensing device deleted successfully.', result });
    } catch (error) {
        console.error('Error deleting air-sensing device:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


/**
 * @swagger
 * /api/update/whitelist:
 *   post:
 *     summary: Update the whitelist from the database
 *     responses:
 *       200:
 *         description: Whitelist updated successfully
 *       500:
 *         description: Failed to update whitelist
 */
devicesRouter.post('/api/update/whitelist', async (req: Request, res: Response): Promise<void> => {
    try {
        await whitelistService.updateWhitelistFromDatabase();
        res.status(200).json({
            message: 'Whitelist updated successfully.',
            whitelist: whitelistService.getWhitelist(),
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update whitelist.' });
    }
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get the status of all devices
 *     responses:
 *       200:
 *         description: Device status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: object
 *       500:
 *         description: Failed to fetch device status
 */
devicesRouter.get('/api/status', async (req: Request, res: Response) => {
    try {
        const status = mqttService.getStatus();

        res.status(200).json({
            message: "Device status fetched successfully.",
            status,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch device status.' });
    }
});
