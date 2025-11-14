# Backend Dockerfile
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json from backend folder
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the backend application code
COPY backend/ ./

# Copy the documentation folder (from project root to /app/doc)
COPY doc/ ./doc/

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
