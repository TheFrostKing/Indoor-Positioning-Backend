import mqtt, { MqttClient } from 'mqtt';
import { processTrilaterationData } from './trilaterationService';

interface DeviceStatus {
    lastSeen: Date;
    isAlive: boolean;
}

export class MqttService {
    private static instance: MqttService;
    private client: MqttClient | null = null;
    private readonly mqttBrokerUrl = 'mqtt://mqtt-public.smartindustries.duckdns.org';
    private latestPosition: { x: number; y: number; accuracy: number } | null = null;
    private readonly checkInterval = 10000; // 10 seconds interval for status check
    private readonly timeout = 20000; // 20 seconds to consider device offline
    private status: Record<number, DeviceStatus> = {}; // Track status by tag ID

    private constructor() {
        this.connectToBroker();
        this.periodicStatusCheck();
    }

    public static getInstance(): MqttService {
        if (!MqttService.instance) {
            MqttService.instance = new MqttService();
        }
        return MqttService.instance;
    }

    public getLatestPosition(): { x: number; y: number; accuracy: number } | null {
        return this.latestPosition;
    }

    private connectToBroker(): void {
        console.log(`[MQTT] Attempting to connect to broker: ${this.mqttBrokerUrl}`);
        try {
            this.client = mqtt.connect(this.mqttBrokerUrl, {
                reconnectPeriod: 0, // Disable automatic reconnection
            });
    
            this.setupConnectionEvents();
        } catch (error) {
            if (error instanceof Error) {
                console.error(`[MQTT] Error connecting to broker: ${error.message}`);
            } else {
                console.error(`[MQTT] Unknown error connecting to broker:`, error);
            }
            this.scheduleReconnect();
        }
    }
    
    private setupConnectionEvents(): void {
        if (!this.client) return;

        this.client.on('connect', () => this.handleConnect());
        this.client.on('message', (topic, message) => this.handleMessage(topic, message));
        this.client.on('error', (error) => this.handleError(error));
        this.client.on('close', () => {
            console.warn('[MQTT] Connection closed, scheduling reconnect...');
            this.scheduleReconnect();
        });
    }

    private handleConnect(): void {
        console.log(`[MQTT] Successfully connected to broker: ${this.mqttBrokerUrl}`);
        const mqtt_topic = 'smartclassroom/tag/#';

        this.client?.subscribe(mqtt_topic, { qos: 1 }, (err) => {
            if (err) {
                console.error('[MQTT] Subscription error:', err.message);
            } else {
                console.log(`[MQTT] Subscribed to topic: ${mqtt_topic}`);
            }
        });
    }

    private async handleMessage(topic: string, message: Buffer): Promise<void> {
        console.log(`[MQTT] Message received on topic: ${topic}`);
        console.log('[MQTT] Message payload:', message.toString());

        try {
            const data = JSON.parse(message.toString());
// Check if the outer key is an empty string
            if (!data[""]) {
                console.error('[MQTT] Invalid message format. Missing expected structure.');
                return;
            }
// Validate the Tag and Beacons
            const { Tag, Beacons } = data[""];
            if (typeof Tag !== 'number' || !Array.isArray(Beacons)) {
                console.error('[MQTT] Invalid data structure. "Tag" should be a number, and "Beacons" should be an array.');
                return;
            }

            console.log(`[MQTT] Processing Tag: ${Tag} with Beacons:`, Beacons);

            for (const beacon of Beacons) {
                if (typeof beacon.id !== 'number' || typeof beacon.rssi !== 'number') {
                    console.warn(`[MQTT] Invalid beacon data:`, beacon);
                    continue;
                }
// Validate and process Beacons

                this.status[beacon.id] = {
                    lastSeen: new Date(),
                    isAlive: true,
                };
                console.log(`[MQTT] Updated status for Beacon ID ${beacon.id} with RSSI ${beacon.rssi}`);
            }
// Update status for the Tag
            this.status[Tag] = {
                lastSeen: new Date(),
                isAlive: true,
            };
            console.log(`[MQTT] Updated status for Tag ID ${Tag}`);

            const position = await processTrilaterationData({ tag: Tag, beacons: Beacons });
            if (position) {
                console.log(`[MQTT] Calculated position for Tag ${Tag}:`, position);
                this.latestPosition = position;
            }
        } catch (error) {
            console.error('[MQTT] Failed to process MQTT message:', error);
        }
    }

    private handleError(error: Error): void {
        console.error(`[MQTT] Connection error: ${error.message}`);
        if (this.client) {
            this.client.end(true, () => {
                console.log('[MQTT] Closed client after error, scheduling reconnect...');
                this.scheduleReconnect();
            });
        } else {
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        console.log('[MQTT] Reconnect scheduled in 30 seconds...');
        setTimeout(() => this.connectToBroker(), 30000);
    }
    
    // Periodic status check to mark devices as offline after a timeout
    private periodicStatusCheck(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [id, deviceStatus] of Object.entries(this.status)) {
                if (now - new Date(deviceStatus.lastSeen).getTime() > this.timeout) {
                    this.status[+id].isAlive = false;
                    console.log(`[MQTT] Device with ID ${id} marked as offline.`);
                }
            }
        }, this.checkInterval); // Check every 10 seconds
    }

    public getStatus() {
        return this.status;
    }
}
