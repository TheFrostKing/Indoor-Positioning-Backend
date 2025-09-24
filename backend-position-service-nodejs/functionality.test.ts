import { connectDB } from './src/config/database';
import { Beacon } from './src/models/Beacon';
import { Tag } from './src/models/Tag';
import { processTrilaterationData } from './src/services/trilaterationService';
import mongoose from 'mongoose';
import mqtt from 'mqtt';

describe('Trilateration Service with MQTT', () => {
    const mqttBrokerUrl = 'mqtt://mqtt-public.smartindustries.duckdns.org';
    const testTopic = 'smartclassroom/tag/1/beacon-array';
    let mqttClient: mqtt.MqttClient;

    beforeAll(async () => {
        // Connect to the database
        await connectDB();

        // Connect to MQTT broker
        mqttClient = mqtt.connect(mqttBrokerUrl);
        mqttClient.on('connect', () => {
            console.log('[TEST] Connected to MQTT broker');
        });
        mqttClient.on('error', (err) => {
            console.error('[TEST] MQTT connection error:', err);
        });
    });

    afterAll(async () => {
        if (mqttClient) {
            mqttClient.end(true, () => {
                console.log('[TEST] MQTT client disconnected');
            });
        }
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clear the collections before each test
        await Beacon.deleteMany({});
        await Tag.deleteMany({});
    });

    it('should calculate the position of a tag based on MQTT message data', (done) => {
        // Add three beacons with the same floor ID
        const beacons = [
            { id: 1, location: { floor_id: 1.25, x: 0, y: 0 }, rssi: -50 },
            { id: 2, location: { floor_id: 1.25, x: 4, y: 0 }, rssi: -60 },
            { id: 3, location: { floor_id: 1.25, x: 2, y: 3 }, rssi: -70 },
        ];

        Beacon.insertMany(beacons)
            .then(() => {
                // Prepare MQTT message payload
                const mqttPayload = JSON.stringify({
                    tag: 1,
                    beacons: [
                        { id: 1, rssi: -50 },
                        { id: 2, rssi: -60 },
                        { id: 3, rssi: -70 },
                    ],
                });

                // Listen for the trilateration processing
                mqttClient.on('message', async (topic, message) => {
                    if (topic === testTopic) {
                        try {
                            const data = JSON.parse(message.toString());
                            const position = await processTrilaterationData(data);

                            expect(position).toBeDefined();
                            expect(position?.x).toBeDefined();
                            expect(position?.y).toBeDefined();
                            expect(position?.accuracy).toBeGreaterThan(0);

                            const tagId = 1;
                            await Tag.updateOne({
                                id: tagId,
                                position: {
                                    x: position!.x,
                                    y: position!.y,
                                    accuracy: position!.accuracy,
                                },
                                floor_id: beacons[0].location!.floor_id,
                                timestamp: new Date(),
                            },
                                { upsert: true } // Insert if it doesn't exist

                            );

                            const savedTag = await Tag.findOne({ id: tagId });
                            expect(savedTag).toBeDefined();
                            expect(savedTag?.position.x).toBeCloseTo(position!.x, 2);
                            expect(savedTag?.position.y).toBeCloseTo(position!.y, 2);

                            done();
                        } catch (error) {
                            done(error);
                        }
                    }
                });

                // Subscribe to the MQTT topic
                mqttClient.subscribe(testTopic, { qos: 1 }, (err) => {
                    if (err) {
                        done(err);
                    } else {
                        mqttClient.publish(testTopic, mqttPayload, { qos: 1 });
                    }
                });
            })
            .catch((err) => {
                done(err);
            });
    });
});
