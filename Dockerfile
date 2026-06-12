# Use the official Node.js 18 Alpine image
FROM node:18-alpine

# 1. Best Practice: Set NODE_ENV to production
ENV NODE_ENV=production

# 2. Install Tini (Tiny Init System) for better process handling
RUN apk add --no-cache tini

# 3. Standard Path: Use /usr/src/app
WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# 4. Clean Install: Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# 5. Folder Creation: Ensure ALL upload folders exist
RUN mkdir -p assets/images/uploads assets/data/backups assets/data/resumes

# 6. Security: Fix permissions and switch to 'node' user
# This allows the 'node' user to write to these folders
RUN chown -R node:node /usr/src/app

# Switch to the non-root user
USER node

# Expose the application port
EXPOSE 3000

# 7. Start the server using Tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]