import React, { ReactNode, useContext } from "react";
import { Toaster } from "./components/ui/sonner";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className={`flex `}>
      <Toaster />
      {children}
    </div>

  );
};

export default Layout;
