import apiClient from "@/service/axiosConfig";
import { JSONContent } from "@tiptap/core";

export const fetchDocuments = async () => {
  const res = await apiClient.get("/document/documentList");
  return res.data;
};

export const createDocument = async (title: string) => {
  const res = await apiClient.post("/document/createDocument", { title });
  return res.data;
};

export const uploadDocument = async (formData: any) => {
  const res = await apiClient.post("/document/fileUpload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};


export const fetchDocumentData = async (id: string) => {
  const res = await apiClient.post("/document/documentData", {
    file_id: id,
  });
  return res.data;
};

type Props = {
  id: string
  title: string
  content: JSONContent
}
export const updateDocumentApi = async ({ id, title, content }: Props) => {
  await apiClient.post("/document/documentUpdate", {
    file_id: id,
    title,
    newContent: content,
  });
};

export const getChatsForDocument = async (documentId: string) => {
  const res = await apiClient.get(`/document/getChats/${documentId}`)
  return res.data
}

export const getUserInfo = async ()=>{
  const res = await apiClient.get("/user");
  return res.data;
};

export const uploadDocumentImage = async (
  documentId: string,
  file: File,
  onProgress?: (event: { progress: number }) => void,
  signal?: AbortSignal
) => {
  const signatureRes = await apiClient.post(`/document/${documentId}/images/sign`, {
    originalName: file.name,
  });

  const {
    timestamp,
    folder,
    publicId,
    signature,
    apiKey,
    cloudName,
  } = signatureRes.data as {
    timestamp: number;
    folder: string;
    publicId: string;
    signature: string;
    apiKey: string;
    cloudName: string;
  };

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const uploadedImage = await new Promise<{
    public_id: string;
    secure_url: string;
    bytes: number;
    format?: string;
    width?: number;
    height?: number;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.({
        progress: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
        return;
      }

      reject(new Error(xhr.response?.error?.message || "Cloudinary upload failed"));
    };

    xhr.onerror = () => reject(new Error("Cloudinary upload failed"));

    if (signal) {
      const abortUpload = () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      };

      if (signal.aborted) {
        abortUpload();
        return;
      }

      signal.addEventListener("abort", abortUpload, { once: true });
    }

    xhr.send(formData);
  });

  const registerRes = await apiClient.post(`/document/${documentId}/images/register`, {
    publicId: uploadedImage.public_id,
    url: uploadedImage.secure_url,
    originalName: file.name,
    bytes: uploadedImage.bytes,
    format: uploadedImage.format,
    width: uploadedImage.width,
    height: uploadedImage.height,
  });

  return registerRes.data.image.url as string;
};
