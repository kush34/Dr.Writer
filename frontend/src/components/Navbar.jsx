import React, { useEffect, useState } from 'react'
import {Menu} from "lucide-react"
import { useNavigate } from 'react-router-dom';
const Navbar = () => {
    const navigate = useNavigate();
    const [isOpen,setIsOpen] = useState(false);
    const toggle = ()=>{
        setIsOpen((prev)=>(!prev));
    }
    useEffect(() => {
        const handleResize = () => {
          // Close the menu if the screen is resized to a larger size
          if (window.innerWidth >= 768) {
            setIsOpen(false);
          } else {
            setIsOpen(true);
          }
        };
    
        // Set initial state based on current width
        handleResize();
    
        // Add event listener for window resize
        window.addEventListener("resize", handleResize);
    
        // Clean up event listener on component unmount
        return () => window.removeEventListener("resize", handleResize);
      }, []);
  return (
    <div className='w-full flex justify-between border  backdrop-filter backdrop-blur-lg m-2 rounded-xl'>
        <div className='text-4xl text-green-500 font-bold mx-10 my-4 italic'>
            Dr.Writer
        </div>
        <div className='flex flex-col justify-center items-center'>
            <div className={`mt-4 md:hidden`}>
                <Menu onClick={toggle}/>
            </div>
            <div className={`mx-10 my-4`}>
                <ul className={`flex flex-col md:flex-row items-center justify-center gap-5 ${isOpen ? "hidden":"block"}`}>
                    <li className='hover:text-zinc-300 cursor-pointer hover:duration-110 ease-in'>Features</li>
                    <li className='hover:text-zinc-300 cursor-pointer hover:duration-110 ease-in hover:scale-125'>Blog</li>
                    <li className='hover:text-zinc-300 cursor-pointer hover:duration-110 ease-in hover:scale-125'>Pricing</li>
                    <li onClick={()=>navigate("/login")} className='hover:text-zinc-300 cursor-pointer hover:duration-300'>Login</li>
                </ul>
            </div>
        </div>
    </div>
  )
}

export default Navbar