bookMyMandap Backend
bookMyMandap is the backend for a Mandap Booking Application built using the MERN Stack (MongoDB, ExpressJS, ReactJS, NodeJS). This backend handles user and provider interactions for booking mandaps, managing orders, and integrating payment and real-time features.
File Structure
The backend repository follows a modular structure for scalability and maintainability:

config/: Configuration files for the application (e.g., database connection setup).
controllers/: Logic for handling API requests and responses.
middlewares/: Custom middleware functions for authentication, validation, etc.
models/: Mongoose schemas and models for MongoDB.
routes/: API route definitions.
.env.example: Sample environment variable file.
.gitignore: Files and directories to be ignored by Git.
package-lock.json: Lock file for dependency versions.
package.json: Project metadata and dependencies.
server.js: Entry point for the backend server.

API Endpoints
User APIs

User

Register
Fields:
Full Name
Email
Phone Number
Password
Address


API:
POST /user/register – Register a new user.




Login
Fields:
Email
Password


API:
POST /user/login – Login a user.




User Profile
API:
GET /user/profile – Get user details.






Order

GET /order/bookings – Get all bookings.
POST /order/bookings – Add a new booking.
Fields: Choose date (String[]), Photographer (optional), Caterers (optional), Rooms (optional).


PUT /order/bookings/:id – Update a booking.
DELETE /order/bookings/:id – Delete a booking.
GET /order/bookings/:id – Get booking details (optional).
Razorpay integration for payments.


Mandaps

GET /mandaps – Get all mandap details.
GET /mandaps/search – Search mandaps by city, mandap name, venue types, or available dates.
GET /mandaps/filter – Filter mandaps by price or guest capacity.
GET /mandaps/:id – Get details of a specific mandap.
GET /mandaps/featured – Get featured mandaps (optional).
GET /mandaps/availability/:id – Check availability of a mandap.
POST /mandaps/favourites – Add mandap to favourites (requires mandapId).
Reviews:
Fields:
User Id
Provider Id
Mandap Id
Rating
Message


APIs:
POST /mandaps/reviews – Add a review.
PUT /mandaps/reviews/:id – Update a review.
DELETE /mandaps/reviews/:id – Delete a review.






Cloudinary Integration: For image uploads and management.

Socket.io Implementation: For real-time features (e.g., booking updates, notifications).


Tech Stack

Server: Node.js, Express.js
Database: MongoDB
File Storage: Cloudinary
Real-Time: Socket.io
Payment: Razorpay

Installation Guide
To run the bookMyMandap backend on your local system, follow these steps:
Step 1: Clone the Repository
Clone the project to your local system:
git clone [https://github.com/D1-Cdac-project/USER_PROVIDER_SERVER.git](https://github.com/D1-Cdac-project/USER_PROVIDER_SERVER.git)
cd bookMyMandap/server

Step 2: Install Dependencies
Install the required dependencies for the backend:
cd server
npm i

Step 3: Add Environment Variables
Create a .env file in the server directory by copying the .env.example file. Add the following environment variables to your .env file:
Environment Variables for Server

PORT: 4000 (or your preferred port)
MONGODB_CONNECTION: MongoDB connection string (from MongoDB Cloud)
SECRET_KEY: Random string for JWT authentication
CLOUDINARY_CLOUD_NAME: From Cloudinary website
CLOUDINARY_API_KEY: From Cloudinary website
CLOUDINARY_API_SECRET: From Cloudinary website
KEY_ID: Razorpay Key ID
KEY_SECRET: Razorpay Secret Key

Step 4: Start the Backend Server
Start the backend server:
cd server
npm start

Once the server is running, it will be accessible at http://localhost:4000 (or the port you specified).
