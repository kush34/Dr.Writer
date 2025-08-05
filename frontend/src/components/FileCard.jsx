import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '@/context/ThemeContext';
const FileCard = ({file}) => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleFileClick = (id)=>{
    navigate(`./${id}`)
  }
  return (
    <div onClick={()=>handleFileClick(file._id)} className={`${theme=='dark' ? "bg-zinc-800 text-white":"bg-zinc-800 text-white"} cursor-pointer p-2 rounded file-title text-sm  w-1/6 flex justify-center duration-300`}>
        {file.title}
    </div>
  )
}

export default FileCard