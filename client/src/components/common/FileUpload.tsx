import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { uploadToCloudinary } from '../../utils/cloudinary';

interface FileUploadProps {
  label?: string;
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Upload Document / Receipt',
  currentUrl,
  onUploadSuccess,
  onRemove,
  accept = 'image/*,application/pdf',
  maxSizeMB = 10
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds maximum limit of ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadToCloudinary(file, {
        onProgress: (pct) => setProgress(pct),
        maxSizeBytes: maxSizeMB * 1024 * 1024
      });
      onUploadSuccess(result.secure_url);
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-textMuted">{label}</label>}

      {currentUrl ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-glass">
          <div className="flex items-center gap-3 overflow-hidden">
            {currentUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
              <img src={currentUrl} alt="Upload preview" className="w-10 h-10 object-cover rounded-lg shrink-0 border border-glass" />
            ) : (
              <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
                <FileText size={20} />
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-textMain truncate">File Attached</p>
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline truncate block"
              >
                View Attachment ↗
              </a>
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-textMuted hover:text-red-400 p-1.5 rounded-lg transition-colors"
              title="Remove attachment"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative border-2 border-dashed border-glass hover:border-primary/50 transition-colors rounded-xl p-4 text-center cursor-pointer group bg-background/30">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <>
                <Loader2 size={24} className="text-primary animate-spin" />
                <p className="text-xs text-primary font-medium">Uploading to Cloudinary ({progress}%)...</p>
                <div className="w-36 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </>
            ) : (
              <>
                <Upload size={20} className="text-textMuted group-hover:text-primary transition-colors" />
                <div>
                  <p className="text-xs font-medium text-textMain">Click or drag file here</p>
                  <p className="text-[10px] text-textMuted mt-0.5">Images or PDF up to {maxSizeMB}MB</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
