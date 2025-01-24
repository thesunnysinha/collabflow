FROM node:16

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Start React development server
CMD ["npm", "start"]
