# Dockerfile for CodeCrowds (production-friendly, installs dev deps at build time)
FROM node:20-alpine

WORKDIR /app

# Install build-time dependencies (including devDeps such as sequelize-cli)
# Use npm_config_production=false to ensure devDependencies are installed during the build.
# We temporarily set NODE_ENV to development during install and switch to production for runtime.
ENV npm_config_production=false

# Copy package files and install
COPY package*.json ./
RUN npm ci --silent

# Copy app source
COPY . .

# Fix CRLF if files were edited on Windows and make the entrypoint executable
RUN if [ -f ./docker-entrypoint.sh ]; then sed -i 's/\r$//' ./docker-entrypoint.sh || true && chmod +x ./docker-entrypoint.sh; fi

# Now set production runtime vars
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Use non-root user for runtime (node user provided by official image)
USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
# Default CMD (can be overridden by docker-compose or CLI)
CMD ["node", "src/index.js"]
