FROM node:22-bookworm

# 1. Install Python 3 and pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy and install Backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# 3. Copy and install Ingestion dependencies
COPY ingestion/requirements.txt ./ingestion/
RUN python3 -m venv /app/ingestion/venv && \
    /app/ingestion/venv/bin/pip install --no-cache-dir -r ./ingestion/requirements.txt

# 4. Copy project code and generate Prisma client
COPY . .
RUN cd backend && DATABASE_URL="postgresql://dummy:dummy@dummy/dummy" npx prisma generate

ENV NODE_ENV=production
ENV PYTHON_BIN=/app/ingestion/venv/bin/python3
WORKDIR /app/backend

EXPOSE 5001
CMD ["node", "server.js"]