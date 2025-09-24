import mqtt, { MqttClient } from 'mqtt';
import { Beacon } from '../models/Beacon';
import { Tag } from '../models/Tag';

interface WhitelistServiceConfig {
    mqttBrokerUrl: string;
    whitelistTopic: string;
}

export class WhitelistService {
    addDevice(arg0: string, id: string) {
        throw new Error('Method not implemented.');
    }
    private client: MqttClient;
    private whitelist: { tags: Set<number>; beacons: Set<number> };
    private config: WhitelistServiceConfig;

    constructor(config: WhitelistServiceConfig) {
        this.config = config;
        this.whitelist = { tags: new Set(), beacons: new Set() };
        this.client = mqtt.connect(config.mqttBrokerUrl, {
            reconnectPeriod: 5000,
        });

        this.client.on('connect', () => {
            console.log(`Connected to MQTT broker at ${this.config.mqttBrokerUrl}`);
        });

        this.client.on('error', (err) => {
            console.error('MQTT connection error:', err);
        });
    }

    /**
     * Fetch all devices from the database and update the whitelist.
     */
    public async updateWhitelistFromDatabase(): Promise<void> {
        try {
            const beacons = await Beacon.find({}, 'id').exec();
            const tags = await Tag.find({}, 'id').exec();

            // Update the whitelist sets
            this.whitelist.beacons = new Set(beacons.map((b) => b.id));
            this.whitelist.tags = new Set(tags.map((t) => t.id));

            console.log('[INFO] Updated whitelist from database:', this.getWhitelist());

            // Publish the whitelist to the MQTT topic
            const message = JSON.stringify(this.getWhitelist());
            this.client.publish(this.config.whitelistTopic, message, { qos: 1 }, (err) => {
                if (err) {
                    console.error('Failed to publish updated whitelist:', err);
                } else {
                    console.log(`Whitelist published to topic ${this.config.whitelistTopic}`);
                }
            });
        } catch (error) {
            console.error('Error fetching devices from database:', error);
        }
    }


    /**
     * Get the current whitelist.
     */
    public getWhitelist(): { tags: number[]; beacons: number[] } {
        return {
            tags: Array.from(this.whitelist.tags),
            beacons: Array.from(this.whitelist.beacons),
        };
    }
}
