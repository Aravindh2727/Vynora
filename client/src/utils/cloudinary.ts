/**
 * Cloudinary Unsigned Upload Utility
 * Handles client-side direct uploads to Cloudinary without exposing API secrets.
 * Uses VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.
 */

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  original_filename: string;
  created_at?: string;
}

export interface UploadOptions {
  onProgress?: (progressPercent: number) => void;
  maxSizeBytes?: number; // Default 10MB
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function uploadToCloudinary(
  file: File,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const maxSizeBytes = options.maxSizeBytes || 10 * 1024 * 1024; // 10MB
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;

  // 1. Client-Side Validation
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum permitted size of ${maxMB} MB.`);
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    // Check extension for documents whose MIME types may vary across OS
    const ext = file.name.split('.').pop()?.toLowerCase();
    const commonValidExts = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'pdf', 'txt', 'doc', 'docx'];
    if (!ext || !commonValidExts.includes(ext)) {
      throw new Error(`File type "${file.type || ext}" is not supported. Please upload an image, PDF, or document.`);
    }
  }

  // 2. Unsigned Upload to Cloudinary API
  if (!cloudName || !uploadPreset || cloudName === 'your_cloud_name') {
    console.warn(
      'VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET is not configured in .env. Generating local data URL preview.'
    );
    // Provide a resilient base64 fallback for offline/preview mode
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          secure_url: reader.result as string,
          public_id: `local_${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
          format: file.name.split('.').pop() || 'dat',
          bytes: file.size,
          original_filename: file.name
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.url,
            secure_url: data.secure_url,
            public_id: data.public_id,
            format: data.format || file.name.split('.').pop() || '',
            bytes: data.bytes || file.size,
            original_filename: data.original_filename || file.name,
            created_at: data.created_at
          });
        } catch (err: any) {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error?.message || `Cloudinary upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Cloudinary upload failed with HTTP status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred while uploading to Cloudinary.'));
    };

    xhr.send(formData);
  });
}
