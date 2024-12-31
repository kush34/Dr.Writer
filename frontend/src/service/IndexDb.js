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
  store.add(doc);

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
  store.delete(id);
};


export const syncData = async (id)=>{
  const documentToBeUpdated = await getDocument(id)
  // console.log(documentToBeUpdated);
  if(!documentToBeUpdated){
    console.log(`no document sync required`);
    return true;
  } 

  const response = await apiClient.post('/syncDocument',{
    file_id:documentToBeUpdated._id,
    title:documentToBeUpdated.title,
    newContent:documentToBeUpdated.newContent
  })
  console.log(response);
  if(response.status == 200){
    deleteDocument(id)
    return true;
  }
  else{
    console.log(`there was problem in syncing data`);
  }
}

