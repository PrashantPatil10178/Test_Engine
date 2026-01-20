FROM oven/bun:latest

WORKDIR /app

# Copy package definition and lock file
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .
RUN bunx drizzle-kit push
RUN bun scripts/migrate-mhtcet.ts

# Environment variables should be passed at runtime using --env-file or -e flags
# CMD runs the API
CMD ["bun", "src/index.ts"]
