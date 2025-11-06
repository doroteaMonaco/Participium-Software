# Backend Dockerfile
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY ./backend .

# Copy the documentation folder
COPY ./doc ./doc

RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
