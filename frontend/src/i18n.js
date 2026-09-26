import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/translation.json";
import pl from "./locales/pl/translation.json";

const storedLanguage = localStorage.getItem("language");
const initialLanguage = storedLanguage === "pl" ? "pl" : "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pl: { translation: pl },
    },
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

const applyDocumentLanguage = language => {
  const normalizedLanguage = language?.startsWith("pl") ? "pl" : "en";
  document.documentElement.lang = normalizedLanguage;
  localStorage.setItem("language", normalizedLanguage);
};

applyDocumentLanguage(initialLanguage);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
