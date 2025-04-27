# API Endpoints

## Auth
- `POST /auth/register`  
  Body: `{ "email": string, "password": string }`

- `POST /auth/login`  
  Body: `{ "email": string, "password": string }`

- `GET /auth/profile`  
  Header: `Authorization: Bearer <token>`

---

## Comments (REST)
- `GET /comments`  
  Get all comments.

- `POST /comments`  
  Body: `{ "content": string, "parentId"?: string }`  
  (parentId for replies)

- `PUT /comments/:id`  
  Body: `{ "content": string }`

- `DELETE /comments/:id`  
  Soft-delete a comment.

- `POST /comments/:id/restore`  
  Restore a deleted comment.

---

## Comments (WebSocket)
- Connect to: `ws://<host>/ws` or similar
- Events:
  - `comment` (broadcast):  
    `{ action: "create" | "update" | "delete" | "restore", comment?: Comment, commentId?: string }`

---

## Notifications
- `GET /notifications`  
  Get notifications for the current user.

- `POST /notifications/mark-read`  
  Body: `{ "notificationId": string }`

- WebSocket event:  
  - `notification` (broadcast):  
    `{ type: "new", notification: Notification }`

---

**Note:**  
- Replace `<host>` with your backend host (e.g., `localhost:3001`).
- All protected endpoints require `Authorization: Bearer <token>` header.
- WebSocket events and endpoints may vary depending on your implementation.
