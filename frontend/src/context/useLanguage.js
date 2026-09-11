import { useContext } from "react";
import { LanguageContext } from "./LanguageContext";

export const useLanguage = () => useContext(LanguageContext);