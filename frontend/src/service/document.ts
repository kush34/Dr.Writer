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