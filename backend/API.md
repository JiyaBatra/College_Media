# College Media API Documentation

This document provides comprehensive documentation for all REST API endpoints in the College Media backend.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the `Authorization` header as follows:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Authentication

#### Register User
- **Method:** POST
- **Path:** `/auth/register`
- **Description:** Register a new user account
- **Authentication:** Not required
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response (Success - 201):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60d5ecb74b24c72b8c8b4567",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```
- **Response (Error - 400):**
  ```json
  {
    "message": "User already exists"
  }
  ```

#### Login User
- **Method:** POST
- **Path:** `/auth/login`
- **Description:** Authenticate user and receive JWT token
- **Authentication:** Not required
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60d5ecb74b24c72b8c8b4567",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
  ```
- **Response (Error - 400):**
  ```json
  {
    "message": "Invalid credentials"
  }
  ```

### Posts

#### Get All Posts
- **Method:** GET
- **Path:** `/posts`
- **Description:** Retrieve all posts sorted by creation date (newest first)
- **Authentication:** Not required
- **Request Body:** None
- **Response (Success - 200):**
  ```json
  [
    {
      "_id": "60d5ecb74b24c72b8c8b4567",
      "user": {
        "_id": "60d5ecb74b24c72b8c8b4568",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "content": "This is a sample post",
      "image": "https://example.com/image.jpg",
      "likes": ["60d5ecb74b24c72b8c8b4569"],
      "createdAt": "2023-06-25T10:30:00.000Z"
    }
  ]
  ```

#### Create Post
- **Method:** POST
- **Path:** `/posts`
- **Description:** Create a new post
- **Authentication:** Required (JWT token)
- **Request Body:**
  ```json
  {
    "content": "This is my new post",
    "image": "https://example.com/image.jpg"
  }
  ```
- **Response (Success - 201):**
  ```json
  {
    "_id": "60d5ecb74b24c72b8c8b4567",
    "user": {
      "_id": "60d5ecb74b24c72b8c8b4568",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "content": "This is my new post",
    "image": "https://example.com/image.jpg",
    "likes": [],
    "createdAt": "2023-06-25T10:30:00.000Z"
  }
  ```
- **Response (Error - 401):**
  ```json
  {
    "message": "No token provided"
  }
  ```

#### Like/Unlike Post
- **Method:** PUT
- **Path:** `/posts/:id/like`
- **Description:** Like or unlike a post. If user has already liked the post, it will be unliked.
- **Authentication:** Required (JWT token)
- **Request Body:** None
- **Response (Success - 200):**
  ```json
  {
    "_id": "60d5ecb74b24c72b8c8b4567",
    "user": "60d5ecb74b24c72b8c8b4568",
    "content": "This is a sample post",
    "image": "https://example.com/image.jpg",
    "likes": ["60d5ecb74b24c72b8c8b4569", "60d5ecb74b24c72b8c8b456a"],
    "createdAt": "2023-06-25T10:30:00.000Z"
  }
  ```
- **Response (Error - 401):**
  ```json
  {
    "message": "No token provided"
  }
  ```
- **Response (Error - 404):**
  ```json
  {
    "message": "Post not found"
  }
  ```

## Error Responses
All endpoints may return the following error responses:
- **500 Internal Server Error:**
  ```json
  {
    "message": "Internal server error message"
  }
