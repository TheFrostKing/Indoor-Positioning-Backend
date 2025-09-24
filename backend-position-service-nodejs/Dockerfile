# Use Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies, including ts-node globally
RUN npm install
RUN npm install -g ts-node
RUN  npm install mongoose
RUN npm install  --save-dev @types/mongoose @types/node
RUN npm install --save-dev @types/cors

# Copy the rest of the application
COPY . .

# Expose the port the application runs on
EXPOSE 5000

# Run ts-node
CMD ["ts-node", "src/index.ts"]
