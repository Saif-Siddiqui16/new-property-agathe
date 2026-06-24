import React, { useState, useEffect } from "react";

const GoogleTranslate = () => {
  const [lang, setLang] = useState("en");

  // Remote Control sync logic
  useEffect(() => {
    const syncWithMaster = () => {
      const masterSelect = document.querySelector("#google_translate_master_container select.goog-te-combo");
      if (masterSelect) {
        // Sync custom UI if Google changes externally
        if (masterSelect.value !== lang && masterSelect.value !== "") {
          setLang(masterSelect.value);
        }
      }
    };

    const interval = setInterval(syncWithMaster, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  const handleChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);

    // Trigger the actual hidden Google dropdown
    const masterSelect = document.querySelector("#google_translate_master_container select.goog-te-combo");
    if (masterSelect) {
      masterSelect.value = newLang;
      masterSelect.dispatchEvent(new Event("change"));
    } else {
      console.error("Google Translate Master not found. Please refresh.");
    }
  };

  return (
    <div className="google-translate-custom-ui w-full max-w-[200px]">
      <select
        value={lang}
        onChange={handleChange}
        className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
      >
        <option value="en">English (default)</option>
        <option value="fr">French (Français)</option>
      </select>
    </div>
  );
};

export default GoogleTranslate;
