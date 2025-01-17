import React, { useContext } from "react";
import { Toaster } from "@/components/ui/toaster"
const Layout = ({ children }) => {
  return (
    <div className={`flex `}>
        <Toaster />
          {children}
    </div>

  );
};

export default Layout;
