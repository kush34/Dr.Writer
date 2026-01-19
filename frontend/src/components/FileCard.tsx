import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';

type tFile = {
  _id: string
  title: string
}
const FileCard = ({ file }: { file: tFile }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleFileClick = (id: string) => {
    navigate(`./${id}`)
  }
  return (
    <div onClick={() => handleFileClick(file._id)} className={`bg-primary text-foreground cursor-pointer p-2 rounded file-title text-sm  w-1/6 flex justify-center duration-300`}>
      {file.title}
    </div>
  )
}

export default FileCard