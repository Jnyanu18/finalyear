function extractBase64Payload(input) {
  if (!input) return null;
  return input.includes(",") ? input.split(",")[1] : input;
}

export async function uploadImageToCloud(imageData, mimeType = "image/jpeg") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  const payload = extractBase64Payload(imageData);
  if (!payload) return { url: "", provider: "none" };

  // If Cloudinary is not configured, keep data URI so analysis is still persisted.
  if (!cloudName || !apiKey || !apiSecret) {
    return { url: `data:${mimeType};base64,${payload}`, provider: "inline" };
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=agrinexus/crops&timestamp=${timestamp}${apiSecret}`;

  const { createHash } = await import("crypto");
  const signature = createHash("sha1").update(paramsToSign).digest("hex");

  const form = new FormData();
  form.append("file", `data:${mimeType};base64,${payload}`);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", "agrinexus/crops");

  const response = await fetch(endpoint, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    throw new Error(`Cloudinary upload failed (${response.status})`);
  }

  const data = await response.json();
  return {
    url: data.secure_url || data.url || "",
    provider: "cloudinary"
  };
}
