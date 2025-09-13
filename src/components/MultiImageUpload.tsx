"use client";
import { useState, useRef, useCallback } from "react";
import { processImageFile, validateImageFile } from "@/lib/imageUtils";

interface MultiImageUploadProps {
  onImagesUpload: (imageUrls: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
  stagingMode?: boolean; // New prop to enable staging mode
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
  error?: string;
}

interface StagedFile {
  file: File;
  preview: string;
  id: string;
}

export default function MultiImageUpload({
  onImagesUpload,
  disabled = false,
  maxImages = 20,
  stagingMode = false,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    return validateImageFile(file, 8);
  };

  // Helper function to create preview URL for staged files
  const createPreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  // Helper function to stage files instead of uploading immediately
  const stageFiles = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);

      // Validate all files first
      const validationErrors: string[] = [];
      fileArray.forEach((file, index) => {
        const error = validateFile(file);
        if (error) {
          validationErrors.push(`File ${index + 1}: ${error}`);
        }
      });

      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        return;
      }

      if (stagedFiles.length + fileArray.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setError("");

      // Create staged file objects with previews
      const newStagedFiles: StagedFile[] = fileArray.map((file) => ({
        file,
        preview: createPreviewUrl(file),
        id: Math.random().toString(36).substr(2, 9),
      }));

      setStagedFiles((prev) => [...prev, ...newStagedFiles]);
    },
    [stagedFiles.length, maxImages]
  );

  // Helper function to remove a staged file
  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // Helper function to clear all staged files
  const clearStagedFiles = () => {
    stagedFiles.forEach((stagedFile) => {
      URL.revokeObjectURL(stagedFile.preview);
    });
    setStagedFiles([]);
  };

  const uploadSingleImage = async (file: File): Promise<string> => {
    // Process image file (convert HEIC to JPEG if needed)
    const processedFile = await processImageFile(file);

    const formData = new FormData();
    formData.append("file", processedFile);
    formData.append("upload_preset", "baR_blog");
    formData.append("folder", "baR-blog");

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
    return data.secure_url;
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      if (stagingMode) {
        // In staging mode, just stage the files
        stageFiles(files);
        return;
      }

      // Original immediate upload logic
      const fileArray = Array.from(files);

      // Validate all files first
      const validationErrors: string[] = [];
      fileArray.forEach((file, index) => {
        const error = validateFile(file);
        if (error) {
          validationErrors.push(`File ${index + 1}: ${error}`);
        }
      });

      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        return;
      }

      if (fileArray.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setError("");
      setUploading(true);

      // Initialize progress tracking
      const initialProgress: UploadProgress[] = fileArray.map((file) => ({
        file,
        progress: 0,
        status: "uploading",
      }));
      setUploadProgress(initialProgress);

      const uploadedUrls: string[] = [];
      const completedProgress: UploadProgress[] = [];

      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          const url = await uploadSingleImage(file);
          uploadedUrls.push(url);

          // Update progress for this file
          const updatedProgress = [...completedProgress];
          updatedProgress.push({
            file,
            progress: 100,
            status: "completed",
            url,
          });
          setUploadProgress(updatedProgress);
          completedProgress.push({
            file,
            progress: 100,
            status: "completed",
            url,
          });
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error);
          const updatedProgress = [...completedProgress];
          updatedProgress.push({
            file,
            progress: 0,
            status: "error",
            error: "Upload failed",
          });
          setUploadProgress(updatedProgress);
          completedProgress.push({
            file,
            progress: 0,
            status: "error",
            error: "Upload failed",
          });
        }
      }

      if (uploadedUrls.length > 0) {
        onImagesUpload(uploadedUrls);
      }

      setUploading(false);

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    },
    [maxImages, onImagesUpload, stagingMode, stageFiles]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  // Function to upload all staged files
  const uploadStagedFiles = async () => {
    if (stagedFiles.length === 0) return;

    setUploading(true);
    setError("");

    // Initialize progress tracking
    const initialProgress: UploadProgress[] = stagedFiles.map((stagedFile) => ({
      file: stagedFile.file,
      progress: 0,
      status: "uploading",
    }));
    setUploadProgress(initialProgress);

    const uploadedUrls: string[] = [];
    const completedProgress: UploadProgress[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < stagedFiles.length; i++) {
      const stagedFile = stagedFiles[i];
      try {
        const url = await uploadSingleImage(stagedFile.file);
        uploadedUrls.push(url);

        // Update progress for this file
        const updatedProgress = [...completedProgress];
        updatedProgress.push({
          file: stagedFile.file,
          progress: 100,
          status: "completed",
          url,
        });
        setUploadProgress(updatedProgress);
        completedProgress.push({
          file: stagedFile.file,
          progress: 100,
          status: "completed",
          url,
        });
      } catch (error) {
        console.error(`Upload error for ${stagedFile.file.name}:`, error);
        const updatedProgress = [...completedProgress];
        updatedProgress.push({
          file: stagedFile.file,
          progress: 0,
          status: "error",
          error: "Upload failed",
        });
        setUploadProgress(updatedProgress);
        completedProgress.push({
          file: stagedFile.file,
          progress: 0,
          status: "error",
          error: "Upload failed",
        });
      }
    }

    if (uploadedUrls.length > 0) {
      onImagesUpload(uploadedUrls);
      // Clear staged files after successful upload
      clearStagedFiles();
    }

    setUploading(false);

    // Clear progress after a delay
    setTimeout(() => {
      setUploadProgress([]);
    }, 3000);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-dark mb-2">
        {stagingMode ? "Select Images to Upload" : "Upload Multiple Images"}
      </label>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          isDragOver
            ? "border-green bg-green/5 scale-105"
            : "border-green/30 hover:border-green/50"
        } ${
          disabled || uploading
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:bg-green/5"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-gray-dark font-medium text-lg">
              {uploading ? "Uploading images..." : "Drag & drop images here"}
            </p>
            <p className="text-sm text-gray-medium mt-2">
              or click to select multiple images
            </p>
            <p className="text-xs text-gray-medium mt-1">
              PNG, JPG, GIF, HEIC up to 5MB each • Max {maxImages} images
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* Staged Files Preview */}
      {stagingMode && stagedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-dark">
              Selected Images ({stagedFiles.length})
            </h4>
            <button
              onClick={clearStagedFiles}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stagedFiles.map((stagedFile) => (
              <div
                key={stagedFile.id}
                className="relative group bg-white rounded-lg border border-green/20 overflow-hidden"
              >
                <div className="aspect-square relative">
                  <img
                    src={stagedFile.preview}
                    alt={stagedFile.file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeStagedFile(stagedFile.id)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  >
                    <svg
                      className="w-3 h-3"
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
                <div className="p-2">
                  <p className="text-xs text-gray-600 truncate">
                    {stagedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(stagedFile.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={uploadStagedFiles}
              disabled={uploading || stagedFiles.length === 0}
              className="px-8 py-3 bg-green text-white font-semibold rounded-lg hover:bg-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {uploading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                `Upload ${stagedFiles.length} Image${
                  stagedFiles.length !== 1 ? "s" : ""
                }`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-dark">
            Upload Progress (
            {uploadProgress.filter((p) => p.status === "completed").length}/
            {uploadProgress.length})
          </h4>
          {uploadProgress.map((progress, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-green/20 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-dark truncate">
                  {progress.file.name}
                </span>
                <span className="text-xs text-gray-medium">
                  {progress.status === "completed" && "✓"}
                  {progress.status === "error" && "✗"}
                  {progress.status === "uploading" && "⏳"}
                </span>
              </div>
              {progress.status === "uploading" && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
              )}
              {progress.status === "error" && (
                <p className="text-xs text-red-600">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
