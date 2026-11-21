import { Globe2 } from "lucide-react";
import { supportedLocales, useI18n, type Locale } from "./i18n";

export function LocaleSelector({ variant = "panel" }: { variant?: "panel" | "compact" }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`locale-select locale-select-${variant}`}>
      <span>
        <Globe2 size={14} />
        {variant === "compact" ? t("language.shortLabel") : t("language.label")}
      </span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t("language.aria")}
      >
        {supportedLocales.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
