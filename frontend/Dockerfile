# Frontend Dockerfile
FROM node:20 

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with proper optional dependencies handling
# This fixes the rollup linux-x64-gnu issue
RUN rm -rf node_modules package-lock.json && \
    npm install && \
    npm rebuild

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 4173

# Start the application
CMD ["npm", "run", "preview"]