import React from "react";
import { useNavigate } from "react-router-dom";


const Hero = ({ executeScroll }: { executeScroll: () => void }) => {
  const navigate = useNavigate();


  return (
    <section className="h-3/5 flex flex-col gap-8 items-center py-32 border-b-2 border-dashed">
      <div className="mt-10 text-center">
        <p className="font-light tracking-tighter">Boost your productivity</p>
        <h1 className="text-2xl xl:text-5xl font-bold leading-tight">
          One stop solution for <br />
          your Documents
        </h1>
        <p className="mt-2">Edit all your Documents at single point <br /> enhanced with LLM</p>
      </div>
      <div className="w-full flex justify-center items-center cta gap-4">
        <button onClick={() => navigate("/login")} className="w-42 shadow px-5 py-2 rounded-2xl cursor-pointer">
          Start Writing
        </button>
        <button onClick={executeScroll} className="font-light px-5 py-2 rounded-2xl cursor-pointer">
          pricing
        </button>
      </div>
    </section>
  );
};

export default Hero;
