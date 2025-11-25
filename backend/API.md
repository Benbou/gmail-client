# Gmail Client - API Documentation

Backend API reference for the Gmail email client.

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### POST /auth/signup
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### GET /auth/google/start
Initiate Gmail OAuth flow.

**Query Parameters:**
- `userId` (required): User ID to link account to

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### GET /auth/google/callback
OAuth callback (handled automatically by Google redirect).

---

## Account Management

### GET /accounts
List user's Gmail accounts.

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "email": "user@gmail.com",
      "is_active": true,
      "sync_enabled": true,
      "last_sync_at": "2025-01-22T10:00:00Z"
    }
  ]
}
```

### PATCH /accounts/:id
Update account settings.

**Request:**
```json
{
  "sync_enabled": false,
  "is_active": true
}
```

### DELETE /auth/google/:accountId
Remove a Gmail account.

---

## Email Operations

### GET /emails
List emails with filtering and pagination.

**Query Parameters:**
- `userId` (required): User ID
- `account_id` (optional): Filter by specific account
- `page` (default: 1): Page number
- `limit` (default: 50, max: 100): Items per page
- `is_read` (optional): Filter by read status
- `is_archived` (default: false): Show archived emails
- `label_id` (optional): Filter by label
- `search` (optional): Search query
- `sort` (default: received_at): Sort field
- `order` (default: desc): Sort order (asc/desc)

**Response:**
```json
{
  "emails": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5
  }
}
```

### GET /emails/:id
Get single email details.

**Response:**
```json
{
  "email": {
    "id": "uuid",
    "subject": "Meeting tomorrow",
    "from_email": "sender@example.com",
    "from_name": "John Doe",
    "to_emails": ["you@example.com"],
    "body_html": "<p>Email content</p>",
    "received_at": "2025-01-22T09:00:00Z",
    "is_read": false,
    "is_starred": false,
    "is_archived": false
  }
}
```

### PATCH /emails/:id
Update email properties.

**Request:**
```json
{
  "is_read": true,
  "is_starred": true,
  "is_archived": false
}
```

### POST /emails/:id/archive
Archive an email.

### POST /emails/:id/snooze
Snooze an email until specified time.

**Request:**
```json
{
  "until": "2025-01-23T09:00:00Z"
}
```

**Response:**
```json
{
  "action": {
    "id": "uuid",
    "action_type": "snooze",
    "scheduled_at": "2025-01-23T09:00:00Z",
    "status": "pending"
  }
}
```

### DELETE /emails/:id
Permanently delete an email.

---

## Sync Operations

### POST /sync/:accountId
Trigger manual sync for an account.

**Request:**
```json
{
  "syncType": "delta"  // or "full"
}
```

**Response:**
```json
{
  "message": "Sync started",
  "accountId": "uuid",
  "email": "user@gmail.com"
}
```

### POST /sync/:accountId/labels
Sync labels for an account.

### GET /sync/logs/:accountId
Get sync history logs.

**Query Parameters:**
- `limit` (default: 10): Number of logs to return

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "sync_type": "delta",
      "started_at": "2025-01-22T10:00:00Z",
      "completed_at": "2025-01-22T10:01:23Z",
      "status": "success",
      "emails_synced": 15
    }
  ]
}
```

---

## Background Workers

The backend runs three background workers:

### Auto-Sync Worker
- **Frequency:** Every 2 minutes
- **Purpose:** Automatically syncs all active accounts
- **Type:** Delta sync (incremental)

### Token Refresh Worker
- **Frequency:** Every 5 minutes
- **Purpose:** Proactively refreshes OAuth tokens before expiry
- **Threshold:** Refreshes tokens expiring in <10 minutes

### Scheduled Actions Worker
- **Frequency:** Every minute
- **Purpose:** Processes pending scheduled actions (snooze, send later)

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing auth token)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (e.g., duplicate user)
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider:
- Per-user: 100 requests/minute
- Per-IP: 1000 requests/hour
- Gmail API quota: 250 quota units/user/second

---

## Webhooks (Future)

Future enhancement: Gmail push notifications via Cloud Pub/Sub for real-time updates instead of polling.
