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
    "nav.ops": "Operations",
    "nav.clients": "Guests",
    "nav.manage": "Management",
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
    "dashboard.hello": "Hello, {name}",
    "dashboard.subtitle": "Here’s what’s happening today at {location}.",
    "dashboard.location": "Location",
    "dashboard.date": "Date",
    "dashboard.notifications": "Notifications",
    "dashboard.newReservation": "New reservation",
    "dashboard.reservations": "Reservations",
    "dashboard.covers": "Covers",
    "dashboard.seats": "Seats",
    "dashboard.revenue": "Revenue",
    "dashboard.avgSpend": "Avg spend",
    "dashboard.seatsPerRes": "seats / reservation",
    "dashboard.noShows": "No-shows",
    "dashboard.noShowRate": "No-show rate",
    "dashboard.occupancy": "Occupancy",
    "dashboard.vsPrior": "vs prior period",
    "dashboard.performance": "Performance",
    "dashboard.tonight": "Tonight",
    "dashboard.expectedCovers": "expected covers",
    "dashboard.expectedOcc": "expected occupancy",
    "dashboard.upcoming": "Upcoming reservations",
    "dashboard.seeAll": "See all",
    "dashboard.floor": "Floor plan",
    "dashboard.tablesOccupied": "tables occupied",
    "dashboard.available": "Available",
    "dashboard.reserved": "Reserved",
    "dashboard.occupied": "Occupied",
    "dashboard.attention": "Attention",
    "dashboard.guestOverview": "Guest overview",
    "dashboard.regulars": "Regulars",
    "dashboard.birthdays": "Birthdays",
    "dashboard.newGuests": "New",
    "dashboard.topTables": "Top tables",
    "dashboard.table": "Table",
    "dashboard.turns": "Turns",
  },
  "fr-CA": {
    "nav.dashboard": "Tableau de bord",
    "nav.reservations": "Réservations",
    "nav.host": "Host Stand",
    "nav.guests": "Clients",
    "nav.reports": "Rapports",
    "nav.settings": "Paramètres",
    "nav.ops": "Opérations",
    "nav.clients": "Clients",
    "nav.manage": "Gestion",
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
    "dashboard.hello": "Bonjour, {name}",
    "dashboard.subtitle": "Voici ce qui se passe aujourd’hui chez {location}.",
    "dashboard.location": "Établissement",
    "dashboard.date": "Date",
    "dashboard.notifications": "Notifications",
    "dashboard.newReservation": "Nouvelle réservation",
    "dashboard.reservations": "Réservations",
    "dashboard.covers": "Couverts",
    "dashboard.seats": "Couverts",
    "dashboard.revenue": "Revenus",
    "dashboard.avgSpend": "Dépense moy.",
    "dashboard.seatsPerRes": "couverts / réservation",
    "dashboard.noShows": "No-shows",
    "dashboard.noShowRate": "Taux de no-show",
    "dashboard.occupancy": "Occupation",
    "dashboard.vsPrior": "vs période préc.",
    "dashboard.performance": "Performance",
    "dashboard.tonight": "Ce soir",
    "dashboard.expectedCovers": "couverts prévus",
    "dashboard.expectedOcc": "occupation prévue",
    "dashboard.upcoming": "Réservations à venir",
    "dashboard.seeAll": "Voir tout",
    "dashboard.floor": "Plan de salle",
    "dashboard.tablesOccupied": "tables occupées",
    "dashboard.available": "Disponible",
    "dashboard.reserved": "Réservée",
    "dashboard.occupied": "Occupée",
    "dashboard.attention": "Attention",
    "dashboard.guestOverview": "Aperçu invités",
    "dashboard.regulars": "Réguliers",
    "dashboard.birthdays": "Anniversaires",
    "dashboard.newGuests": "Nouveaux",
    "dashboard.topTables": "Top tables",
    "dashboard.table": "Table",
    "dashboard.turns": "Tours",
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
  initial = "fr-CA",
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
      locale: "fr-CA" as Locale,
      setLocale: (_: Locale) => undefined,
      t: (key: MessageKey) => dict["fr-CA"][key] ?? dict["en-CA"][key] ?? key,
    };
  }
  return ctx;
}
