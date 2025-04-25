import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { StatusCodes } from 'http-status-codes';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

// File filter for images
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new AppError('Only image files are allowed', StatusCodes.BAD_REQUEST));
  }
  
  cb(null, true);
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE, // Default 10MB
  },
});

// Middleware for handling single image upload
export const uploadImage = upload.single('image');

// Middleware for handling multiple image uploads (max 5)
export const uploadImages = upload.array('images', 5);

// Error handler for multer errors
export const handleUploadErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = StatusCodes.BAD_REQUEST;
    
    // Handle specific multer errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File size exceeds the limit of ${env.MAX_FILE_SIZE / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name in upload';
        break;
      default:
        message = err.message;
    }
    
    return res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
    });
  }
  
  // Pass other errors to the main error handler
  next(err);
}; 