import { cloudinary } from '../config/cloudinary.js';
import { ApiError } from '../utils/apiError.js';

export const uploadImageBuffer = (file, folder = 'restaurant-system') =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new ApiError(400, 'No file uploaded'));
      return;
    }

    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) {
        reject(new ApiError(502, 'Cloudinary upload failed', error.message));
        return;
      }
      resolve(result);
    });

    stream.end(file.buffer);
  });
