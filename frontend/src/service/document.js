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
