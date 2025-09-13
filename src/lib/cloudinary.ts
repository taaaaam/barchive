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
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "newsletters");
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload PDF: ${response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
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
 * Delete an image from Cloudinary using our API route
 * @param publicId - The public ID of the image to delete
 * @returns Promise<boolean> - true if successful, false otherwise
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
