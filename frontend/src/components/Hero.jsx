import React from 'react'

const Hero = () => {
  return (
    <div className='z-10
    w-full h-[80vh] flex flex-col gap-10 justify-center items-center'>
        <div className="title text-2xl md:text-5xl text-center font-medium">
            The Only 
            <span className='text-green-600 font-bold italic'> Document</span>  <br></br>
            Editor you need
        </div>
        <a href='/login' className='border rounded py-2 px-4 text-white-800 font-medium hover:bg-zinc-100 hover:text-black  duration-250 ease-out'>
            Get Started
        </a>
    </div>
  )
}

export default Hero