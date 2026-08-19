/** Mock data for the "Operacyjny strumień z wątkami" prototype. */

export type FeedCardType = "POTRZEBA" | "ZASÓB" | "ALERT" | "ZADANIE";
export type FeedUrgency = "24H" | "48H" | "1 TYDZIEŃ";
export type FeedStatus = "OTWARTE" | "W TRAKCIE" | "ZAKOŃCZONE" | "ANULOWANE";
export type RoleBadge = "JST" | "NGO" | "Służby mundurowe" | "Administrator";

export interface FeedCard {
  id: string;
  type: FeedCardType;
  title: string;
  description: string;
  urgency: FeedUrgency;
  status: FeedStatus;
  location: string;
  organization: string;
  createdAt: string;
  isPinned: boolean;
  commentsCount: number;
}

export interface FeedComment {
  id: string;
  cardId: string;
  authorName: string;
  organization: string;
  roleBadge: RoleBadge;
  text: string;
  createdAt: string;
  isPinned: boolean;
}

const ts = (iso: string) => iso;

export const MOCK_FEED_CARDS: FeedCard[] = [
  {
    id: "feed-001",
    type: "POTRZEBA",
    title: "Brak wody pitnej — punkt zbiórki SP nr 2",
    description:
      "Na terenie Szkoły Podstawowej nr 2 brakuje wody pitnej dla ok. 120 ewakuowanych osób. Potrzebne min. 500 litrów wody butelkowanej na najbliższe 24h.",
    urgency: "24H",
    status: "OTWARTE",
    location: "Nowa Dęba, Szkoła Podstawowa nr 2",
    organization: "Urząd Gminy Nowa Dęba",
    createdAt: ts("2024-08-15T06:30:00Z"),
    isPinned: true,
    commentsCount: 4,
  },
  {
    id: "feed-002",
    type: "ALERT",
    title: "Poziom wody w Łęgu przekroczył stan alarmowy",
    description:
      "Stacja hydrologiczna Nowa Dęba odnotowała przekroczenie stanu alarmowego o 47 cm. Prognoza: dalszy wzrost przez 12h. Ewakuacja terenów zalewowych w toku.",
    urgency: "24H",
    status: "W TRAKCIE",
    location: "Nowa Dęba, rzeka Łęg — stacja pomiarowa",
    organization: "IMGW / Urząd Gminy Nowa Dęba",
    createdAt: ts("2024-08-15T05:15:00Z"),
    isPinned: true,
    commentsCount: 6,
  },
  {
    id: "feed-003",
    type: "ZASÓB",
    title: "Dostępne łóżka polowe i koce — magazyn OSP",
    description:
      "OSP Nowa Dęba udostępnia 40 łóżek polowych i 80 koców z magazynu przy ul. Strażackiej. Odbiór możliwy całą dobę — kontakt przez dyżurnego.",
    urgency: "48H",
    status: "OTWARTE",
    location: "Nowa Dęba, ul. Strażacka 12 (magazyn OSP)",
    organization: "OSP Nowa Dęba",
    createdAt: ts("2024-08-15T07:00:00Z"),
    isPinned: false,
    commentsCount: 2,
  },
  {
    id: "feed-004",
    type: "ZADANIE",
    title: "Dystrybucja paczek żywnościowych — os. Słoneczne",
    description:
      "Caritas przygotował 150 paczek żywnościowych. Potrzebni wolontariusze do rozwozu na os. Słoneczne i ul. Leśną. Samochody dostawcze zabezpieczone.",
    urgency: "24H",
    status: "W TRAKCIE",
    location: "Nowa Dęba, os. Słoneczne",
    organization: "Caritas Diecezji Sandomierskiej",
    createdAt: ts("2024-08-15T08:30:00Z"),
    isPinned: false,
    commentsCount: 3,
  },
  {
    id: "feed-005",
    type: "POTRZEBA",
    title: "Pompy do odwodnienia piwnic — bloki przy Mickiewicza",
    description:
      "Piwnice 6 bloków mieszkalnych przy ul. Mickiewicza są zalane do poziomu 40 cm. Potrzeba min. 3 pomp ssących do natychmiastowego odwodnienia.",
    urgency: "24H",
    status: "OTWARTE",
    location: "Nowa Dęba, ul. Mickiewicza 4-14",
    organization: "Fundacja Q",
    createdAt: ts("2024-08-15T09:00:00Z"),
    isPinned: false,
    commentsCount: 5,
  },
  {
    id: "feed-006",
    type: "ZASÓB",
    title: "Zespół psychologów kryzysowych — gotowość 24h",
    description:
      "Fundacja Q kieruje 4 psychologów kryzysowych do punktów ewakuacyjnych. Gotowość do pracy w trybie ciągłym przez 48h.",
    urgency: "48H",
    status: "OTWARTE",
    location: "Nowa Dęba, punkt koordynacyjny — Urząd Gminy",
    organization: "Fundacja Q",
    createdAt: ts("2024-08-15T10:15:00Z"),
    isPinned: false,
    commentsCount: 1,
  },
  {
    id: "feed-007",
    type: "ALERT",
    title: "Zamknięcie mostu na Łęgu — ruch wstrzymany",
    description:
      "Most na drodze gminnej Nowa Dęba–Chmielów zamknięty ze względu na podmycie filarów. Objazd przez DK 9. Inżynier budowlany wezwany na miejsce.",
    urgency: "24H",
    status: "OTWARTE",
    location: "Nowa Dęba, most na Łęgu (droga gminna)",
    organization: "Urząd Gminy Nowa Dęba",
    createdAt: ts("2024-08-15T11:00:00Z"),
    isPinned: false,
    commentsCount: 2,
  },
  {
    id: "feed-008",
    type: "ZADANIE",
    title: "Ewakuacja seniorów z DPS — transport specjalny",
    description:
      "15 pensjonariuszy DPS wymaga transportu dostosowanego do potrzeb osób z niepełnosprawnością. Koordynacja z CPS Tarnobrzeg.",
    urgency: "24H",
    status: "ZAKOŃCZONE",
    location: "Nowa Dęba, Dom Pomocy Społecznej",
    organization: "Centrum Pomocy Społecznej Tarnobrzeg",
    createdAt: ts("2024-08-15T07:45:00Z"),
    isPinned: false,
    commentsCount: 4,
  },
  {
    id: "feed-009",
    type: "POTRZEBA",
    title: "Agregat prądotwórczy dla stacji uzdatniania wody",
    description:
      "Stacja uzdatniania wody na os. Poręby straciła zasilanie. Potrzebny agregat prądotwórczy min. 50 kVA do podtrzymania pracy pomp.",
    urgency: "24H",
    status: "W TRAKCIE",
    location: "Nowa Dęba, os. Poręby — SUW",
    organization: "Urząd Gminy Nowa Dęba",
    createdAt: ts("2024-08-15T12:30:00Z"),
    isPinned: false,
    commentsCount: 3,
  },
  {
    id: "feed-010",
    type: "ZASÓB",
    title: "Wolontariusze terenowi — 25 osób w gotowości",
    description:
      "Lokalna Grupa Wolontariatu Razem dysponuje 25 przeszkolonymi wolontariuszami do pracy terenowej. Mogą wspierać dystrybucję, sprzątanie i pomoc bezpośrednią.",
    urgency: "1 TYDZIEŃ",
    status: "OTWARTE",
    location: "Nowa Dęba, siedziba LGW Razem",
    organization: "Lokalna Grupa Wolontariatu Razem",
    createdAt: ts("2024-08-15T13:00:00Z"),
    isPinned: false,
    commentsCount: 0,
  },
];

export const MOCK_FEED_COMMENTS: FeedComment[] = [
  // Card feed-001: Brak wody pitnej
  {
    id: "comment-001",
    cardId: "feed-001",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Zapotrzebowanie potwierdzone. Proszę o kontakt organizacje dysponujące wodą butelkowaną.",
    createdAt: ts("2024-08-15T06:45:00Z"),
    isPinned: true,
  },
  {
    id: "comment-002",
    cardId: "feed-001",
    authorName: "Marek Wiśniewski",
    organization: "Fundacja Pomoc Podkarpacie",
    roleBadge: "NGO",
    text: "Dysponujemy 300 butelkami 1,5l. Możemy dostarczyć w ciągu 2h. Potrzebujemy adresu rozładunku.",
    createdAt: ts("2024-08-15T07:10:00Z"),
    isPinned: false,
  },
  {
    id: "comment-003",
    cardId: "feed-001",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Przypięta wiadomość: Otrzymano 50% wody, resztę dostarcza OSP do godz. 14:00.",
    createdAt: ts("2024-08-15T10:30:00Z"),
    isPinned: true,
  },
  {
    id: "comment-004",
    cardId: "feed-001",
    authorName: "Tomasz Nowak",
    organization: "OSP Nowa Dęba",
    roleBadge: "Służby mundurowe",
    text: "Potwierdzam — transport wody wyjechał z bazy o 12:15. Szacowany czas dostawy: 1,5h.",
    createdAt: ts("2024-08-15T12:20:00Z"),
    isPinned: false,
  },

  // Card feed-002: Poziom wody
  {
    id: "comment-005",
    cardId: "feed-002",
    authorName: "dr Piotr Zając",
    organization: "IMGW Oddział Rzeszów",
    roleBadge: "JST",
    text: "Aktualizacja prognozy: szczyt fali przewidywany na godz. 18:00. Poziom może wzrosnąć o kolejne 20 cm.",
    createdAt: ts("2024-08-15T08:00:00Z"),
    isPinned: true,
  },
  {
    id: "comment-006",
    cardId: "feed-002",
    authorName: "kpt. Jan Mazur",
    organization: "PSP Nowa Dęba",
    roleBadge: "Służby mundurowe",
    text: "Zabezpieczono wał w rejonie ul. Nadrzecznej workami z piaskiem. Potrzebujemy 500 dodatkowych worków.",
    createdAt: ts("2024-08-15T09:30:00Z"),
    isPinned: false,
  },
  {
    id: "comment-007",
    cardId: "feed-002",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Ewakuacja ul. Nadrzecznej zakończona — 23 osoby przetransportowane do SP nr 2.",
    createdAt: ts("2024-08-15T10:15:00Z"),
    isPinned: false,
  },
  {
    id: "comment-008",
    cardId: "feed-002",
    authorName: "Michał Krawczyk",
    organization: "WOPR Stalowa Wola",
    roleBadge: "Służby mundurowe",
    text: "Patrol łodziowy na Łęgu od godz. 7:00. Sytuacja pod kontrolą w rejonie Chmielowa.",
    createdAt: ts("2024-08-15T11:00:00Z"),
    isPinned: false,
  },
  {
    id: "comment-009",
    cardId: "feed-002",
    authorName: "dr Piotr Zając",
    organization: "IMGW Oddział Rzeszów",
    roleBadge: "JST",
    text: "Korekta: szczyt fali przesunięty na godz. 20:00 z powodu intensywnych opadów w zlewni górnej.",
    createdAt: ts("2024-08-15T14:00:00Z"),
    isPinned: false,
  },
  {
    id: "comment-010",
    cardId: "feed-002",
    authorName: "Admin Systemu",
    organization: "Koordynacja Kryzysowa",
    roleBadge: "Administrator",
    text: "Zaktualizowano status na W TRAKCIE. Monitorowanie ciągłe do odwołania.",
    createdAt: ts("2024-08-15T14:30:00Z"),
    isPinned: false,
  },

  // Card feed-003: Łóżka polowe
  {
    id: "comment-011",
    cardId: "feed-003",
    authorName: "Tomasz Nowak",
    organization: "OSP Nowa Dęba",
    roleBadge: "Służby mundurowe",
    text: "Dyżurny dostępny pod nr 601-XXX-XXX. Zapraszamy po odbiór.",
    createdAt: ts("2024-08-15T07:15:00Z"),
    isPinned: false,
  },
  {
    id: "comment-012",
    cardId: "feed-003",
    authorName: "Katarzyna Zielińska",
    organization: "PCK Nowa Dęba",
    roleBadge: "NGO",
    text: "Odbierzemy 20 łóżek i 40 koców do punktu noclegowego przy hali PCK. Transport o 10:00.",
    createdAt: ts("2024-08-15T08:30:00Z"),
    isPinned: false,
  },

  // Card feed-004: Dystrybucja paczek
  {
    id: "comment-013",
    cardId: "feed-004",
    authorName: "ks. Andrzej Wójcik",
    organization: "Caritas Diecezji Sandomierskiej",
    roleBadge: "NGO",
    text: "Paczki gotowe do załadunku. Potrzebujemy 4 wolontariuszy do pomocy przy rozładunku.",
    createdAt: ts("2024-08-15T08:45:00Z"),
    isPinned: false,
  },
  {
    id: "comment-014",
    cardId: "feed-004",
    authorName: "Ewa Szymańska",
    organization: "Lokalna Grupa Wolontariatu Razem",
    roleBadge: "NGO",
    text: "Kierujemy 6 wolontariuszy na 9:30. Będą na miejscu z identyfikatorami.",
    createdAt: ts("2024-08-15T09:00:00Z"),
    isPinned: false,
  },
  {
    id: "comment-015",
    cardId: "feed-004",
    authorName: "ks. Andrzej Wójcik",
    organization: "Caritas Diecezji Sandomierskiej",
    roleBadge: "NGO",
    text: "Pierwsza tura (80 paczek) dostarczona. Druga tura w drodze.",
    createdAt: ts("2024-08-15T12:00:00Z"),
    isPinned: false,
  },

  // Card feed-005: Pompy do odwodnienia
  {
    id: "comment-016",
    cardId: "feed-005",
    authorName: "Jakub Dąbrowski",
    organization: "Fundacja Q",
    roleBadge: "NGO",
    text: "Zidentyfikowano 6 budynków. Woda nadal napływa z kanalizacji burzowej.",
    createdAt: ts("2024-08-15T09:15:00Z"),
    isPinned: false,
  },
  {
    id: "comment-017",
    cardId: "feed-005",
    authorName: "kpt. Jan Mazur",
    organization: "PSP Nowa Dęba",
    roleBadge: "Służby mundurowe",
    text: "Możemy udostępnić 2 pompy z JRG. Trzecia jedzie z Tarnobrzega — ETA 1h.",
    createdAt: ts("2024-08-15T09:45:00Z"),
    isPinned: false,
  },
  {
    id: "comment-018",
    cardId: "feed-005",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Potwierdzam koordynację. Pompy PSP przydzielone do bloków 4, 8 i 12.",
    createdAt: ts("2024-08-15T10:00:00Z"),
    isPinned: true,
  },
  {
    id: "comment-019",
    cardId: "feed-005",
    authorName: "Tomasz Nowak",
    organization: "OSP Nowa Dęba",
    roleBadge: "Służby mundurowe",
    text: "OSP dołącza z dodatkową pompą motopompą. Jesteśmy na miejscu.",
    createdAt: ts("2024-08-15T11:30:00Z"),
    isPinned: false,
  },
  {
    id: "comment-020",
    cardId: "feed-005",
    authorName: "Jakub Dąbrowski",
    organization: "Fundacja Q",
    roleBadge: "NGO",
    text: "Poziom wody spadł o 15 cm w bloku nr 4. Kontynuujemy pompowanie.",
    createdAt: ts("2024-08-15T13:00:00Z"),
    isPinned: false,
  },

  // Card feed-006: Psycholodzy
  {
    id: "comment-021",
    cardId: "feed-006",
    authorName: "Jakub Dąbrowski",
    organization: "Fundacja Q",
    roleBadge: "NGO",
    text: "Zespół przydzielony: SP nr 2 (2 osoby), hala PCK (1 osoba), punkt koordynacyjny (1 osoba).",
    createdAt: ts("2024-08-15T10:30:00Z"),
    isPinned: false,
  },

  // Card feed-007: Zamknięcie mostu
  {
    id: "comment-022",
    cardId: "feed-007",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Znaki objazdu ustawione. Policja kieruje ruchem na skrzyżowaniu z DK 9.",
    createdAt: ts("2024-08-15T11:30:00Z"),
    isPinned: false,
  },
  {
    id: "comment-023",
    cardId: "feed-007",
    authorName: "inż. Rafał Kopeć",
    organization: "Nadzór budowlany",
    roleBadge: "JST",
    text: "Oględziny filarów zaplanowane na jutro rano po spadku poziomu wody.",
    createdAt: ts("2024-08-15T14:00:00Z"),
    isPinned: false,
  },

  // Card feed-008: Ewakuacja seniorów (ZAKOŃCZONE)
  {
    id: "comment-024",
    cardId: "feed-008",
    authorName: "Maria Kubiak",
    organization: "CPS Tarnobrzeg",
    roleBadge: "JST",
    text: "Transport zorganizowany — 2 busy przystosowane. Wyjazd o 8:00.",
    createdAt: ts("2024-08-15T07:50:00Z"),
    isPinned: false,
  },
  {
    id: "comment-025",
    cardId: "feed-008",
    authorName: "Maria Kubiak",
    organization: "CPS Tarnobrzeg",
    roleBadge: "JST",
    text: "Wszyscy pensjonariusze bezpiecznie przetransportowani do ośrodka zastępczego w Tarnobrzegu.",
    createdAt: ts("2024-08-15T10:00:00Z"),
    isPinned: true,
  },
  {
    id: "comment-026",
    cardId: "feed-008",
    authorName: "Admin Systemu",
    organization: "Koordynacja Kryzysowa",
    roleBadge: "Administrator",
    text: "Zadanie zakończone pomyślnie. Zamykam wątek.",
    createdAt: ts("2024-08-15T10:15:00Z"),
    isPinned: false,
  },
  {
    id: "comment-027",
    cardId: "feed-008",
    authorName: "Ewa Szymańska",
    organization: "LGW Razem",
    roleBadge: "NGO",
    text: "Wolontariusze pomogli przy załadunku. Wszystko sprawnie.",
    createdAt: ts("2024-08-15T10:30:00Z"),
    isPinned: false,
  },

  // Card feed-009: Agregat
  {
    id: "comment-028",
    cardId: "feed-009",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Kontaktujemy się z firmami wynajmującymi agregaty. Szukamy jednostki 50+ kVA.",
    createdAt: ts("2024-08-15T12:45:00Z"),
    isPinned: false,
  },
  {
    id: "comment-029",
    cardId: "feed-009",
    authorName: "kpt. Jan Mazur",
    organization: "PSP Nowa Dęba",
    roleBadge: "Służby mundurowe",
    text: "PSP dysponuje agregatem 30 kVA — tymczasowe rozwiązanie do czasu dostawy większego.",
    createdAt: ts("2024-08-15T13:15:00Z"),
    isPinned: false,
  },
  {
    id: "comment-030",
    cardId: "feed-009",
    authorName: "Anna Kowalska",
    organization: "Urząd Gminy Nowa Dęba",
    roleBadge: "JST",
    text: "Agregat PSP podłączony o 14:00. Stacja działa na połowie mocy. Agregat 60 kVA jedzie z Mielca.",
    createdAt: ts("2024-08-15T14:15:00Z"),
    isPinned: true,
  },
];
