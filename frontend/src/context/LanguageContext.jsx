import { createContext, useState, useEffect } from "react";

// 1. Create the context
export const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {}
});

// 2. Create the Provider component
export const LanguageProvider = ({ children }) => {
  // Read from localStorage on initial load, default to "en"
  const [language, setLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("newslens_language") || "en";
    }
    return "en";
  });

  // Automatically save to localStorage whenever the user changes the language
  useEffect(() => {
    localStorage.setItem("newslens_language", language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};