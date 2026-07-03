import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadImageBuffer } from '../services/upload.service.js';

export const uploadReceipt = asyncHandler(async (req, res) => {
  const result = await uploadImageBuffer(req.file, 'restaurant-system/receipts');
  res.status(201).json({ url: result.secure_url, publicId: result.public_id });
});
