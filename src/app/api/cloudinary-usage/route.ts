import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log("Cloudinary credentials check:", {
      cloudName: cloudName ? "✓ Set" : "✗ Missing",
      apiKey: apiKey ? "✓ Set" : "✗ Missing",
      apiSecret: apiSecret ? "✓ Set" : "✗ Missing",
    });

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials not configured" },
        { status: 500 }
      );
    }

    // Fetch usage statistics from Cloudinary Admin API
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/usage`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${apiKey}:${apiSecret}`
          ).toString("base64")}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Cloudinary API error:",
        response.status,
        response.statusText,
        errorText
      );
      throw new Error(`Cloudinary API error: ${response.statusText}`);
    }

    const usageData = await response.json();
    console.log(
      "Raw Cloudinary usage data:",
      JSON.stringify(usageData, null, 2)
    );

    // Handle different response structures for free vs paid plans
    let storageUsedBytes = 0;
    let storageLimitBytes = 0;
    let objectsUsed = 0;
    let objectsLimit = 0;
    let bandwidthUsed = 0;
    let bandwidthLimit = 0;
    let planName = "Free";

    // Check if it's a paid plan structure
    if (usageData.plan && usageData.plan.storage) {
      // Paid plan structure
      storageUsedBytes = usageData.plan.storage.used || 0;
      storageLimitBytes = usageData.plan.storage.limit || 0;
      objectsUsed = usageData.plan.objects?.used || 0;
      objectsLimit = usageData.plan.objects?.limit || 0;
      bandwidthUsed = usageData.plan.bandwidth?.used || 0;
      bandwidthLimit = usageData.plan.bandwidth?.limit || 0;
      planName = usageData.plan.name || "Paid Plan";
    } else {
      // Free plan structure - extract from raw data
      // Free plans use 'usage' instead of 'used'
      storageUsedBytes = usageData.storage?.usage || 0;
      objectsUsed = usageData.objects?.usage || 0;
      bandwidthUsed = usageData.bandwidth?.usage || 0;

      // Free plan limits (Cloudinary free plan limits)
      storageLimitBytes = 25 * 1024 * 1024 * 1024; // 25GB free plan limit
      objectsLimit = 100000; // 100k objects free plan limit
      bandwidthLimit = 25 * 1024 * 1024 * 1024; // 25GB bandwidth free plan limit
    }

    // Calculate storage usage in MB and GB
    const storageUsedMB =
      Math.round((storageUsedBytes / (1024 * 1024)) * 100) / 100;
    const storageLimitMB =
      Math.round((storageLimitBytes / (1024 * 1024)) * 100) / 100;
    const storageUsedGB = Math.round((storageUsedMB / 1024) * 100) / 100;
    const storageLimitGB = Math.round((storageLimitMB / 1024) * 100) / 100;

    const storagePercentage =
      storageLimitBytes > 0
        ? Math.round((storageUsedBytes / storageLimitBytes) * 100)
        : 0;

    return NextResponse.json({
      storage: {
        used: storageUsedBytes,
        limit: storageLimitBytes,
        usedMB: storageUsedMB,
        limitMB: storageLimitMB,
        usedGB: storageUsedGB,
        limitGB: storageLimitGB,
        percentage: storagePercentage,
      },
      plan: planName,
      objects: {
        used: objectsUsed,
        limit: objectsLimit,
      },
      bandwidth: {
        used: bandwidthUsed,
        limit: bandwidthLimit,
      },
      rawData: usageData, // Include raw data for debugging
    });
  } catch (error) {
    console.error("Error fetching Cloudinary usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
