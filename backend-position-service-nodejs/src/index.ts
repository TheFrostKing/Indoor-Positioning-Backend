import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/database';
import { MqttService } from './services/mqttService';
import { devicesRouter } from './services/routes/devices.router';
import { setupSwagger } from './swagger';
import { swaggerUi, swaggerSpec } from '../swaggerConfig';
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT || 5000;
const corsOptions: cors.CorsOptions = {
    origin: "http://localhost:3000", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Enable cookies and other credentials
};

// Apply CORS middleware
app.use(cors(corsOptions));

setupSwagger(app);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

async function startServer() {
    app.use("/", devicesRouter);
    try {
        await connectDB(); // Connect to MongoDB
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start the server:', error);
        process.exit(1);
    }
}

startServer();
