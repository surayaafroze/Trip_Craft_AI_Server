# 🌍 TripCraft AI - Backend Server

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

The robust and scalable Express.js backend powering the TripCraft AI platform. This server handles user authentication, data management, and interfaces with Google's Generative AI models to build dynamic travel itineraries.

## ✨ Key Features

- **🧠 AI Integration:** Leverages `@google/generative-ai` (Gemini) to generate context-aware, personalized travel itineraries and budget estimates.
- **🔐 Authentication:** Custom JWT-based authentication system alongside Google OAuth token verification using `google-auth-library`.
- **🗄️ Database:** Connects to MongoDB via the native MongoDB Node.js driver for optimal performance.
- **🛡️ Data Validation:** Strict runtime data validation and schema checking using `Zod`.
- **🔍 Advanced Search:** Flexible text search capabilities utilizing MongoDB Regex queries for destinations.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB
- **Security:** bcrypt, jsonwebtoken, CORS
- **Validation:** Zod
- **AI:** Google Generative AI (Gemini)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine and a running instance of MongoDB (or a MongoDB Atlas URI).

### Installation

1. Clone the repository and navigate into the server folder:
   ```bash
   cd trip_craft_ai_server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables. Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   CLIENT_URL=http://localhost:3000
   JWT_SECRET=your_super_secret_jwt_key
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. Start the development server (runs with nodemon):
   ```bash
   npm run dev
   ```

The server will start running on `http://localhost:5000`.

## 📂 Project Structure

- `/src/controllers` - Request handlers for routes
- `/src/routes` - Express route definitions
- `/src/services` - Core business logic and database operations
- `/src/middleware` - Custom middlewares (e.g., Auth verification)
- `/src/validators` - Zod validation schemas
- `/src/types` - TypeScript interfaces and types

---
*Crafted with passion for modern travelers.*
