FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Use nodemon for development
CMD ["npx", "nodemon", "server.js"]
