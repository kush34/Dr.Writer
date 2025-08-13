import React,{useState,useEffect} from 'react'
import Login from './components/Login'
import Register from './components/Register'
import AppLayout from './AppLayout'
import { toast, useToast } from './hooks/use-toast'
import { Analytics } from "@vercel/analytics/react"

const App = () => {
  const { toast } = useToast();
  const [flag,setFlag] = useState(true)
  const handleFlip = ()=>{
    setFlag(value=>!value)
  }

  return (
    <AppLayout>
      <Analytics/>
    <div className='bg-black w-full h-screen text-white'>
      <div className="main flex">
        <div className="Title w-1/2 h-screen flex flex-col justify-center items-center">
        <div className='flex flex-col justify-center items-end'>
          <h1 className='font-bold text-5xl'>Documents Made Easy</h1>
          <p className='text-zinc-400 italic'>by Dr.Writer</p>
        </div>
        </div>
        <div className="action w-1/2 h-screen flex flex-col justify-center items-center">
           {flag ? <Login/> : <Register/>}
           <div>
              <button onClick={handleFlip}>{flag ? "New Here":"Already User"}</button>
           </div>
        </div>
      </div>
      </div>
    </AppLayout>

  )
}

export default App