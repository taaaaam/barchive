// Cloudinary utility functions

/**
 * Upload a PDF file to Cloudinary
 * @param file - The PDF file to upload
 * @param folder - Optional folder name (defaults to 'newsletters')
 * @returns Promise<string> - The secure URL of the uploaded PDF
 */
export async function uploadPDF(
  file: File,
  folder: string = "newsletters"
): Promise<string> {
  // Log file details for debugging
  console.log("📄 Uploading PDF:", {
    fileName: file.name,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    fileType: file.type,
    folder: folder,
  });

  // Check if Cloudinary cloud name is configured
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.error("❌ Cloudinary cloud name is not configured!");
    throw new Error(
      "Cloudinary configuration error: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set"
    );
  }

  // Get upload preset from environment variable or use default
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "newsletters";
  
  if (!uploadPreset) {
    console.error("❌ Upload preset is not configured!");
    throw new Error(
      "Cloudinary configuration error: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is not set and no default preset specified"
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  console.log("🔗 Upload URL:", uploadUrl);
  console.log("📋 Upload preset:", uploadPreset);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    // Get response text first to see what we're dealing with
    const responseText = await response.text();
    console.log("📥 Response status:", response.status, response.statusText);
    console.log("📥 Response body:", responseText);

    if (!response.ok) {
      let errorMessage = `Failed to upload PDF: ${response.status} ${response.statusText}`;
      
      // Try to parse error details from response
      try {
        const errorData = JSON.parse(responseText);
        console.error("❌ Cloudinary error details:", errorData);
        
        if (errorData.error) {
          errorMessage = `Cloudinary Error: ${errorData.error.message || JSON.stringify(errorData.error)}`;
        } else {
          errorMessage = `Cloudinary Error: ${JSON.stringify(errorData)}`;
        }
      } catch (parseError) {
        // If response isn't JSON, use the raw text
        console.error("❌ Non-JSON error response:", responseText);
        errorMessage = `Failed to upload PDF: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 200)}`;
      }

      throw new Error(errorMessage);
    }

    const data = JSON.parse(responseText);
    console.log("✅ Upload successful! URL:", data.secure_url);
    return data.secure_url;
  } catch (error: any) {
    // Enhanced error logging
    console.error("❌ Upload error details:", {
      message: error.message,
      stack: error.stack,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    throw error;
  }
}

/**
 * Extract the public ID from a Cloudinary URL
 * @param url - The Cloudinary URL (e.g., https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image.jpg)
 * @returns The public ID (e.g., folder/image)
 */
export function extractPublicId(url: string): string | null {
  try {
    // Match Cloudinary URL pattern
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
}

/**
 * Delete an image or raw file from Cloudinary using our API route
 * @param publicId - The public ID of the file to delete
 * @param resourceType - The resource type: "image" (default) or "raw" for PDFs
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function deleteCloudinaryImage(
  publicId: string,
  resourceType: "image" | "raw" = "image"
): Promise<boolean> {
  try {
    const response = await fetch("/api/delete-cloudinary-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId, resourceType }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary delete error:", errorData);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
}

/**
 * Delete multiple images from Cloudinary
 * @param urls - Array of Cloudinary URLs to delete
 * @returns Promise<{success: number, failed: number}>
 */
export async function deleteCloudinaryImages(
  urls: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const url of urls) {
    const publicId = extractPublicId(url);
    if (publicId) {
      const deleted = await deleteCloudinaryImage(publicId);
      if (deleted) {
        success++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  return { success, failed };
}
