import React, { useEffect, useState } from 'react';
import FileCard from './FileCard';
import apiClient from '@/service/axiosConfig';
import { useContext } from "react";
import { UserContext } from "../context/UserContext";


const Files = () => {
  const [list, setList] = useState([]);
  const { user, loading } = useContext(UserContext);

  const getDocList = async () => {
    try {
      if (user) { 
        const response = await apiClient.get('/document/documentList');
        // console.log(`Document list for display`);
        // console.log(response);
        setList(response.data)
      } else {
        console.error("User is not logged in.");
      }
    } catch (error) {
      console.error("Error fetching document list:", error);
    }
  };

  useEffect(() => {
    if (user) { 
      getDocList(); 
    }
  }, [user]); // Only re-run the effect when the 'user' changes

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;

  return (
    <div className='p-4'>
      <div className='h-[80vh] flex flex-col justify-between'>
        <div className="card-list flex flex-wrap gap-5">
          {list.length>0 ? (list.map((file,index)=>{
              return (
                <FileCard key={index} file={file}/>
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
          Files : {list.length}
        </div>
      </div>
    </div>
  )
}

export default Files;