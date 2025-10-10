FROM node:18-alpine

# Create app directory
WORKDIR /app/server

# Copy package manifests and install dependencies inside /app/server
COPY server/package.json ./package.json

# Install production dependencies
RUN npm install --production

# Copy server source files into the image
COPY server/ ./

# Copy frontend static files so the Express server can serve them
RUN mkdir -p /app/frontend
COPY frontend/public /app/frontend/public

ENV NODE_ENV=production
EXPOSE 3000

# Run the server from the server working directory
CMD ["node", "src/index.js"]
