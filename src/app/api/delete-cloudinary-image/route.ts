import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { publicId, resourceType = "image" } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing Cloudinary credentials" },
        { status: 500 }
      );
    }

    // Create signature for authentication
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(params).digest("hex");

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    // Use the appropriate resource type (image, raw, video, etc.)
    const resourceEndpoint = resourceType === "raw" ? "raw" : "image";
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceEndpoint}/destroy`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary delete error:", errorData);
      return NextResponse.json(
        { error: `Failed to delete ${resourceType}` },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (result.result === "ok") {
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json(
        { error: `${resourceType} deletion failed` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in delete-cloudinary-image API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
