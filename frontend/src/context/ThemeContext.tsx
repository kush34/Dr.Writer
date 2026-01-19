import React, { useEffect, createContext, useState, ReactNode, useContext } from "react";

type tTheme = "dark" | "light"
type tThemeContext = {
  theme:tTheme,
  toggleTheme: ()=>void
}
const ThemeContext = createContext<tThemeContext| null>(null);


const getTheme = ():tTheme => {
  const theme = localStorage.getItem("theme");
  if (!theme) {
    localStorage.setItem("theme", "dark"); // Default theme
    return "dark";
  }
  return theme == "dark" ? "dark":"light";
};

const applyThemeToDOM = (theme:tTheme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

const ThemeProvider = ({ children }:{children:ReactNode}) => {
  const [theme, setTheme] = useState<tTheme>(getTheme);

  useEffect(() => {
    applyThemeToDOM(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
};

export { ThemeContext, ThemeProvider,useTheme };
