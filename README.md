# 📡 Positioning Service Backend (Node.js + Express + MongoDB)

A production-ready **IoT positioning backend** that talks to hardware **gateways**, manages **whitelists** for **tags** and **beacons**, ingests **RSSI** measurements, and computes **positions via trilateration**. It includes **Swagger/OpenAPI docs** and MongoDB **Mongoose** models for Beacons and Devices.

> This repository showcases backend engineering for real-world location systems: device control, signal processing, floor-aware trilateration, and clean API documentation.

---

## ✨ Highlights

- **Gateway control**: send commands to whitelist/blacklist **tags** and **beacons** (via your gateway adapter).
- **RSSI pipeline**: ingest, validate, and store **RSSI** by `(tagId, beaconId)`; persist latest RSSI per beacon.
- **Floor-aware trilateration**: groups beacons by `floor_id`, prefers a floor with **≥3 beacons**, otherwise falls back to strongest available.
- **Accuracy metric**: computes **residual error** between RSSI-implied distances and geometric distances.
- **Swagger UI**: live docs at **`/api-docs`** (OpenAPI 3.0), default server `http://localhost:5000`.
- **Mongoose models**: `Beacon`, `Device`, `DeviceAirSensing` (with explicit Mongo collections).
- **Configurable**: `.env` for DB, gateway, and algorithm parameters.
- **Container-ready**: Dockerfile + optional `docker-compose.yml`.
  
  # C4 Diagram
 <img width="1611" height="1262" alt="C4 diagram project" src="https://github.com/user-attachments/assets/6007c33e-da37-48dc-963f-4bfb4ee29958" />


---

## 🧰 Tech Stack

- **Node.js** + **Express**
- **MongoDB** with **Mongoose**
- **Swagger**: `swagger-jsdoc` + `swagger-ui-express`
- **Testing**: Jest + Supertest (optional)
- **Container**: Docker
- **Lint/Format**: ESLint + Prettier

---

## ⚙️ Configuration

Create a `.env` (see `.env.example`):

```bash
# Server
PORT=5000                 # Swagger config defaults to 5000; keep in sync
NODE_ENV=development

# Database
DB_URI=mongodb://localhost:27017/positioning

# Gateway communication (if applicable)
GATEWAY_BASE_URL=http://gateway.local:8080
GATEWAY_API_KEY=replace-me

# Trilateration / signal model
# (These are mirrored in code defaults shown below)
MEASURED_POWER_DBM_AT_1M=-57   # RSSI at 1 meter
ENVIRONMENT_FACTOR_N=4.0       # Path-loss exponent (attenuation)
MIN_BEACONS_FOR_FIX=3
```

---

## 📦 Quickstart

### Local (Node)

```bash
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
npm install
cp .env.example .env   # then edit values
npm run dev            # or: npm start
```

### Docker

```bash
docker build -t positioning-backend:latest .
docker run --rm -p 5000:5000 --env-file ./.env positioning-backend:latest
```

### Docker Compose (optional)

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports: ["5000:5000"]
    env_file: .env
    depends_on: [mongo]
  mongo:
    image: mongo:6
    ports: ["27017:27017"]
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
```

```bash
docker compose up --build
```

---

## 📚 API Reference (high-level)

Base URL: `http://localhost:${PORT}` (default `5000`)

### Health

```
GET /health
200 OK -> { "status": "ok", "uptime": 123.45 }
```

### Swagger/OpenAPI

```
GET /api-docs
```
> Serves Swagger UI. The OpenAPI is generated from JSDoc annotations in `./src/routes/*.ts`.

### Whitelist Management

```
POST /api/whitelist
DELETE /api/whitelist/:deviceId?type=tag
GET /api/whitelist
```

### RSSI Ingestion

```
POST /api/rssi
{
  "tagId": 101,
  "beaconId": 1,
  "rssi": -65
}
```

### Trilateration

```
GET /api/trilateration/:tagId
POST /api/trilateration/solve
```

---

## 🧱 Data Models (Mongoose)

### Beacon

```ts
interface Location { floor_id: number; x: number; y: number; }
export interface Beacon extends Document {
  id: number;
  location?: Location | null;
  rssi?: number;
}
```

### Devices

```ts
// Device collection
export const Device = mongoose.model('Device', deviceSchema, "device");

// Air sensing
export const DeviceAirSensing = mongoose.model('DeviceAirSensing', deviceAirSensingSchema, "deviceAirSensing");
```

---

## 📐 Algorithms & Core Logic

### RSSI → Distance

```ts
d = 10 ^ ((measuredPower - rssi) / (10 * n))
```

- `measuredPower = -57 dBm` at 1m
- `n = 4.0` indoor path-loss

### Trilateration

- Selects **top 3 strongest beacons** on a chosen floor.
- Solves via closed-form linear system; returns `{x,y}`.
- Residual error computed as avg `|RSSI-distance - Euclidean distance|`.

### Floor-aware processing

- Groups by `floor_id`, picks floor with ≥3 beacons; otherwise uses all.

---

## Example Flow

1. Gateway sends RSSI `{ tagId, beaconId, rssi }`.
2. Backend updates `Beacon.rssi`.
3. Trilateration groups beacons by floor, picks top 3, solves `(x,y)`.
4. Updates `Tag` record with `{ position, floor_id, accuracy }`.

---

## Roadmap

- Kalman filter option
- WebSockets for live updates
- Geofencing alerts
- CI/CD pipeline

---

## License

MIT
