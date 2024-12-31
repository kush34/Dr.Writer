import React from 'react'
import { useNavigate } from 'react-router-dom';

const FileCard = ({file}) => {
  const navigate = useNavigate();

  const handleFileClick = (id)=>{
    navigate(`./${id}`)
  }
  return (
    <div onClick={()=>handleFileClick(file._id)} className="p-2 rounded file-title text-sm bg-zinc-300 w-1/6 flex justify-center hover:bg-zinc-900  duration-300 hover:text-white ease-out">
        {file.title}
    </div>
  )
}

export default FileCard