import React from 'react'

import { useNavigate } from 'react-router-dom';
const Navbar = () => {
    const navigate = useNavigate();

  return (
    <div className='flex justify-between'>
        <div className='text-4xl font-bold mx-10 my-4'>
            Dr.Writer
        </div>
        <div className='mx-10 my-4'>
            <ul className='flex items-center justify-center gap-5'>
                <li className='hover:text-zinc-300 cursor-pointer hover:duration-300'>Features</li>
                <li className='hover:text-zinc-300 cursor-pointer hover:duration-300'>Blog</li>
                <li className='hover:text-zinc-300 cursor-pointer hover:duration-300'>Pricing</li>
                <li onClick={()=>navigate("/login")} className='hover:text-zinc-300 cursor-pointer hover:duration-300'>Login</li>
            </ul>
        </div>
    </div>
  )
}

export default Navbar