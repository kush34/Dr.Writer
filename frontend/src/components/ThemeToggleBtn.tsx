import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { SunMoon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggleBtn = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className="p-2 rounded-full "
    >
      <SunMoon className={`text-lg ${theme === "dark" ? "text-yellow-400" : "text-gray-600"}`} />
    </button>
  );
};

export default ThemeToggleBtn;
