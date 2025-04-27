    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # Install dependencies
    COPY package*.json ./
    RUN npm install
    
    # Copy all project files
    COPY . .
    
    # Build the Next.js app
    RUN npm run build
    
    # ---- Production Stage ----
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    # Set environment variables
    ENV NODE_ENV=production
    ENV NEXT_PUBLIC_API_URL=http://localhost:3000
    
    # Install only production dependencies
    COPY package*.json ./
    RUN npm install --only=production
    
    # Copy the built application
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/next.config.js ./next.config.js
    
    # Expose the app port
    EXPOSE 3000
    
    # Start the application
    CMD ["npm", "start"]
    