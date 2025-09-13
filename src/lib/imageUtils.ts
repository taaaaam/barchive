import convert from "heic-convert";

/**
 * Check if a file is a HEIC/HEIF image
 */
export function isHEICFile(file: File): boolean {
  const heicTypes = [
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
  ];

  return (
    heicTypes.includes(file.type.toLowerCase()) ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

/**
 * Convert HEIC file to JPEG
 */
export async function convertHEICToJPEG(file: File): Promise<File> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const jpegBuffer = await convert({
      buffer: arrayBuffer,
      format: "JPEG",
      quality: 0.9, // High quality conversion
    });

    // Create a new File object with JPEG MIME type
    const blob = new Blob([jpegBuffer], { type: "image/jpeg" });
    const jpegFile = new File(
      [blob],
      file.name.replace(/\.(heic|heif)$/i, ".jpg"),
      {
        type: "image/jpeg",
        lastModified: file.lastModified,
      }
    );

    return jpegFile;
  } catch (error) {
    console.error("Error converting HEIC to JPEG:", error);
    throw new Error(
      "Failed to convert HEIC image. Please try uploading a different image format."
    );
  }
}

/**
 * Process image file - convert HEIC to JPEG if needed, otherwise return original
 */
export async function processImageFile(file: File): Promise<File> {
  if (isHEICFile(file)) {
    console.log("Converting HEIC file to JPEG:", file.name);
    return await convertHEICToJPEG(file);
  } else {
    console.log("Not a HEIC file, returning original file:", file.name);
  }
  return file;
}

/**
 * Validate image file (size, type, etc.)
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 8
): string | null {
  // Check if it's an image file (including HEIC)
  const validImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  const isValidType =
    validImageTypes.includes(file.type.toLowerCase()) ||
    file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/);

  if (!isValidType) {
    return "Please select a valid image file (JPEG, PNG, GIF, WebP, or HEIC)";
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    console.log("Image is too large", file.size, maxSizeBytes, maxSizeMB);
    return `Image must be smaller than ${maxSizeMB}MB`;
  }

  return null; // No errors
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractCloudinaryPublicId(url: string): string | null {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    // or: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
    const match = url.match(
      /\/upload\/(?:v\d+\/)?(.+?)\.(jpg|jpeg|png|gif|webp|heic|heif)$/i
    );
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting Cloudinary public ID:", error);
    return null;
  }
}

/**
 * Delete image from Cloudinary
 */
export async function deleteCloudinaryImage(
  publicId: string
): Promise<boolean> {
  try {
    const response = await fetch("/api/delete-cloudinary-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to delete image:", errorData);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}
