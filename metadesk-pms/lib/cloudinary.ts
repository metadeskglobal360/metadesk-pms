import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  size: number;
}

export async function uploadFile(
  file: Buffer,
  originalName: string,
  mimeType: string,
  projectId: string
): Promise<UploadResult> {
  const isImage = mimeType.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";

  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `metadesk-pms/projects/${projectId}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(file);
  });

  const fileType = isImage
    ? "image"
    : mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")
    ? "document"
    : mimeType.includes("zip") || mimeType.includes("archive")
    ? "archive"
    : "other";

  return {
    url: result.secure_url,
    publicId: result.public_id,
    fileName: result.original_filename,
    fileType,
    mimeType,
    size: result.bytes,
  };
}

export async function deleteFile(publicId: string, isImage: boolean = false) {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: isImage ? "image" : "raw",
  });
}

export default cloudinary;
