# Logic Fruit Backend API

A simple and user-friendly Express.js backend for managing CMS content (Blogs, News, Whitepapers) and storing media assets in **AWS S3** with **MongoDB** as the database.

---

## Features

- **Express.js API**: Fast and clean REST API.
- **MongoDB & Mongoose**: Schema models designed to match the frontend fields.
- **AWS S3 Upload**: Upload images and PDF whitepapers directly to AWS S3.
- **Safe Local Fallback**: If AWS S3 credentials are not set yet, files automatically save to a local `uploads/` folder so you can test right away!
- **Zero Impact on Frontend**: All existing hardcoded frontend content remains untouched.

---

## Getting Started

### 1. Install Dependencies
Open your terminal, go to the `backend` folder, and run:
```bash
cd backend
npm install
```

### 2. Configure Environment (.env)
A `.env` file is already created for you. Open `.env` and fill in your values:

```env
# Server Port
PORT=5000

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/logic_fruit_cms

# AWS S3 Settings
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
```

> **Note**: If you leave the AWS keys blank for now, the backend will automatically store uploaded images in a local `backend/uploads` directory. Once you provide real AWS keys, it will automatically switch to uploading to AWS S3.

### 3. Start the Server
```bash
# Run in development mode with auto-reload:
npm run server

# Or run standard start:
npm start
```

Your server will be running at `http://localhost:5000`.

---

## API Endpoints Summary

### Health Check
- `GET /api/health` - Check if server, database, and storage are working.

### File Uploads (Images & PDFs)
- `POST /api/upload/image` (form-data: `image`) - Uploads a single image (JPG, PNG, WebP, SVG).
- `POST /api/upload/pdf` (form-data: `pdf`) - Uploads a whitepaper PDF file.
- `POST /api/upload/multiple` (form-data: `images`) - Uploads multiple images.

### Blogs CMS
- `GET /api/blogs` - Get all published blogs (can filter with `?category=fpga`).
- `GET /api/blogs/:slug` - Get a single blog by slug or ID.
- `POST /api/blogs` - Create a new blog post.
- `PUT /api/blogs/:id` - Update a blog post.
- `DELETE /api/blogs/:id` - Delete a blog post.

### News CMS
- `GET /api/news` - Get all published news items.
- `GET /api/news/:slug` - Get a single news item by slug or ID.
- `POST /api/news` - Create a new news item.
- `PUT /api/news/:id` - Update a news item.
- `DELETE /api/news/:id` - Delete a news item.

### Whitepapers CMS
- `GET /api/whitepapers` - Get all published whitepapers.
- `GET /api/whitepapers/:slug` - Get a single whitepaper by slug or ID.
- `POST /api/whitepapers` - Create a new whitepaper.
- `PUT /api/whitepapers/:id` - Update a whitepaper.
- `DELETE /api/whitepapers/:id` - Delete a whitepaper.

---

## Folder Structure

```
backend/
├── .env                 # Environment variables
├── .env.example         # Example configuration reference
├── .gitignore           # Git ignore file
├── package.json         # Project dependencies
├── README.md            # Documentation
└── src/
    ├── server.js        # Main Express server file
    ├── config/
    │   ├── db.js        # MongoDB connection
    │   └── s3.js        # AWS S3 upload helper & local fallback
    ├── middleware/
    │   ├── errorHandler.js # Simple error handling
    │   └── upload.js       # Multer upload settings
    ├── models/
    │   ├── Blog.js       # Blog schema
    │   ├── News.js       # News schema
    │   └── Whitepaper.js # Whitepaper schema
    └── routes/
        ├── blogRoutes.js       # Blog endpoints
        ├── newsRoutes.js       # News endpoints
        ├── uploadRoutes.js     # Upload endpoints
        └── whitepaperRoutes.js # Whitepaper endpoints
```
