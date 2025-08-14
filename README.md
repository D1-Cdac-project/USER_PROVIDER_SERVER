# BookMyMandap Backend

bookMyMandap is the backend for a Mandap Booking Application built using the MERN Stack (MongoDB, ExpressJS, ReactJS, NodeJS).
This backend handles user and provider interactions for booking mandaps, managing orders, and integrating payment and real-time features.

## File Structure

The backend repository follows a modular structure for scalability and maintainability:

```
config/               Configuration files for the application (e.g., database connection setup)
controllers/          Logic for handling API requests and responses
middlewares/          Custom middleware functions for authentication, validation, etc.
models/               Mongoose schemas and models for MongoDB
routes/               API route definitions
.env.example          Sample environment variable file
.gitignore            Files and directories to be ignored by Git
package-lock.json     Lock file for dependency versions
package.json          Project metadata and dependencies
server.js             Entry point for the backend server
```

## Tech Stack

**Server:** Node.js, Express.js
**Database:** MongoDB
**File Storage:** Cloudinary
**Real-Time:** Socket.IO
**Payment:** Razorpay

---

## 🛠️ Installation Guide

To run the bookMyMandap backend on your local system, follow these steps:

### Step-1: Clone the Repository

Clone the project to your local system:

```bash
git clone https://github.com/D1-Cdac-project/USER_PROVIDER_SERVER.git
cd USER_PROVIDER_SERVER
```

### Step-2: Install Dependencies

Install the required dependencies for the backend:

```bash
cd USER_PROVIDER_SERVER
npm i
```

### Step-3: Add Environment Variables

Create a `.env` file in the root directory by copying the `.env.example` file and add the following variables:

### Environment Variables for Server

```env
PORT=4000
MONGODB_CONNECTION=your_mongodb_connection_string
SECRET_KEY=your_secret_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

KEY_ID=your_razorpay_key_id
KEY_SECRET=your_razorpay_key_secret
```

### Step-4: Start the Backend Server

Start the backend server:

```bash
cd server
npm start
```

Once the server is running, it will be present:

```
http://localhost:4000/
```

---
