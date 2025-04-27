# Full-Stack Comment Application

A real-time comment system with nested replies, user authentication, and notifications built with Next.js, NestJS, WebSockets, and TypeScript.

## Features

- User authentication with JWT
- Real-time comments and notifications using WebSockets
- Nested comments and replies
- Soft delete and restore functionality
- Responsive design with Tailwind CSS

## Tech Stack

### Frontend
- **Next.js 14** - React framework with server components
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io-client** - WebSocket communication
- **Axios** - HTTP client
- **JWT Decode** - Client-side token handling

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type safety
- **Socket.io** - WebSocket server
- **PostgreSQL** - Database (via TypeORM)
- **JWT** - Authentication
- **Docker** - Containerization
- **Nginx** - Reverse proxy

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL (if running locally without Docker)

## Getting Started

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/full-stack-comment.git
cd full-stack-comment
```

2. Configure environment variables:

Create `.env` in the `backend` directory:
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=commentsdb

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key

# CORS
CORS_ORIGIN=http://localhost:3001
```

Create `.env.local` in the `frontend` directory:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Local Development

#### Backend
```bash
cd backend
npm install
npm run start:dev
```

The backend will be available at `http://localhost:3000`.

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3001`.

### Docker Deployment

To deploy the entire application with Docker:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Backend NestJS service
- Frontend Next.js service
- Nginx as a reverse proxy

The application will be accessible at `http://localhost:80`.

## API Endpoints

### Authentication

| Endpoint | Method | Description | Body | Response |
|----------|--------|-------------|------|----------|
| `/auth/register` | POST | Register a new user | `{ "email": "user@example.com", "password": "Password123" }` | User object |
| `/auth/login` | POST | Login | `{ "email": "user@example.com", "password": "Password123" }` | `{ "access_token": "...", "refresh_token": "...", "user": {...} }` |
| `/auth/refresh` | POST | Refresh token | `{ "refreshToken": "..." }` | `{ "access_token": "...", "refresh_token": "..." }` |
| `/auth/logout` | POST | Logout (requires auth) | - | Success message |
| `/auth/profile` | GET | Get user profile (requires auth) | - | User profile |

### Comments

| Endpoint | Method | Description | Body/Query | Response |
|----------|--------|-------------|------------|----------|
| `/comments` | GET | Get all comments | Query: `parentId=null` for top-level comments | Array of comments |
| `/comments/:id/replies` | GET | Get replies for a comment | Query: `skip=0&take=10` | `{ "items": [...], "total": 42, "hasMore": true }` |
| `/comments` | POST | Create a new comment | `{ "content": "Comment text", "parentId": "optional-id" }` | Created comment |
| `/comments/:id` | PUT | Update a comment | `{ "content": "Updated text" }` | Updated comment |
| `/comments/:id` | DELETE | Delete a comment | - | Success message |
| `/comments/:id/restore` | POST | Restore a deleted comment | - | Restored comment |

### Notifications

| Endpoint | Method | Description | Body | Response |
|----------|--------|-------------|------|----------|
| `/notifications` | GET | Get user notifications | - | Array of notifications |
| `/notifications/mark-read` | POST | Mark notifications as read | `{ "ids": ["id1", "id2"] }` | Success message |
| `/notifications/count` | GET | Get unread notification count | - | `{ "count": 5 }` |

### Health Check

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/health` | GET | API health check | `{ "status": "ok" }` |

## WebSocket Events

The application uses Socket.IO for real-time features with the following events:

### Server to Client
- `commentUpdate` - Emitted when a comment is created, updated, or deleted
- `notification` - Emitted when a user receives a notification

### Client to Server
- `markNotificationRead` - Sent when a user marks a notification as read

## Authentication Flow

1. User registers or logs in to receive JWT tokens
2. The access token is used for API authentication (15-minute expiry)
3. If the access token expires, the refresh token is used to get a new one (7-day expiry)
4. Authentication state is maintained in the `AuthContext`

## Project Structure

### Frontend

```
frontend/
  ├── src/
  │   ├── app/               # Next.js app router
  │   │   ├── (auth)/        # Auth-related pages
  │   │   ├── api/           # API client configuration
  │   │   ├── comments/      # Comments page
  │   │   ├── components/    # Shared components
  │   │   ├── contexts/      # React contexts
  │   │   ├── hooks/         # Custom hooks
  │   │   └── types/         # TypeScript types
```

### Backend

```
backend/
  ├── src/
  │   ├── auth/              # Authentication module
  │   ├── comments/          # Comments module
  │   ├── health/            # Health check module
  │   ├── notifications/     # Notifications module
  │   └── users/             # Users module
```

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure the `CORS_ORIGIN` in the backend matches your frontend URL.
   
2. **WebSocket connection issues**: Check browser console for connection errors. Ensure the WebSocket URL in the frontend matches the backend.

3. **Authentication failures**: 
   - Ensure passwords meet requirements (min 6 chars, uppercase, lowercase, number)
   - Check if tokens are being properly stored in localStorage
   - Verify JWT secrets match in the backend environment variables

### Debugging

1. Check browser console for frontend errors
2. View backend logs with `docker logs <container_id>` or directly in the terminal if running locally
3. For authentication issues, add `console.log` statements in the `AuthContext.tsx` file
4. For WebSocket issues, add logs in the `useSocket.ts` hook

## License

MIT

## Contributors

- Your Name (@yourusername)