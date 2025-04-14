# Restro Backend

![Node.js](https://img.shields.io/badge/Node.js-v18.16.0-green)
![MongoDB](https://img.shields.io/badge/MongoDB-v6.0-blue)
![Cloudinary](https://img.shields.io/badge/Cloudinary-API-orange)

A Node.js backend for a restaurant management system, providing APIs for vendor management, food items, orders, and image uploads. Built with Express.js, MongoDB, and Cloudinary for image storage.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Recent Fixes](#recent-fixes)
- [Contributing](#contributing)
- [License](#license)

## Features
- Vendor authentication and profile management.
- Food item creation with image uploads via Cloudinary.
- Order management for vendors.
- Service availability toggling with geolocation support.
- JWT-based authentication.
- File upload handling with multer and local storage fallback.

## Tech Stack
- **Node.js**: v18.16.0
- **Express.js**: Web framework for API routes.
- **MongoDB**: Database for storing vendors, foods, and orders.
- **Mongoose**: ODM for MongoDB.
- **Cloudinary**: Cloud-based image storage.
- **Multer**: Middleware for file uploads.
- **JWT**: Token-based authentication.
- **Dotenv**: Environment variable management.

## Installation

### Clone the repository:
```bash
git clone https://github.com/<your-username>/bckend_restro.git
cd bckend_restro
```

### Install dependencies:
```bash
npm install
```

### Set up MongoDB:
- Install MongoDB locally or use a cloud service like MongoDB Atlas.
- Ensure MongoDB is running on `mongodb://localhost:27017/restro` or update the connection string.

### Create Uploads directory:
```bash
mkdir Uploads
chmod 755 Uploads
```

## Environment Variables
Create a `.env` file in the root directory with the following variables:
```env
MONGO_URI=mongodb://localhost:27017/restro
PORT=8000
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
- `MONGO_URI`: MongoDB connection string.
- `PORT`: Server port (default: 8000).
- `JWT_SECRET`: Secret for JWT signing.
- `CLOUDINARY_*`: Credentials from Cloudinary Dashboard.

## Running the Project

### Start MongoDB:
```bash
mongod
```

### Run the server:
```bash
npm start
```

- Server runs on [http://localhost:8000](http://localhost:8000).
- Use Postman or a similar tool to test APIs.

## API Endpoints

### Authentication
#### POST `/vendor/login`
- Authenticates a vendor.
- **Body**: `{ "email": "testvendor123@example.com", "password": "your_password" }`
- **Response**: Vendor data and JWT token in cookie.

### Vendor Management
#### PATCH `/vendor/service`
- Toggles `serviceAvailable` and updates `lat`, `lng`.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "lat": 12.34, "lng": 56.78 }`
- **Response**: Updated vendor (`_id: 67fbefccb9d8abf37a578f07`).

#### PATCH `/vendor/coverimage`
- Uploads cover images to Cloudinary.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Form-data with images (e.g., R.jpeg).
- **Response**: Updated vendor or `207` with `failedFiles` if uploads fail.

#### GET `/vendor/orders`
- Retrieves vendor orders.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of orders or `404` ("Orders Not found").

### Food Management
#### POST `/vendor/food`
- Adds a food item with images.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Form-data with `name`, `price`, `images`, etc.
- **Response**: Updated vendor with new food ID.

> Note: Full API documentation TBD. Use Postman tests for details.

## Troubleshooting

### Cloudinary Upload Errors
**Error**: `404` with `<!DOCTYPE ...`
- **Cause**: Incorrect `CLOUDINARY_CLOUD_NAME` or `CLOUDINARY_API_SECRET`.
- **Fix**:
```bash
curl https://api.cloudinary.com/v1_1/<your_cloud_name>/ping
```
- Update `.env` with correct credentials from Cloudinary Dashboard.
- Run `testCloudinary.js`:
```bash
node src/testCloudinary.js
```

### Files in Uploads
- Failed uploads are retained (e.g., `1744605360174_R.jpeg`).
- Check `failed_uploads.log` for details.

### MongoDB Issues
**Connection Error**:
- Verify `MONGO_URI` in `.env`.
- Test with:
```bash
node src/testMongo.js
```

### Endpoint Errors
**PATCH `/vendor/service`**:
- **Error**: `"vendor is not defined"`
- **Fix**: Changed to `existingVendor.save()` in `VendorController.js`.

**GET `/vendor/orders`**:
- `404`: "Orders Not found" is expected if no orders exist.
- Add test order:
```bash
node src/createOrder.js
```

## Recent Fixes

### Cloudinary Uploads
- **Issue**: 404 errors for `pizza.jpg`, `R.jpeg` due to incorrect `CLOUDINARY_CLOUD_NAME`.
- **Fix**: Updated `testCloudinary.js` to use local files (`Uploads\1744605360174_R.jpeg`). Enhanced logging in `CloudinaryUtility.js`.
- **Status**: Pending correct `.env` credentials.

### PATCH `/vendor/service`
- **Issue**: `"vendor is not defined"` due to `vendor.save()`.
- **Fix**: Changed to `existingVendor.save()` in `VendorController.js`.
- **Commit**: `<hash>` (update with actual commit).

### GET `/vendor/orders`
- **Issue**: `404` ("Orders Not found") when no orders exist.
- **Fix**: Verified as expected behavior. Added `createOrder.js` for testing.
- **Script**: Creates order for `vendorId: 67fbefccb9d8abf37a578f07`.

## Contributing
1. Fork the repository.
2. Create a branch (`git checkout -b feature/<name>`).
3. Commit changes (`git commit -m "Add <feature>"`).
4. Push to branch (`git push origin feature/<name>`).
5. Open a Pull Request.

**Issues**:
- Report bugs or suggest features in Issues.
- Include logs (e.g., `failed_uploads.log`) and steps to reproduce.

## License
This project is licensed under the MIT License. See `LICENSE` for details.

---

## Notes
- **Assumptions**:
  - Repository name: `bckend_restro` (update if different).
  - GitHub username: Placeholder (`<your-username>`). Replace with actual.
- **Commit hashes omitted**: Add after pushing changes.
- **Postman Collection**: To be added.
- **Customization**:
  - Placeholders for commit hashes and Cloudinary credentials should be updated.
  - Full API coverage to be extended in documentation.

