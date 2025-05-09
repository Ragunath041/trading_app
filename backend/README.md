# Binary Trade Backend API

This is the backend API for the Binary Trade application, built with Flask and MongoDB.

## Setup

### Prerequisites

- Python 3.8+
- MongoDB

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example` and configure your MongoDB connection and JWT secret key

### Running the Server

```bash
python app.py
```

The server will start on http://localhost:5000

## API Endpoints

### Authentication

- **POST /api/auth/register** - Register a new user
  - Request body: `{ "username": "string", "email": "string", "password": "string" }`
  - Response: `{ "message": "User registered successfully" }`

- **POST /api/auth/login** - Login a user
  - Request body: `{ "email": "string", "password": "string" }`
  - Response: `{ "message": "Login successful", "access_token": "string", "user": { "id": "string", "username": "string", "email": "string", "balance": number } }`

### User

- **GET /api/user/profile** - Get user profile (requires authentication)
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ "id": "string", "username": "string", "email": "string", "balance": number }`

- **GET /api/user/balance** - Get user balance (requires authentication)
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ "balance": number }`

- **POST /api/user/update-balance** - Update user balance (requires authentication)
  - Headers: `Authorization: Bearer <token>`
  - Request body: `{ "amount": number }`
  - Response: `{ "message": "Balance updated successfully", "balance": number }`

### Health Check

- **GET /api/health** - Check if the API is running
  - Response: `{ "status": "healthy", "message": "API is running" }`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints, include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Database

The application uses MongoDB to store user data. The database structure includes:

- **users** collection:
  - _id: ObjectId
  - username: string
  - email: string
  - password: bytes (hashed)
  - balance: number
  - created_at: datetime
