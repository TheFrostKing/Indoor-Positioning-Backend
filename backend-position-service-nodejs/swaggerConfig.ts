import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Device and Beacon API Documentation',
        version: '1.0.0',
        description: 'API for managing devices, tags, and beacons in the smart classroom system.',
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Development server',
        },
    ],
};


const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Smart Classroom API',
        version: '1.0.0',
        description: 'API documentation for the Smart Classroom application',
      },
      servers: [
        {
          url: 'http://localhost:5000', // Update this with your server's base URL
        },
      ],
      components: {
        schemas: {
          Tag: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Unique identifier for the tag',
              },
              position: {
                type: 'object',
                properties: {
                  x: {
                    type: 'number',
                    description: 'X-coordinate of the tag',
                  },
                  y: {
                    type: 'number',
                    description: 'Y-coordinate of the tag',
                  },
                  accuracy: {
                    type: 'number',
                    description: 'Accuracy of the position calculation',
                  },
                },
              },
              floor_id: {
                type: 'number',
                description: 'Floor ID associated with the tag',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp of the tag',
              },
            },
          },
          DeviceAirSensing: {
            type: 'object',
            properties: {
              id: { type: 'integer', description: 'Device ID' },
              type: { type: 'string', description: 'Type of the device' },
              name: { type: 'string', description: 'Name of the device' },
              humidity: { type: 'string', description: 'Humidity value' },
              temperature: { type: 'string', description: 'Temperature value' },
            },
          },
          Beacon: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                description: 'Unique identifier for the beacon',
              },
              location: {
                type: 'object',
                properties: {
                  floor_id: { type: 'number', description: 'Floor ID' },
                  x: { type: 'number', description: 'X-coordinate' },
                  y: { type: 'number', description: 'Y-coordinate' },
                },
              },
              rssi: {
                type: 'number',
                description: 'Signal strength indicator',
              },
            },
          },
        },
      },
    },
    apis: ['./src/services/routes/*.ts'], // Path to your route files
  };
  
const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
