# Logic Fruit Backend API

A simple, user-friendly Express.js backend for managing CMS content (Blogs, News, Whitepapers, Products, Jobs) and storing media assets in **AWS S3** with **AWS DynamoDB** as the database.

---

## Features

- **Express.js API**: Fast and clean REST API.
- **AWS DynamoDB**: Serverless NoSQL database (On-Demand / zero idle cost, covered by AWS Free Tier).
- **AWS S3 Upload**: Upload images and PDF whitepapers directly to AWS S3.
- **Safe Local Fallback**: If AWS S3 credentials are not set, files automatically save to a local `uploads/` folder for testing.
- **Zero Impact on Frontend**: All existing frontend components and fields remain 100% compatible.

---

## Getting Started

### 1. Install Dependencies
Open your terminal, go to the `backend` folder, and run:
```bash
cd backend
npm install
```

### 2. Configure Environment (.env)
A `.env` file is already configured for you:

```env
# Server Port
PORT=5000

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173

# Database Settings (AWS DynamoDB)
DYNAMODB_TABLE_NAME=logicfruit_cms

# AWS S3 & DynamoDB Settings
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token_if_temporary
AWS_S3_BUCKET_NAME=logicfruit-cms-assets-833823555826
```

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
- `GET /api/health` - Check server, DynamoDB database, and S3 storage status.

### File Uploads (Images & PDFs)
- `POST /api/upload/image` (form-data: `image`) - Uploads a single image (JPG, PNG, WebP, SVG).
- `POST /api/upload/pdf` (form-data: `pdf`) - Uploads a whitepaper PDF file.
- `POST /api/upload/multiple` (form-data: `images`) - Uploads multiple images.

### Blogs CMS
- `GET /api/blogs` - Get all published blogs (supports `?category=...`).
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

### Products CMS
- `GET /api/products` - Get all products (supports `?type=...`).
- `GET /api/products/:slug` - Get a single product by slug or ID.
- `POST /api/products` - Create a new product.
- `PUT /api/products/:id` - Update a product.
- `DELETE /api/products/:id` - Delete a product.

### Jobs CMS
- `GET /api/jobs` - Get all job openings (supports `?department=...`).
- `GET /api/jobs/:slug` - Get a single job opening by slug or ID.
- `POST /api/jobs` - Create a new job opening.
- `PUT /api/jobs/:id` - Update a job opening.
- `DELETE /api/jobs/:id` - Delete a job opening.

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
    │   ├── db.js        # Database connection checker
    │   ├── dynamo.js    # AWS DynamoDB client
    │   └── s3.js        # AWS S3 upload helper & local fallback
    ├── middleware/
    │   ├── errorHandler.js # Simple error handling
    │   └── upload.js       # Multer upload settings
    ├── services/
    │   └── dynamoService.js# DynamoDB CRUD service
    └── routes/
        ├── blogRoutes.js       # Blog endpoints
        ├── newsRoutes.js       # News endpoints
        ├── whitepaperRoutes.js # Whitepaper endpoints
        ├── productRoutes.js    # Product endpoints
        ├── jobRoutes.js        # Career job endpoints
        └── uploadRoutes.js     # S3 Upload endpoints
```
