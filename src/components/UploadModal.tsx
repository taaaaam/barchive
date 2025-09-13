"use client";
import { useState } from "react";
import MultiImageUpload from "./MultiImageUpload";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesUpload: (imageUrls: string[]) => void;
  uploading: boolean;
}

export default function UploadModal({
  isOpen,
  onClose,
  onImagesUpload,
  uploading,
}: UploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImagesUpload = async (imageUrls: string[]) => {
    setIsUploading(true);
    try {
      await onImagesUpload(imageUrls);
      onClose(); // Close modal after successful upload
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-green/20">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-green/20">
            <h2 className="text-2xl font-serif font-bold text-gray-dark">
              Add Photos to Memory
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              disabled={isUploading || uploading}
            >
              <svg
                className="w-6 h-6 text-gray-medium"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <MultiImageUpload
              onImagesUpload={handleImagesUpload}
              disabled={isUploading || uploading}
              maxImages={20}
              stagingMode={true}
            />

            {(isUploading || uploading) && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green border-t-transparent"></div>
                <span className="text-sm text-gray-medium">
                  {isUploading
                    ? "Uploading images..."
                    : "Adding photos to memory..."}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-green/20">
            <button
              onClick={onClose}
              disabled={isUploading || uploading}
              className="px-4 py-2 text-gray-medium hover:text-gray-dark transition-colors duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
