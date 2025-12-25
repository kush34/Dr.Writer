import React from 'react'
import { FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FaGithub } from "react-icons/fa";
const Footer = () => {
  const socials = [
    {
      icon:<FaGithub />,
      link:"https://github.com/kush34"
    },
    {
      icon:<FaLinkedin />,
      link:"https://www.linkedin.com/in/chattkush/"
    },
    {
      icon:<FaXTwitter />,
      link:"https://x.com/KushChatt"
    }
  ]
  return (
    <div className="flex justify-between text-secondary px-3 py-1 text-foreground flex justify-center items-center">
      <div className="brand font-bold ">
        DrWriter
      </div>
      <div className=''>
        © 2025 DrWriter
      </div>
      <div className="socials flex gap-2 items-center text-md py-5">
        {socials.map((social,index)=>{
          return(
            <a key={index} href={social.link}>{social.icon}</a>
          )
        })}
      </div>
    </div>
  )
}

export default Footer