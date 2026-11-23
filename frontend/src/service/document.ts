import apiClient from "@/service/axiosConfig";
import { auth } from "@/firebaseAuth/firebaseConfig";
import { JSONContent } from "@tiptap/core";

export const fetchDocuments = async () => {
  const res = await apiClient.get("/document/documentList");
  return res.data;
};

export const createDocument = async ({ title, kind }: { title: string; kind: "document" | "presentation" }) => {
  const res = await apiClient.post("/document/createDocument", { title, kind });
  return res.data;
};

export const uploadDocument = async (
  formData: FormData,
  onProgress?: (progress: number) => void
) => {
  await auth.authStateReady();

  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to upload a document");
  }

  const token = await user.getIdToken();
  const baseUrl = import.meta.env.VITE_Backend_URL;

  const file = formData.get("file");
  const isPresentation = file instanceof File && /\.pptx$/i.test(file.name);
  if (isPresentation) {
    if (file.size > 6 * 1024 * 1024) throw new Error("Presentation exceeds the 6 MiB limit.");
    const { createServerAutomationHost } = await import("@pptx-editor.dev/core/automation");
    const opened = createServerAutomationHost(new Uint8Array(await file.arrayBuffer()));
    if (!opened.ok) throw new Error("The selected presentation could not be opened.");
    opened.host.dispose();
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${baseUrl}/document/${isPresentation ? "presentationUpload" : "fileUpload"}`);
    xhr.responseType = "json";
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
        return;
      }

      reject(
        new Error(
          xhr.response?.message ||
            xhr.response?.error ||
            "Document upload failed"
        )
      );
    };

    xhr.onerror = () => reject(new Error("Document upload failed"));
    xhr.send(formData);
  });
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
  /** The server revision these edits were based on; a stale one is refused with 409. */
  revision: number
}
/** Saves a text document and returns its new revision. Rejects with a 409 error if it changed meanwhile. */
export const updateDocumentApi = async ({ id, title, content, revision }: Props): Promise<number> => {
  const res = await apiClient.post("/document/documentUpdate", {
    file_id: id,
    title,
    newContent: content,
    revision,
  });
  return res.data.revision;
};

export const isConflictError = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status === 409;

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

export type ShareRole = "editor" | "commenter" | "viewer";
export type DocumentMember = { userId: string; email: string; name?: string; role: "owner" | ShareRole };

export const fetchDocumentMembers = async (documentId: string): Promise<DocumentMember[]> => {
  const res = await apiClient.get(`/document/${documentId}/members`);
  return res.data.members;
};

/** Shares the document, or changes the role of someone it is already shared with. */
export const shareDocument = async (documentId: string, userToAddMail: string, role: ShareRole) => {
  await apiClient.post("/document/adduser", { file_id: documentId, userToAddMail, role });
};

export const removeDocumentMember = async (documentId: string, userId: string) => {
  await apiClient.delete(`/document/${documentId}/users/${userId}`);
};
