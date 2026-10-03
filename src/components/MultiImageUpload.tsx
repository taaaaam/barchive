"use client";
import { useState, useRef, useCallback } from "react";
import { processImageFile, validateImageFile } from "@/lib/imageUtils";

// How many images upload to Cloudinary at the same time
const UPLOAD_CONCURRENCY = 4;

async function uploadSingleImage(file: File): Promise<string> {
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
}

interface MultiImageUploadProps {
  onImagesUpload: (imageUrls: string[]) => void;
  disabled?: boolean;
  maxImages?: number; // optional cap on how many images can be added; unlimited by default
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
  maxImages,
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

      if (maxImages && stagedFiles.length + fileArray.length > maxImages) {
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

  // Upload files a few at a time, updating each file's progress entry as it
  // finishes. Returns the URLs of the successful uploads (in selection order)
  // and the indexes of any that failed.
  const uploadAll = useCallback(async (files: File[]) => {
    setUploadProgress(
      files.map((file) => ({ file, progress: 0, status: "uploading" }))
    );
    const urls: (string | null)[] = new Array(files.length).fill(null);
    let next = 0;

    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        try {
          const url = await uploadSingleImage(files[i]);
          urls[i] = url;
          setUploadProgress((prev) =>
            prev.map((p, j) =>
              j === i ? { ...p, progress: 100, status: "completed", url } : p
            )
          );
        } catch (error) {
          console.error(`Upload error for ${files[i].name}:`, error);
          setUploadProgress((prev) =>
            prev.map((p, j) =>
              j === i ? { ...p, status: "error", error: "Upload failed" } : p
            )
          );
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker)
    );

    return {
      uploadedUrls: urls.filter((url): url is string => url !== null),
      failedIndexes: urls.flatMap((url, i) => (url === null ? [i] : [])),
    };
  }, []);

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

      if (maxImages && fileArray.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setError("");
      setUploading(true);

      const { uploadedUrls } = await uploadAll(fileArray);

      if (uploadedUrls.length > 0) {
        onImagesUpload(uploadedUrls);
      }

      setUploading(false);

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    },
    [maxImages, onImagesUpload, stagingMode, stageFiles, uploadAll]
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

    const { uploadedUrls, failedIndexes } = await uploadAll(
      stagedFiles.map((stagedFile) => stagedFile.file)
    );

    if (uploadedUrls.length > 0) {
      onImagesUpload(uploadedUrls);
    }
    // Unstage everything that uploaded; keep failures staged so they can be retried
    const failedIds = new Set(failedIndexes.map((i) => stagedFiles[i].id));
    stagedFiles
      .filter((stagedFile) => !failedIds.has(stagedFile.id))
      .forEach((stagedFile) => URL.revokeObjectURL(stagedFile.preview));
    setStagedFiles((prev) => prev.filter((f) => failedIds.has(f.id)));
    if (failedIndexes.length > 0) {
      setError(
        `${failedIndexes.length} image${failedIndexes.length !== 1 ? "s" : ""} failed to upload. They're still selected below; try uploading again.`
      );
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
        className={`rounded-lg p-8 text-center transition-all duration-300 ${
          isDragOver
            ? "bg-green/5 scale-105"
            : ""
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
              PNG, JPG, GIF, HEIC up to 8MB each
              {maxImages ? ` • Max ${maxImages} images` : ""}
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
                className="relative group bg-white rounded-lg overflow-hidden"
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
              className="bg-white rounded-lg p-3"
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
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
