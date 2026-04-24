import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";


const Hero = ({ executeScroll }: { executeScroll: () => void }) => {
  const navigate = useNavigate();


  return (
    <section className="p-24 xl:p-42 flex flex-col xl:flex-row justify-center items-center gap-15">
      <div>
        <div>
          <p className="font-light tracking-tighter">Boost your productivity</p>
          <h1 className="text-2xl xl:text-5xl font-bold leading-tight">
            One stop solution for <br />
            your Documents
          </h1>
          <p className="mt-2">Edit all your Documents at single point <br /> enhanced with LLM</p>
        </div>
        <div className="flex gap-5 py-5">
          <Button className='text-white' onClick={() => navigate("/login")}>
            Start Writing
          </Button>
          <Button variant={"secondary"} onClick={executeScroll}>
            pricing
          </Button>
        </div>
      </div>
      <div className="w-full xl:w-3/5">
        <img src="./Editor.png" className="rounded-xl border shadow-xl border border-gray-200" alt="" />
      </div>
    </section>
  );
};

export default Hero;
