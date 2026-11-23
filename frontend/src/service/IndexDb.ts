import apiClient from "./axiosConfig";

const dbName = "GoogleDocsClone";
const dbVersion = 1;

export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "_id" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};


export const addDocument = async (doc) => {
    
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  const store = transaction.objectStore("documents");
  await new Promise((resolve, reject) => {
    store.put(doc);
    transaction.oncomplete = () => resolve(undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

};

export const getDocument = async (id) => {
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readonly");
  const store = transaction.objectStore("documents");
  
  return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
  });
};

export const updateDocumentIndexDb = async (doc) => { 
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  const store = transaction.objectStore("documents");
  store.put(doc);
};

export const deleteDocument = async (id) => {
  const db = await openDatabase();
  const transaction = db.transaction("documents", "readwrite");
  const store = transaction.objectStore("documents");
  await new Promise((resolve, reject) => {
    store.delete(id);
    transaction.oncomplete = () => resolve(undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};


export type OfflineDocument = { _id: string; title: string; newContent: any; revision?: number };
export type SyncResult = true | { conflict: OfflineDocument };

/**
 * Pushes an offline copy to the server. Returns `{ conflict }` (and keeps the local copy) when the
 * server document changed since the copy was made, or when the copy has no known base revision.
 * The local copy is only deleted after the server accepted it.
 */
export const syncData = async (id: string): Promise<SyncResult> => {
  const documentToBeUpdated = (await getDocument(id)) as OfflineDocument | undefined
  if(!documentToBeUpdated){
    return true;
  }
  if (!Number.isInteger(documentToBeUpdated.revision)) {
    // Saved before revisions existed: there is no way to tell whether it is stale.
    return { conflict: documentToBeUpdated };
  }

  try {
    await apiClient.post('/document/syncDocument',{
      file_id:documentToBeUpdated._id,
      title:documentToBeUpdated.title,
      newContent:documentToBeUpdated.newContent,
      revision:documentToBeUpdated.revision
    })
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 409) return { conflict: documentToBeUpdated };
    throw error;
  }
  await deleteDocument(id)
  return true;
}
