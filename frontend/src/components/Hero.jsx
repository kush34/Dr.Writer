import React from "react";
import { BackgroundLines } from "./BackgroundLines";
import { useNavigate } from "react-router-dom";


const Hero = ({ executeScroll }) => {
  const navigate = useNavigate();


  return (
    <section className="h-1/2 flex flex-col  gap-8 items-center py-32 border-b-2 border-dashed">
      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-bold text-black leading-tight">
          One stop solution for <br />
          your Documents
        </h1>
        <p className="text-secondary">Edit all your Documents at single point</p>
      </div>
      <div className="cta flex gap-4">
        <button onClick={executeScroll} className="text-secondary font-light shadow text-foreground border px-5 py-2 rounded-2xl cursor-pointer">
          pricing
        </button>
        <button onClick={() => navigate("/login")} className=" shadow bg-primary px-5 py-2 rounded-2xl cursor-pointer">
          Start Writing
        </button>
      </div>
    </section>
  );
};

export default Hero;
