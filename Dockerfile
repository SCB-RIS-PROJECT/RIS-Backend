FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build application
FROM base AS build
COPY --from=install /temp/prod/node_modules node_modules
COPY . .
RUN bun run build

# Production image
FROM oven/bun:latest AS release
WORKDIR /app

# Copy built binary
COPY --from=build /app/dist/ris-api ./ris-api

# Make binary executable
RUN chmod +x ./ris-api

# Expose port
EXPOSE 8001

# Run the application
CMD ["./ris-api"]
