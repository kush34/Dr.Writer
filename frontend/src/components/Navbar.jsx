import React, { useEffect, useState } from 'react'
import { Menu } from "lucide-react"
import { useNavigate } from 'react-router-dom';
const Navbar = () => {
  const navigate = useNavigate();

  const links = [
    {
      title: "Pricing",
      link: '#'
    },
    {
      title: "FAQs",
      link: '#'
    },
    {
      title: "Developers",
      link: '#'
    }
  ]
  return (
    <div className='w-full flex justify-between backdrop-filter backdrop-blur-lg border-b p-5 text-[--text-color]'>
      <div className='flex justify-between w-1/2'>
        <div className="brand font-bold">
          DrWriter
        </div>
        <div className="links flex gap-5">
          {links.map((link) => {
            return (
              <a href={link.link}>
                {link.title}
              </a>
            )
          })}
        </div>
      </div>
      <div className="auths">
        <button onClick={()=>navigate("/login")} className='bg-primary shadow text-background font-medium px-5 py-2 rounded-2xl font-light cursor-pointer'>
          Create Account
        </button>
      </div>
    </div>
  )
}

export default Navbar