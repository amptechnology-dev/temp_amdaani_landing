"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";

// Dropdown e je language gulo dekhate chao ekhane edit koro
const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu", native: "اردو" },
];

const INCLUDED_LANGUAGES = LANGUAGES.map((l) => l.code).join(",");

/**
 * FIX: "Failed to execute 'removeChild' on 'Node'" error
 * Google Translate text node gulo <font> diye wrap kore dey. React pore
 * oi node remove/insert korte gele node ta ar parent er child thake na, tai crash.
 * Ei patch oi case ta safely handle kore (ekbar-i apply hoy).
 */
function patchDomForGoogleTranslate() {
  if (typeof window === "undefined" || window.__gtDomPatched) return;
  window.__gtDomPatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

// Module load hote-i patch apply (component mount er age)
patchDomForGoogleTranslate();

const getCurrentLang = () => {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
  const code = match?.[1];
  return LANGUAGES.some((l) => l.code === code) ? code : "en";
};

const clearTranslateCookie = () => {
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  const host = window.location.hostname;
  document.cookie = `googtrans=; ${expired}; path=/`;
  document.cookie = `googtrans=; ${expired}; path=/; domain=${host}`;
  document.cookie = `googtrans=; ${expired}; path=/; domain=.${host}`;
};

const setTranslateCookie = (code) => {
  const value = `/en/${code}`;
  document.cookie = `googtrans=${value}; path=/`;
  document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}`;
};

export default function GoogleTranslate({ theme = "light" }) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const isLight = theme === "light";

  // Google er hidden widget init (shudhu translate engine hisebe)
  useEffect(() => {
    let cancelled = false;
    setCurrent(getCurrentLang());

    const initWidget = () => {
      if (cancelled) return;
      const TranslateElement = window.google?.translate?.TranslateElement;
      const el = document.getElementById(ELEMENT_ID);
      if (!TranslateElement || !el) return;

      el.innerHTML = "";
      new TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: INCLUDED_LANGUAGES,
          autoDisplay: false,
        },
        ELEMENT_ID
      );
    };

    if (window.google?.translate?.TranslateElement) {
      initWidget();
    } else {
      window.googleTranslateElementInit = initWidget;
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src =
          "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Click outside + Escape e dropdown bondho
  useEffect(() => {
    const onMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const changeLanguage = useCallback((code) => {
    setOpen(false);
    setCurrent(code);

    // English = original, tai cookie clear kore reload
    if (code === "en") {
      clearTranslateCookie();
      window.location.reload();
      return;
    }

    let tries = 0;
    const apply = () => {
      const combo = document.querySelector("select.goog-te-combo");
      if (combo) {
        combo.value = code;
        combo.dispatchEvent(new Event("change"));
        return;
      }
      // Widget ekhono ready na hole kichhukkhon retry, na hole cookie diye fallback
      if (tries++ < 10) {
        setTimeout(apply, 200);
      } else {
        setTranslateCookie(code);
        window.location.reload();
      }
    };
    apply();
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];

  return (
    <div
      ref={wrapperRef}
      className="notranslate relative"
      translate="no"
      suppressHydrationWarning
    >
      {/* Google er hidden widget: user ke dekha jabe na */}
      <div
        id={ELEMENT_ID}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className={`flex items-center gap-2 h-10 w-[150px] px-3 rounded-lg border text-[13px] font-semibold transition-colors duration-200 ${
          isLight
            ? "bg-white border-gray-200 hover:border-gray-300 text-slate-700"
            : "bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-200"
        }`}
      >
        <Globe className="w-4 h-4 flex-shrink-0 text-[#2563eb]" />
        <span className="flex-1 text-left truncate">
          {current === "en" ? "Language" : currentLang.label}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          role="listbox"
          className={`absolute right-0 top-full mt-2 w-56 max-h-72 overflow-y-auto rounded-xl border p-1.5 shadow-xl z-[60] ${
            isLight
              ? "bg-white border-gray-200"
              : "bg-slate-900 border-slate-700"
          }`}
        >
          <div
            className={`px-3 pt-1.5 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] ${
              isLight ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Select Language
          </div>

          {LANGUAGES.map((lang) => {
            const active = lang.code === current;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
                  active
                    ? isLight
                      ? "bg-blue-50 text-[#2563eb] font-semibold"
                      : "bg-blue-950/40 text-blue-400 font-semibold"
                    : isLight
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="flex flex-col items-start leading-tight">
                  <span>{lang.native}</span>
                  {lang.native !== lang.label && (
                    <span
                      className={`text-[11px] font-normal ${
                        isLight ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {lang.label}
                    </span>
                  )}
                </span>
                {active && <Check className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        /* Google er default banner ar body offset hide */
        .goog-te-banner-frame,
        .skiptranslate > iframe.skiptranslate,
        iframe.goog-te-banner-frame,
        #goog-gt-tt,
        .goog-tooltip,
        .goog-te-balloon-frame {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        .goog-text-highlight {
          background: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}