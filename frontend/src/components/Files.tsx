import { useQuery } from "@tanstack/react-query";
import { fetchDocuments } from "@/service/document.js";
import FileCard, { tFile } from "./FileCard";
import Loader from "@/components/loaders/Loader"
import { useUser } from "@/context/UserContext";


const Files = () => {
  const { user, loading } = useUser();
  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    enabled: !loading && !!user,
  });

  // if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Something broke</div>;

  return (
    <div className='p-4'>
      {
        isLoading ?
          (
            <div className='flex justify-center items-center w-full h-screen'>
              <Loader />
            </div>
          )
          :
          (
            <div className='h-[80vh] flex flex-col justify-between'>
              <div className="card-list flex flex-wrap gap-5">
                {Array.isArray(data?.documents) && data.documents.length > 0 ? (data.documents.map((file: tFile, index: number) => {
                  return (
                    <FileCard key={index} file={file} />
                  );
                }))
                  :
                  (
                    <div>
                      No file present
                    </div>
                  )
                }
              </div>
              <div className='text-zinc-500'>
                Files : {Array.isArray(data?.documents) && data.documents.length}
              </div>
            </div>
          )
      }
    </div>
  );
};

export default Files;
