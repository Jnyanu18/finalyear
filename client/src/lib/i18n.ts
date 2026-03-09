"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const supportedLngs = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada"
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: Object.keys(supportedLngs),
    debug: false,
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: "/locales/{{lng}}/translation.json"
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"]
    },
    returnNull: false,
    returnEmptyString: false,
    parseMissingKeyHandler: (key: string) => key.replace(/_/g, " ")
  });

export default i18n;
