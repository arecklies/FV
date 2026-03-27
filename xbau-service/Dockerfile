FROM node:20-slim

# xmllint für XSD-Validierung
RUN apt-get update && apt-get install -y libxml2-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .

EXPOSE 3001

CMD ["node", "src/worker.js"]
