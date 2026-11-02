/** Languages Meta (Llama 4 / Muse, SeamlessM4T, MMS) and NVIDIA (Nemotron, Riva / Canary / Parakeet ASR, Magpie TTS) can handle. [BCP-47, full name, flag, speech locale] */
export const LANGS: [string, string, string][] = [
  ["ig", "Igbo", "🇳🇬"], ["en-NG", "English (Nigeria)", "🇳🇬"], ["yo", "Yoruba", "🇳🇬"], ["ha", "Hausa", "🇳🇬"], ["pcm", "Nigerian Pidgin", "🇳🇬"], ["ff", "Fulfulde", "🇳🇬"], ["ef", "Efik", "🇳🇬"], ["tiv", "Tiv", "🇳🇬"],
  ["en", "English (UK)", "🇬🇧"], ["en-US", "English (US)", "🇺🇸"], ["fr", "French", "🇫🇷"], ["es", "Spanish", "🇪🇸"], ["pt", "Portuguese (Portugal)", "🇵🇹"], ["pt-BR", "Portuguese (Brazil)", "🇧🇷"], ["de", "German", "🇩🇪"], ["it", "Italian", "🇮🇹"], ["nl", "Dutch", "🇳🇱"],
  ["sw", "Swahili", "🇰🇪"], ["am", "Amharic", "🇪🇹"], ["zu", "Zulu", "🇿🇦"], ["xh", "Xhosa", "🇿🇦"], ["af", "Afrikaans", "🇿🇦"], ["so", "Somali", "🇸🇴"], ["om", "Oromo", "🇪🇹"], ["rw", "Kinyarwanda", "🇷🇼"], ["sn", "Shona", "🇿🇼"], ["tw", "Twi (Akan)", "🇬🇭"], ["ee", "Ewe", "🇬🇭"], ["wo", "Wolof", "🇸🇳"], ["ln", "Lingala", "🇨🇩"], ["mg", "Malagasy", "🇲🇬"],
  ["ar", "Arabic", "🇸🇦"], ["ar-EG", "Arabic (Egypt)", "🇪🇬"], ["he", "Hebrew", "🇮🇱"], ["fa", "Persian", "🇮🇷"], ["tr", "Turkish", "🇹🇷"], ["ku", "Kurdish", "🇮🇶"],
  ["zh", "Chinese (Mandarin)", "🇨🇳"], ["zh-TW", "Chinese (Traditional)", "🇹🇼"], ["yue", "Cantonese", "🇭🇰"], ["ja", "Japanese", "🇯🇵"], ["ko", "Korean", "🇰🇷"], ["vi", "Vietnamese", "🇻🇳"], ["th", "Thai", "🇹🇭"], ["id", "Indonesian", "🇮🇩"], ["ms", "Malay", "🇲🇾"], ["tl", "Filipino (Tagalog)", "🇵🇭"], ["km", "Khmer", "🇰🇭"], ["my", "Burmese", "🇲🇲"],
  ["hi", "Hindi", "🇮🇳"], ["bn", "Bengali", "🇧🇩"], ["ur", "Urdu", "🇵🇰"], ["pa", "Punjabi", "🇮🇳"], ["ta", "Tamil", "🇮🇳"], ["te", "Telugu", "🇮🇳"], ["mr", "Marathi", "🇮🇳"], ["gu", "Gujarati", "🇮🇳"], ["kn", "Kannada", "🇮🇳"], ["ml", "Malayalam", "🇮🇳"], ["ne", "Nepali", "🇳🇵"], ["si", "Sinhala", "🇱🇰"],
  ["ru", "Russian", "🇷🇺"], ["uk", "Ukrainian", "🇺🇦"], ["pl", "Polish", "🇵🇱"], ["cs", "Czech", "🇨🇿"], ["sk", "Slovak", "🇸🇰"], ["ro", "Romanian", "🇷🇴"], ["hu", "Hungarian", "🇭🇺"], ["bg", "Bulgarian", "🇧🇬"], ["el", "Greek", "🇬🇷"], ["sr", "Serbian", "🇷🇸"], ["hr", "Croatian", "🇭🇷"], ["sv", "Swedish", "🇸🇪"], ["no", "Norwegian", "🇳🇴"], ["da", "Danish", "🇩🇰"], ["fi", "Finnish", "🇫🇮"], ["et", "Estonian", "🇪🇪"], ["lv", "Latvian", "🇱🇻"], ["lt", "Lithuanian", "🇱🇹"],
  ["kk", "Kazakh", "🇰🇿"], ["uz", "Uzbek", "🇺🇿"], ["az", "Azerbaijani", "🇦🇿"], ["ka", "Georgian", "🇬🇪"], ["hy", "Armenian", "🇦🇲"], ["ht", "Haitian Creole", "🇭🇹"], ["qu", "Quechua", "🇵🇪"],
];
export const DEFAULT_LANG = "en-US";
/** Browser speech locale (Web Speech API needs a region for some languages). */
export const speechLocale = (c: string) => ({ "en-US": "en-US",  ig: "ig-NG", yo: "yo-NG", ha: "ha-NG", pcm: "en-NG", en: "en-GB", fr: "fr-FR", es: "es-ES", pt: "pt-PT", de: "de-DE", ar: "ar-SA", zh: "zh-CN", sw: "sw-KE", hi: "hi-IN", ja: "ja-JP", ko: "ko-KR", ru: "ru-RU", it: "it-IT" } as Record<string, string>)[c] ?? c;
export const langLabel = (c: string) => { const l = LANGS.find((x) => x[0] === c); return l ? `${l[2]} ${l[1]}` : c === "auto" ? "🌐 Auto-detect" : c; };
export const langName = (c: string) => LANGS.find((x) => x[0] === c)?.[1] ?? c;
