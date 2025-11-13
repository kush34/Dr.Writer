import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import AppLayout from './AppLayout'
import { toast, useToast } from './hooks/use-toast'
import { Analytics } from "@vercel/analytics/react"

const App = () => {
  const { toast } = useToast();
  const [flag, setFlag] = useState(true)
  const handleFlip = () => {
    setFlag(value => !value)
  }

  return (
    <AppLayout>
      <Analytics />
      <div className='flex w-full h-screen'>
        <div className='hidden xl:inline xl:w-1/2 h-full bg-[#e6fdec]'>
          <div className='w-full h-full flex flex-col justify-center items-center'>
            <img src="./login.svg" alt="login Illstration" className='w-1/2 h-1/2' />
            <span className='text-4xl font-medium'>Edit Any Documents</span>
            <span className='text-sm font-light mt-5'>One Stop Solution for any document you need to edit absolutely free of cost *</span>
          </div>
        </div>
        <div className='w-full xl:w-1/2 h-full'>
          {
            flag ?
              <Login setFlag={setFlag} />
              :
              <Register setFlag={setFlag} />
          }
        </div>
      </div>
    </AppLayout>

  )
}

export default App