/**
 * Lightweight i18n for en-CA / fr-CA (Phase 5).
 * No external i18next dependency — dictionary + hook.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en-CA" | "fr-CA";

const dict = {
  "en-CA": {
    "nav.dashboard": "Dashboard",
    "nav.reservations": "Reservations",
    "nav.host": "Host Stand",
    "nav.guests": "Guests",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "common.loading": "Loading…",
    "common.error": "Something went wrong",
    "common.retry": "Try again",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.empty": "Nothing here yet",
    "book.title": "Book a table",
    "book.party": "Party size",
    "book.date": "Date",
    "book.time": "Time",
    "book.details": "Your details",
    "book.confirm": "Confirm reservation",
    "book.closed": "Closed this day",
    "book.noSlots": "No available times",
    "host.walkIn": "Walk-in",
    "host.seat": "Seat",
    "host.unseat": "Unseat",
    "host.noShow": "No-show",
    "guests.search": "Search guests",
    "guests.export": "Export CSV",
    "dashboard.reservations": "Reservations",
    "dashboard.seats": "Seats",
    "dashboard.noShowRate": "No-show rate",
  },
  "fr-CA": {
    "nav.dashboard": "Tableau de bord",
    "nav.reservations": "Réservations",
    "nav.host": "Poste d’accueil",
    "nav.guests": "Clients",
    "nav.reports": "Rapports",
    "nav.settings": "Paramètres",
    "common.loading": "Chargement…",
    "common.error": "Une erreur est survenue",
    "common.retry": "Réessayer",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.empty": "Rien à afficher",
    "book.title": "Réserver une table",
    "book.party": "Nombre de convives",
    "book.date": "Date",
    "book.time": "Heure",
    "book.details": "Vos coordonnées",
    "book.confirm": "Confirmer la réservation",
    "book.closed": "Fermé ce jour",
    "book.noSlots": "Aucun horaire disponible",
    "host.walkIn": "Sans réservation",
    "host.seat": "Asseoir",
    "host.unseat": "Libérer",
    "host.noShow": "Absent",
    "guests.search": "Rechercher des clients",
    "guests.export": "Exporter CSV",
    "dashboard.reservations": "Réservations",
    "dashboard.seats": "Couverts",
    "dashboard.noShowRate": "Taux de no-show",
  },
} as const;

export type MessageKey = keyof (typeof dict)["en-CA"];

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({
  children,
  initial = "en-CA",
}: {
  children: ReactNode;
  initial?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem("restostack:locale") as Locale | null;
      if (saved === "en-CA" || saved === "fr-CA") return saved;
    } catch {
      /* ignore */
    }
    return initial;
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("restostack:locale", l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  const t = useCallback(
    (key: MessageKey) => dict[locale][key] ?? dict["en-CA"][key] ?? key,
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      locale: "en-CA" as Locale,
      setLocale: (_: Locale) => undefined,
      t: (key: MessageKey) => dict["en-CA"][key] ?? key,
    };
  }
  return ctx;
}
