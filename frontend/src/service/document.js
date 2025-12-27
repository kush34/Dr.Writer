import apiClient from "@/service/axiosConfig";

export const fetchDocuments = async () => {
  const res = await apiClient.get("/document/documentList");
  return res.data;
};

export const createDocument = async (title) => {
  const res = await apiClient.post("/document/createDocument", { title });
  return res.data;
};

export const uploadDocument = async (formData) => {
  const res = await apiClient.post("/document/fileUpload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};


export const fetchDocumentData = async (id) => {
  const res = await apiClient.post("/document/documentData", {
    file_id: id,
  });
  return res.data;
};

export const updateDocumentApi = async ({ id, title, content }) => {
  await apiClient.post("/document/documentUpdate", {
    file_id: id,
    title,
    newContent: content,
  });
};

export const getChatsForDocument = async(documentId)=>{
  const res = await apiClient.get(`/document/getChats/${documentId}`)
  return res.data
}