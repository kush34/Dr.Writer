import React from 'react'
import { Github } from 'lucide-react';

const Footer = () => {
  return (
    <div className="flex justify-center items-center">
      <Github /> 
      <a target='_black' href='https://github.com/kush34' className='flex justify-center items-center bottom-0 m-2'>
        Made with ♥️ by kush34
      </a>
    </div>
  )
}

export default Footer