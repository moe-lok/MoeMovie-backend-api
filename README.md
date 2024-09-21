
### Project Name: Movie Backend API (Tech assessment)

---

### **Table of Contents**
1. [Project Overview](#project-overview)
2. [Technologies Used](#technologies-used)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Running the Application](#running-the-application)
7. [Testing](#testing)
8. [API Documentation](#api-documentation)

---

### **Project Overview**
This project is a **Movie Backend API** that allows users to:
- **Search for movies** via an external API (TMDb).
- **Register and authenticate users** using AWS Cognito.
- **Add and manage favorite movies** in a MySQL database.
- The API is secured with **JWT-based authentication** and implements best practices for **input sanitization**, **rate limiting**, and **unit testing**.

---

### **Technologies Used**
- **Node.js**: Backend framework
- **Express.js**: Web framework for routing
- **AWS Cognito**: User authentication and management
- **MySQL**: Database for storing user and favorite movie data
- **Redis** (or **Memurai**): In-memory cache for movie data
- **Jest** and **Supertest**: Unit testing and HTTP testing
- **Validator.js**: Input sanitization
- **express-rate-limit**: Rate limiting middleware

---

### **Prerequisites**
Before setting up the project, ensure you have the following installed:
- **Node.js** (v14.x or higher)
- **MySQL** (5.7 or higher)
- **Redis** (or **Memurai** for Windows)
- **AWS Account** (for AWS Cognito)

---

### **Installation**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/moe-lok/MoeMovie-backend-api.git
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the database**:
   - Create a **MySQL database** for the project.
   - Use the following SQL to create the required tables:
     ```sql
     -- Users Table
     CREATE TABLE Users (
       id CHAR(36) PRIMARY KEY, -- UUID in MySQL is often stored as a CHAR(36)
       provider_id VARCHAR(255) NOT NULL UNIQUE, -- ID from the identity provider (AWS Cognito or Okta)
       username VARCHAR(255) NOT NULL,
       email VARCHAR(255) NOT NULL UNIQUE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );

     -- Favourites Table
     CREATE TABLE Favourites (
       id CHAR(36) PRIMARY KEY, -- UUID for favorite entry
       user_id CHAR(36) NOT NULL, -- Foreign key referencing Users(id)
       movie_id BIGINT NOT NULL, -- Foreign key referencing Movies(id)
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, -- Delete user's favorites if the user is deleted
       FOREIGN KEY (movie_id) REFERENCES Movies(id), -- Ensure movie exists
       UNIQUE KEY (user_id, movie_id) -- Prevent user from adding the same movie multiple times
     );

     CREATE TABLE Movies (
       id BIGINT PRIMARY KEY, -- Movie ID from external API (TMDb)
       title VARCHAR(255) NOT NULL,
       release_date DATE,
       overview TEXT,
       poster_url VARCHAR(255),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     );

     -- Indexes
     CREATE INDEX idx_user_id ON Favourites (user_id);
     CREATE INDEX idx_movie_id ON Favourites (movie_id);
     CREATE INDEX idx_user_movie ON Favourites (user_id, movie_id);

     ```

4. **Set up Redis/Memurai**:
   - Install and run **Redis** or **Memurai**.
   - Ensure it's running on the default port (`6379`) or adjust the `.env` file accordingly.

---

### **Environment Variables**

Create a `.env` file in the root directory with the following configuration:

```env
# AWS Cognito
AWS_REGION=your-aws-region
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
AWS_COGNITO_CLIENT_SECRET=your-client-secret  # Only if using the client secret

# TMDb API
TMDB_API_KEY=your-tmdb-api-key

# MySQL Database
DB_HOST=localhost
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# App
NODE_ENV=development
PORT=3000
```

---

### **Running the Application**

1. **Start the application**:
   ```bash
   npm start
   ```

2. The server should be running at `http://localhost:3000`.

---

### **Testing**

Unit tests have been implemented to ensure proper functionality and security.

1. **Run tests**:
   ```bash
   npm test
   ```

2. **Run tests with coverage**:
   ```bash
   npm test -- --coverage
   ```

---

### **API Documentation**

#### **1. Sign-Up** (User Registration)
- **URL**: `/api/auth/signup`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "TestPassword123!"
  }
  ```
- **Response**: 
  - `201 Created`: Successful registration
  - `400 Bad Request`: Validation error

#### **2. Verify Email**
- **URL**: `/api/auth/verify-email`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "testuser@example.com",
    "code": "123456"  // Code received via email
  }
  ```
- **Response**:
  - `200 OK`: Email successfully verified
  - `400 Bad Request`: Invalid or missing code

#### **3. Login**
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "testuser@example.com",
    "password": "TestPassword123!"
  }
  ```
- **Response**:
  - `200 OK`: Returns a JWT token
  - `400 Bad Request`: Validation error

#### **4. Movie Search** (Protected)
- **URL**: `/api/movies/search?q=movie_title`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
- **Response**:
  - `200 OK`: Returns search results
  - `401 Unauthorized`: If token is missing

#### **5. Add to Favorites** (Protected)
- **URL**: `/api/favorites`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
- **Body**:
  ```json
  {
    "movieId": 27205
  }
  ```
- **Response**:
  - `201 Created`: Movie added to favorites
  - `401 Unauthorized`: If token is missing

#### **6. Get Favorites** (Protected)
- **URL**: `/api/favorites`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
- **Response**:
  - `200 OK`: Returns the user's favorite movies
  - `401 Unauthorized`: If token is missing

#### **7. Remove from Favorites** (Protected)
- **URL**: `/api/favorites/:movieId`
- **Method**: `DELETE`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
- **Response**:
  - `200 OK`: Movie removed from favorites
  - `404 Not Found`: Movie not found in favorites
  - `401 Unauthorized`: If token is missing

---
