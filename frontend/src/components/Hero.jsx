import React from 'react'

const Hero = () => {
  return (
    <div className=' 
    w-full h-[80vh] flex flex-col gap-10 justify-center items-center'>
        <div className="title text-5xl text-center font-medium">
            The Only Document <br></br>
            Editor you need
        </div>
        <button className='border rounded py-2 px-4 text-white-800 font-medium hover:bg-zinc-100 hover:text-black duration-250 ease-out'>
            Get Started
        </button>
    </div>
  )
}

export default Hero