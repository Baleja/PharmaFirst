# Dockerfile for LiveKit Agent
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Expose port (LiveKit agents use port 8080 by default)
EXPOSE 8080

# Start agent
CMD ["pnpm", "agent:start"]

