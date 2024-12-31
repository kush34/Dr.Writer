import React, { useEffect, createContext, useState } from "react";

const ThemeContext = createContext();

const getTheme = () => {
  const theme = localStorage.getItem("theme");
  if (!theme) {
    localStorage.setItem("theme", "dark"); // Default theme
    return "dark";
  }
  return theme;
};

const applyThemeToDOM = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getTheme);

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

export { ThemeContext, ThemeProvider };
