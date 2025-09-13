"use client";
import { useState, useRef } from "react";
import { processImageFile, validateImageFile } from "@/lib/imageUtils";

interface ProfileImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  onImageRemove: () => void;
  currentImage?: string;
  disabled?: boolean;
}

export default function ProfileImageUpload({
  onImageUpload,
  onImageRemove,
  currentImage,
  disabled = false,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    console.log("File selected:", file.name);

    // Validate file
    const validationError = validateImageFile(file, 8);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);

    try {
      // Process image file (convert HEIC to JPEG if needed)
      const processedFile = await processImageFile(file);

      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", processedFile);
      formData.append("upload_preset", "baR_blog");
      formData.append("folder", "baR-blog");

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onImageUpload(data.secure_url);
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-dark mb-2">
        Profile Picture
      </label>

      {currentImage ? (
        <div className="space-y-3">
          <div className="relative w-48 h-48">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green/20">
              <img
                src={currentImage}
                alt="Profile picture"
                className="w-full h-full object-cover"
              />
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg border-2 border-white"
              >
                <svg
                  className="w-4 h-4"
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
            )}
          </div>
          <p className="text-sm text-gray-medium text-center">
            Image uploaded successfully! Click the X to remove.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className={`w-48 h-48 border-2 border-dashed border-green/30 rounded-full flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-green/50 hover:bg-green/5"
            }`}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-green/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-gray-dark font-medium text-sm">
                  {uploading ? "Uploading..." : "Click to upload"}
                </p>
                <p className="text-xs text-gray-medium">
                  PNG, JPG, GIF, HEIC up to 8MB
                </p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />

          {uploading && (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-green border-t-transparent"></div>
              <span className="text-sm text-gray-medium">
                Uploading image...
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
