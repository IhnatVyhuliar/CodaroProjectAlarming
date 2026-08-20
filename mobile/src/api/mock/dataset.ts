/**
 * In-memory demo dataset for the development-only mock adapter.
 *
 * Nothing here is production data: statuses, transitions and their requirements
 * pretend to come from the backend seeders described in the spec. Production
 * builds never load this module (see `install.ts`).
 */

import type {
  AssigneeType,
  AttachmentType,
  LocationMode,
  SuggestionStatus,
  UrgencyLevel,
  UserRole,
} from '../types';

export type RoleToken = 'client' | 'admin' | 'super_admin' | 'staff';

export interface MockUser {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  role: UserRole;
  position_id: number | null;
  organization_name: string | null;
  avatar_url: string | null;
  contact_channel: string | null;
}

export interface MockPosition {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface MockCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface MockDataScope {
  key: string;
  label: string;
  description: string | null;
}

export interface MockStatus {
  id: number;
  entity_type: 'report' | 'request';
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  is_initial: boolean;
  is_final: boolean;
}

export interface MockTransition {
  id: number;
  entity_type: 'report' | 'request';
  from_status_key: string;
  to_status_key: string;
  allowed_roles: RoleToken[];
  requires_note: boolean;
  requires_attachment: boolean;
  requires_confirmation: boolean;
}

export interface MockReport {
  id: number;
  client_id: number;
  category_id: number | null;
  name: string;
  description: string;
  urgency: UrgencyLevel;
  is_entrapment: boolean;
  site_address: string | null;
  device_label: string | null;
  status_key: string;
  location: { lat: number; lng: number; accuracy: number | null } | null;
  location_mode: LocationMode;
  assigned_admin_id: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface MockRequest {
  id: number;
  report_id: number;
  name: string;
  description: string | null;
  status_key: string;
  created_at: string;
}

export interface MockAssignment {
  id: number;
  report_id: number;
  request_id: number | null;
  assignee_type: AssigneeType;
  assignee_id: number;
  position_id: number | null;
  data_scope: string;
  instruction: string | null;
  assigned_by_admin_id: number;
  assigned_at: string;
  revoked_at: string | null;
  completed_at: string | null;
}

export interface MockSuggestion {
  id: number;
  report_id: number;
  request_id: number | null;
  position_id: number;
  suggested_by_client_id: number;
  status: SuggestionStatus;
  reviewed_by_admin_id: number | null;
  reviewed_at: string | null;
  note: string | null;
  resulting_position_id: number | null;
  created_at: string;
}

export interface MockAttachment {
  id: number;
  report_id: number;
  request_id: number | null;
  type: AttachmentType;
  name: string;
  mime_type: string | null;
  size: number | null;
  uploaded_by_id: number;
  created_at: string;
}

export interface MockHistoryEntry {
  id: number;
  report_id: number;
  request_id: number | null;
  scope: 'report' | 'request' | 'assignment';
  label: string;
  description: string | null;
  actor_id: number | null;
  from_status_key: string | null;
  to_status_key: string | null;
  created_at: string;
}

export interface MockNotification {
  id: string;
  user_id: number;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  report_id: number | null;
  request_id: number | null;
  assignment_id: number | null;
}

export interface MockMediaSession {
  id: number;
  report_id: number;
  kind: 'camera' | 'audio' | 'location';
  started_at: string;
  ended_at: string | null;
}

export interface MockService {
  id: number;
  name: string;
  description: string | null;
  position_id: number | null;
  is_available: boolean;
}

export interface MockState {
  users: MockUser[];
  services: MockService[];
  positions: MockPosition[];
  categories: MockCategory[];
  dataScopes: MockDataScope[];
  statuses: MockStatus[];
  transitions: MockTransition[];
  reports: MockReport[];
  requests: MockRequest[];
  assignments: MockAssignment[];
  suggestions: MockSuggestion[];
  attachments: MockAttachment[];
  history: MockHistoryEntry[];
  notifications: MockNotification[];
  mediaSessions: MockMediaSession[];
  tokens: Record<string, number>;
  sequences: Record<string, number>;
}

const BASE = Date.parse('2026-08-20T08:00:00.000Z');

/** Deterministic timestamps so the demo data reads sensibly and tests stay stable. */
function at(minutesFromBase: number): string {
  return new Date(BASE + minutesFromBase * 60_000).toISOString();
}

export const POSITION_IDS = {
  technikWindowy: 1,
  konserwator: 2,
  ratownik: 3,
  elektryk: 4,
  dyspozytor: 5,
  kierownikSerwisu: 6,
  obslugaMieszkancow: 7,
} as const;

export const USER_IDS = {
  client: 1,
  admin: 2,
  staffTechnik: 3,
  staffKonserwator: 4,
  superAdmin: 5,
  clientSecondary: 6,
  staffElektryk: 7,
} as const;

function createStatuses(): MockStatus[] {
  return [
    {
      id: 1,
      entity_type: 'report',
      key: 'new',
      label: 'Nowe',
      description: 'Zgłoszenie oczekuje w kolejce globalnej.',
      color: '#2563EB',
      sort_order: 1,
      is_initial: true,
      is_final: false,
    },
    {
      id: 2,
      entity_type: 'report',
      key: 'accepted',
      label: 'Przyjęte',
      description: 'Zgłoszenie przyjęte przez administratora.',
      color: '#7C3AED',
      sort_order: 2,
      is_initial: false,
      is_final: false,
    },
    {
      id: 3,
      entity_type: 'report',
      key: 'in_progress',
      label: 'W realizacji',
      description: 'Trwa obsługa zgłoszenia.',
      color: '#0F766E',
      sort_order: 3,
      is_initial: false,
      is_final: false,
    },
    {
      id: 4,
      entity_type: 'report',
      key: 'waiting',
      label: 'Oczekuje',
      description: 'Obsługa wstrzymana do czasu spełnienia warunku.',
      color: '#B45309',
      sort_order: 4,
      is_initial: false,
      is_final: false,
    },
    {
      id: 5,
      entity_type: 'report',
      key: 'closed',
      label: 'Zakończone',
      description: 'Zgłoszenie zamknięte.',
      color: '#15803D',
      sort_order: 5,
      is_initial: false,
      is_final: true,
    },
    {
      id: 6,
      entity_type: 'report',
      key: 'cancelled',
      label: 'Anulowane',
      description: 'Zgłoszenie anulowane.',
      color: '#6B7280',
      sort_order: 6,
      is_initial: false,
      is_final: true,
    },
    {
      id: 7,
      entity_type: 'report',
      key: 'rejected',
      label: 'Odrzucone',
      description: 'Zgłoszenie odrzucone przez administratora.',
      color: '#B91C1C',
      sort_order: 7,
      is_initial: false,
      is_final: true,
    },
    {
      id: 11,
      entity_type: 'request',
      key: 'pending',
      label: 'Oczekuje',
      description: 'Zadanie czeka na rozpoczęcie.',
      color: '#2563EB',
      sort_order: 1,
      is_initial: true,
      is_final: false,
    },
    {
      id: 12,
      entity_type: 'request',
      key: 'in_progress',
      label: 'W realizacji',
      description: 'Zadanie jest realizowane.',
      color: '#0F766E',
      sort_order: 2,
      is_initial: false,
      is_final: false,
    },
    {
      id: 13,
      entity_type: 'request',
      key: 'done',
      label: 'Zrealizowane',
      description: 'Zadanie zakończone.',
      color: '#15803D',
      sort_order: 3,
      is_initial: false,
      is_final: true,
    },
    {
      id: 14,
      entity_type: 'request',
      key: 'cancelled',
      label: 'Anulowane',
      description: 'Zadanie anulowane.',
      color: '#6B7280',
      sort_order: 4,
      is_initial: false,
      is_final: true,
    },
  ];
}

function createTransitions(): MockTransition[] {
  const reportTransitions: Omit<MockTransition, 'id' | 'entity_type'>[] = [
    {
      from_status_key: 'new',
      to_status_key: 'accepted',
      allowed_roles: ['admin', 'super_admin'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: false,
    },
    {
      from_status_key: 'new',
      to_status_key: 'rejected',
      allowed_roles: ['admin', 'super_admin'],
      requires_note: true,
      requires_attachment: false,
      requires_confirmation: true,
    },
    {
      from_status_key: 'new',
      to_status_key: 'cancelled',
      allowed_roles: ['client'],
      requires_note: true,
      requires_attachment: false,
      requires_confirmation: true,
    },
    {
      from_status_key: 'accepted',
      to_status_key: 'in_progress',
      allowed_roles: ['admin', 'super_admin', 'staff'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: false,
    },
    {
      from_status_key: 'accepted',
      to_status_key: 'cancelled',
      allowed_roles: ['client'],
      requires_note: true,
      requires_attachment: false,
      requires_confirmation: true,
    },
    {
      from_status_key: 'in_progress',
      to_status_key: 'waiting',
      allowed_roles: ['admin', 'super_admin', 'staff'],
      requires_note: true,
      requires_attachment: false,
      requires_confirmation: false,
    },
    {
      from_status_key: 'waiting',
      to_status_key: 'in_progress',
      allowed_roles: ['admin', 'super_admin', 'staff'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: false,
    },
    {
      from_status_key: 'in_progress',
      to_status_key: 'closed',
      allowed_roles: ['admin', 'super_admin', 'client'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: true,
    },
    {
      from_status_key: 'waiting',
      to_status_key: 'closed',
      allowed_roles: ['admin', 'super_admin'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: true,
    },
  ];

  const requestTransitions: Omit<MockTransition, 'id' | 'entity_type'>[] = [
    {
      from_status_key: 'pending',
      to_status_key: 'in_progress',
      allowed_roles: ['admin', 'super_admin', 'staff'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: false,
    },
    {
      from_status_key: 'pending',
      to_status_key: 'cancelled',
      allowed_roles: ['admin', 'super_admin', 'client'],
      requires_note: true,
      requires_attachment: false,
      requires_confirmation: true,
    },
    {
      from_status_key: 'in_progress',
      to_status_key: 'done',
      allowed_roles: ['admin', 'super_admin', 'staff'],
      requires_note: true,
      requires_attachment: false,
      requires_confirmation: false,
    },
    {
      from_status_key: 'in_progress',
      to_status_key: 'pending',
      allowed_roles: ['admin', 'super_admin'],
      requires_note: false,
      requires_attachment: false,
      requires_confirmation: false,
    },
  ];

  let id = 0;

  return [
    ...reportTransitions.map((transition) => ({
      ...transition,
      id: ++id,
      entity_type: 'report' as const,
    })),
    ...requestTransitions.map((transition) => ({
      ...transition,
      id: ++id,
      entity_type: 'request' as const,
    })),
  ];
}

export function createDataset(): MockState {
  return {
    users: [
      {
        id: USER_IDS.client,
        name: 'Anna Kowalska',
        email: 'klient@codaro.test',
        password: 'haslo123',
        phone: '+48 600 100 100',
        role: 'client',
        position_id: null,
        organization_name: 'Wspólnota Kwiatowa 12',
        avatar_url: null,
        contact_channel: null,
      },
      {
        id: USER_IDS.admin,
        name: 'Marek Dyspozytor',
        email: 'admin@codaro.test',
        password: 'haslo123',
        phone: '+48 600 200 200',
        role: 'admin',
        position_id: null,
        organization_name: 'Dyspozytornia Lift-Serwis',
        avatar_url: null,
        contact_channel: 'dyspozytornia@codaro.test',
      },
      {
        id: USER_IDS.staffTechnik,
        name: 'Piotr Nowak',
        email: 'technik@codaro.test',
        password: 'haslo123',
        phone: '+48 600 300 300',
        role: 'staff',
        position_id: POSITION_IDS.technikWindowy,
        organization_name: 'Lift-Serwis — ekipa nr 2',
        avatar_url: null,
        contact_channel: 'serwis@codaro.test',
      },
      {
        id: USER_IDS.staffKonserwator,
        name: 'Katarzyna Lis',
        email: 'konserwator@codaro.test',
        password: 'haslo123',
        phone: '+48 600 400 400',
        role: 'staff',
        position_id: POSITION_IDS.konserwator,
        organization_name: 'Lift-Serwis — konserwacja',
        avatar_url: null,
        contact_channel: 'konserwacja@codaro.test',
      },
      {
        id: USER_IDS.superAdmin,
        name: 'Zofia Nadzór',
        email: 'hiperadmin@codaro.test',
        password: 'haslo123',
        phone: null,
        role: 'super_admin',
        position_id: null,
        organization_name: 'Lift-Serwis — kierownictwo',
        avatar_url: null,
        contact_channel: null,
      },
      {
        id: USER_IDS.clientSecondary,
        name: 'Zarząd Wspólnoty Słoneczna 5',
        email: 'klient2@codaro.test',
        password: 'haslo123',
        phone: '+48 600 500 500',
        role: 'client',
        position_id: null,
        organization_name: 'Wspólnota Mieszkaniowa Słoneczna 5',
        avatar_url: null,
        contact_channel: null,
      },
      {
        id: USER_IDS.staffElektryk,
        name: 'Tomasz Zieliński',
        email: 'elektryk@codaro.test',
        password: 'haslo123',
        phone: '+48 600 600 600',
        role: 'staff',
        position_id: POSITION_IDS.elektryk,
        organization_name: 'Lift-Serwis — instalacje',
        avatar_url: null,
        contact_channel: 'instalacje@codaro.test',
      },
    ],
    services: [
      {
        id: 1,
        name: 'Pogotowie windowe 24h',
        description: 'Zewnętrzna ekipa dyżurna — uwolnienia i awarie poza godzinami pracy.',
        position_id: POSITION_IDS.technikWindowy,
        is_available: true,
      },
      {
        id: 2,
        name: 'Straż pożarna — uwolnienie z kabiny',
        description: 'Służba zewnętrzna wzywana przy uwięzieniu osób lub zagrożeniu zdrowia.',
        position_id: POSITION_IDS.ratownik,
        is_available: true,
      },
      {
        id: 3,
        name: 'Kone-Tech — serwis producenta',
        description: 'Serwis gwarancyjny podnośników i sterowników.',
        position_id: POSITION_IDS.konserwator,
        is_available: false,
      },
    ],
    positions: [
      {
        id: POSITION_IDS.technikWindowy,
        name: 'Technik windowy',
        description: 'Diagnoza i naprawa napędu, drzwi i sterowania windy.',
        is_active: true,
      },
      {
        id: POSITION_IDS.konserwator,
        name: 'Konserwator',
        description: 'Przeglądy okresowe, konserwacja, dziennik urządzenia.',
        is_active: true,
      },
      {
        id: POSITION_IDS.ratownik,
        name: 'Ratownik',
        description: 'Uwolnienie osób z kabiny i pomoc w sytuacji zagrożenia.',
        is_active: true,
      },
      {
        id: POSITION_IDS.elektryk,
        name: 'Elektryk',
        description: 'Zasilanie, instalacja i sterowanie elektryczne w szybie.',
        is_active: true,
      },
      {
        id: POSITION_IDS.dyspozytor,
        name: 'Dyspozytor',
        description: 'Kontakt z osobą w kabinie i koordynacja ekip.',
        is_active: true,
      },
      {
        id: POSITION_IDS.kierownikSerwisu,
        name: 'Kierownik serwisu',
        description: 'Nadzór nad realizacją i odbiory techniczne.',
        is_active: true,
      },
      {
        id: POSITION_IDS.obslugaMieszkancow,
        name: 'Pracownik obsługi mieszkańców',
        description: 'Kontakt z zarządem wspólnoty i mieszkańcami.',
        is_active: true,
      },
    ],
    categories: [
      { id: 1, name: 'Uwięzienie w kabinie', description: 'Osoba zatrzymana w windzie — zgłoszenie ratunkowe.' },
      { id: 2, name: 'Awaria windy', description: 'Winda nie jeździ, staje między piętrami, hałasy.' },
      { id: 3, name: 'Uszkodzenie drzwi', description: 'Drzwi kabiny lub szybu nie domykają się.' },
      { id: 4, name: 'Konserwacja i przegląd', description: 'Przeglądy okresowe i prace planowe.' },
      { id: 5, name: 'Wandalizm / uszkodzenie kabiny', description: 'Zniszczenia w kabinie i na przystankach.' },
    ],
    dataScopes: [
      {
        key: 'minimal',
        label: 'Minimalny',
        description: 'Tylko treść zadania i status — bez danych kontaktowych zgłaszającego.',
      },
      {
        key: 'request_only',
        label: 'Tylko wskazane zadanie',
        description: 'Dane zadania, jego załączniki, adres obiektu i oznaczenie windy.',
      },
      {
        key: 'report_full',
        label: 'Pełne zgłoszenie',
        description: 'Całe zgłoszenie: zadania, załączniki, kontakt i lokalizacja obiektu.',
      },
    ],
    statuses: createStatuses(),
    transitions: createTransitions(),
    reports: [
      {
        id: 1,
        client_id: USER_IDS.client,
        category_id: 1,
        name: 'Uwięziona osoba w kabinie — Kwiatowa 12, winda A',
        description:
          'Winda stanęła między 3. a 4. piętrem, w kabinie jest jedna osoba. Kontakt telefoniczny utrzymany, osoba przytomna.',
        urgency: 'critical',
        is_entrapment: true,
        site_address: 'ul. Kwiatowa 12, 00-950 Warszawa',
        device_label: 'Winda A (kabina 1)',
        status_key: 'new',
        location: { lat: 52.2297, lng: 21.0122, accuracy: 12 },
        location_mode: 'one_time',
        assigned_admin_id: null,
        created_at: at(0),
        updated_at: at(0),
        closed_at: null,
      },
      {
        id: 2,
        client_id: USER_IDS.client,
        category_id: 2,
        name: 'Winda staje między piętrami — Słoneczna 5',
        description: 'Winda zatrzymuje się losowo między piętrami, po restarcie jeździ przez kilka godzin.',
        urgency: 'high',
        is_entrapment: false,
        site_address: 'ul. Słoneczna 5, 00-950 Warszawa',
        device_label: 'Winda osobowa (klatka II)',
        status_key: 'in_progress',
        location: { lat: 52.2401, lng: 21.0221, accuracy: 18 },
        location_mode: 'one_time',
        assigned_admin_id: USER_IDS.admin,
        created_at: at(-1440),
        updated_at: at(-60),
        closed_at: null,
      },
      {
        id: 3,
        client_id: USER_IDS.client,
        category_id: 3,
        name: 'Uszkodzone drzwi kabiny — Kwiatowa 12, winda B',
        description: 'Drzwi kabiny nie domykają się na parterze, winda blokuje się na kilka minut.',
        urgency: 'medium',
        is_entrapment: false,
        site_address: 'ul. Kwiatowa 12, 00-950 Warszawa',
        device_label: 'Winda B (kabina 2)',
        status_key: 'in_progress',
        location: { lat: 52.2297, lng: 21.0122, accuracy: 15 },
        location_mode: 'streaming',
        assigned_admin_id: USER_IDS.admin,
        created_at: at(-2880),
        updated_at: at(-120),
        closed_at: null,
      },
      {
        id: 4,
        client_id: USER_IDS.client,
        category_id: 4,
        name: 'Przegląd okresowy — Słoneczna 5',
        description: 'Przegląd zakończony, wpis w dzienniku konserwacji wykonany.',
        urgency: 'low',
        is_entrapment: false,
        site_address: 'ul. Słoneczna 5, 00-950 Warszawa',
        device_label: 'Winda osobowa (klatka II)',
        status_key: 'closed',
        location: null,
        location_mode: 'none',
        assigned_admin_id: USER_IDS.admin,
        created_at: at(-10080),
        updated_at: at(-8640),
        closed_at: at(-8640),
      },
      {
        id: 5,
        client_id: USER_IDS.clientSecondary,
        category_id: 1,
        name: 'Uwięzienie dwóch osób — Parkowa 3, winda towarowa',
        description: 'Dwie osoby uwięzione w windzie towarowej, brak zasilania w kabinie.',
        urgency: 'critical',
        is_entrapment: true,
        site_address: 'ul. Parkowa 3, 00-950 Warszawa',
        device_label: 'Winda towarowa (rampa)',
        status_key: 'new',
        location: { lat: 51.1079, lng: 17.0385, accuracy: 8 },
        location_mode: 'streaming',
        assigned_admin_id: null,
        created_at: at(-15),
        updated_at: at(-15),
        closed_at: null,
      },
      {
        id: 6,
        client_id: USER_IDS.clientSecondary,
        category_id: 2,
        name: 'Hałas w szybie windy — Kwiatowa 12',
        description: 'Głośne stukanie przy przejazdach między 1. a 2. piętrem, mieszkańcy zgłaszają hałas.',
        urgency: 'low',
        is_entrapment: false,
        site_address: 'ul. Kwiatowa 12, 00-950 Warszawa',
        device_label: 'Winda A (kabina 1)',
        status_key: 'new',
        location: null,
        location_mode: 'none',
        assigned_admin_id: null,
        created_at: at(-300),
        updated_at: at(-300),
        closed_at: null,
      },
    ],
    requests: [
      {
        id: 1,
        report_id: 1,
        name: 'Uwolnienie osoby z kabiny',
        description: 'Dojazd na miejsce, ręczne sprowadzenie kabiny na najbliższy przystanek, otwarcie drzwi.',
        status_key: 'pending',
        created_at: at(0),
      },
      {
        id: 2,
        report_id: 1,
        name: 'Diagnoza przyczyny zatrzymania',
        description: 'Sprawdzenie napędu, hamulca i sterowania po uwolnieniu pasażera.',
        status_key: 'pending',
        created_at: at(0),
      },
      {
        id: 3,
        report_id: 2,
        name: 'Wymiana czujnika pozycji',
        description: 'Diagnoza sterownika i wymiana czujnika zatrzymania na przystankach.',
        status_key: 'in_progress',
        created_at: at(-1440),
      },
      {
        id: 4,
        report_id: 3,
        name: 'Wymiana rolki drzwi kabiny',
        description: 'Wymiana zużytej rolki i regulacja mechanizmu drzwi kabiny.',
        status_key: 'in_progress',
        created_at: at(-2880),
      },
      {
        id: 5,
        report_id: 3,
        name: 'Wpis do dziennika konserwacji',
        description: 'Uzupełnienie dziennika urządzenia po naprawie drzwi.',
        status_key: 'pending',
        created_at: at(-2880),
      },
    ],
    assignments: [
      {
        id: 1,
        report_id: 2,
        request_id: null,
        assignee_type: 'staff',
        assignee_id: USER_IDS.staffKonserwator,
        position_id: POSITION_IDS.konserwator,
        data_scope: 'report_full',
        instruction: 'Klucz do maszynowni w skrzynce u dozorcy, kod 1548.',
        assigned_by_admin_id: USER_IDS.admin,
        assigned_at: at(-1400),
        revoked_at: null,
        completed_at: null,
      },
      {
        id: 2,
        report_id: 3,
        request_id: 4,
        assignee_type: 'staff',
        assignee_id: USER_IDS.staffTechnik,
        position_id: POSITION_IDS.technikWindowy,
        data_scope: 'request_only',
        instruction: 'Rolka na stanie w magazynie, winda wyłączona z ruchu na czas naprawy.',
        assigned_by_admin_id: USER_IDS.admin,
        assigned_at: at(-2800),
        revoked_at: null,
        completed_at: null,
      },
      {
        id: 3,
        report_id: 3,
        request_id: null,
        assignee_type: 'service',
        assignee_id: 1,
        position_id: POSITION_IDS.technikWindowy,
        data_scope: 'report_full',
        instruction: null,
        assigned_by_admin_id: USER_IDS.admin,
        assigned_at: at(-2700),
        revoked_at: null,
        completed_at: null,
      },
      {
        id: 4,
        report_id: 4,
        request_id: null,
        assignee_type: 'staff',
        assignee_id: USER_IDS.staffElektryk,
        position_id: POSITION_IDS.elektryk,
        data_scope: 'report_full',
        instruction: null,
        assigned_by_admin_id: USER_IDS.admin,
        assigned_at: at(-10000),
        revoked_at: at(-8700),
        completed_at: at(-8700),
      },
    ],
    suggestions: [
      {
        id: 1,
        report_id: 1,
        request_id: null,
        position_id: POSITION_IDS.ratownik,
        suggested_by_client_id: USER_IDS.client,
        status: 'pending',
        reviewed_by_admin_id: null,
        reviewed_at: null,
        note: 'W kabinie jest osoba — chyba potrzebny jest ratownik.',
        resulting_position_id: null,
        created_at: at(0),
      },
      {
        id: 2,
        report_id: 1,
        request_id: 2,
        position_id: POSITION_IDS.technikWindowy,
        suggested_by_client_id: USER_IDS.client,
        status: 'pending',
        reviewed_by_admin_id: null,
        reviewed_at: null,
        note: null,
        resulting_position_id: null,
        created_at: at(0),
      },
      {
        id: 3,
        report_id: 2,
        request_id: null,
        position_id: POSITION_IDS.konserwator,
        suggested_by_client_id: USER_IDS.client,
        status: 'accepted',
        reviewed_by_admin_id: USER_IDS.admin,
        reviewed_at: at(-1400),
        note: null,
        resulting_position_id: POSITION_IDS.konserwator,
        created_at: at(-1440),
      },
      {
        id: 4,
        report_id: 3,
        request_id: 4,
        position_id: POSITION_IDS.elektryk,
        suggested_by_client_id: USER_IDS.client,
        status: 'replaced',
        reviewed_by_admin_id: USER_IDS.admin,
        reviewed_at: at(-2800),
        note: 'Drzwi kabiny to zadanie dla technika windowego, nie elektryka.',
        resulting_position_id: POSITION_IDS.technikWindowy,
        created_at: at(-2880),
      },
    ],
    attachments: [
      {
        id: 1,
        report_id: 1,
        request_id: null,
        type: 'photo',
        name: 'panel-wezwania.jpg',
        mime_type: 'image/jpeg',
        size: 482_311,
        uploaded_by_id: USER_IDS.client,
        created_at: at(1),
      },
      {
        id: 2,
        report_id: 2,
        request_id: 3,
        type: 'file',
        name: 'protokol-przegladu.pdf',
        mime_type: 'application/pdf',
        size: 133_920,
        uploaded_by_id: USER_IDS.client,
        created_at: at(-1435),
      },
      {
        id: 3,
        report_id: 2,
        request_id: null,
        type: 'audio',
        name: 'wiadomosc-glosowa.m4a',
        mime_type: 'audio/m4a',
        size: 96_400,
        uploaded_by_id: USER_IDS.client,
        created_at: at(-1430),
      },
      {
        id: 4,
        report_id: 3,
        request_id: 4,
        type: 'photo',
        name: 'drzwi-kabiny.jpg',
        mime_type: 'image/jpeg',
        size: 331_002,
        uploaded_by_id: USER_IDS.client,
        created_at: at(-2870),
      },
      {
        id: 5,
        report_id: 3,
        request_id: 5,
        type: 'file',
        name: 'dziennik-konserwacji.pdf',
        mime_type: 'application/pdf',
        size: 74_120,
        uploaded_by_id: USER_IDS.client,
        created_at: at(-2860),
      },
    ],
    history: [
      {
        id: 1,
        report_id: 1,
        request_id: null,
        scope: 'report',
        label: 'Zgłoszenie utworzone',
        description: null,
        actor_id: USER_IDS.client,
        from_status_key: null,
        to_status_key: 'new',
        created_at: at(0),
      },
      {
        id: 2,
        report_id: 2,
        request_id: null,
        scope: 'report',
        label: 'Zgłoszenie utworzone',
        description: null,
        actor_id: USER_IDS.client,
        from_status_key: null,
        to_status_key: 'new',
        created_at: at(-1440),
      },
      {
        id: 3,
        report_id: 2,
        request_id: null,
        scope: 'report',
        label: 'Zmiana statusu zgłoszenia',
        description: null,
        actor_id: USER_IDS.admin,
        from_status_key: 'new',
        to_status_key: 'accepted',
        created_at: at(-1410),
      },
      {
        id: 4,
        report_id: 2,
        request_id: null,
        scope: 'assignment',
        label: 'Przypisano wykonawcę: Katarzyna Lis (Konserwator)',
        description: 'Zakres danych: Pełne zgłoszenie.',
        actor_id: USER_IDS.admin,
        from_status_key: null,
        to_status_key: null,
        created_at: at(-1400),
      },
      {
        id: 5,
        report_id: 2,
        request_id: null,
        scope: 'report',
        label: 'Zmiana statusu zgłoszenia',
        description: null,
        actor_id: USER_IDS.admin,
        from_status_key: 'accepted',
        to_status_key: 'in_progress',
        created_at: at(-1390),
      },
      {
        id: 6,
        report_id: 3,
        request_id: null,
        scope: 'report',
        label: 'Zgłoszenie utworzone',
        description: null,
        actor_id: USER_IDS.client,
        from_status_key: null,
        to_status_key: 'new',
        created_at: at(-2880),
      },
      {
        id: 7,
        report_id: 3,
        request_id: 4,
        scope: 'assignment',
        label: 'Przypisano wykonawcę do zadania: Piotr Nowak (Technik windowy)',
        description: 'Zakres danych: Tylko wskazane zadanie.',
        actor_id: USER_IDS.admin,
        from_status_key: null,
        to_status_key: null,
        created_at: at(-2800),
      },
      {
        id: 8,
        report_id: 3,
        request_id: 4,
        scope: 'request',
        label: 'Zmiana statusu zadania',
        description: null,
        actor_id: USER_IDS.staffTechnik,
        from_status_key: 'pending',
        to_status_key: 'in_progress',
        created_at: at(-2790),
      },
      {
        id: 9,
        report_id: 4,
        request_id: null,
        scope: 'report',
        label: 'Zmiana statusu zgłoszenia',
        description: 'Przegląd zakończony, wpis w dzienniku konserwacji wykonany.',
        actor_id: USER_IDS.admin,
        from_status_key: 'in_progress',
        to_status_key: 'closed',
        created_at: at(-8640),
      },
    ],
    notifications: [
      {
        id: 'n-1',
        user_id: USER_IDS.client,
        kind: 'report.status_changed',
        title: 'Zgłoszenie „Winda staje między piętrami — Słoneczna 5” w realizacji',
        body: 'Dyspozytor rozpoczął obsługę zgłoszenia.',
        read_at: null,
        created_at: at(-1390),
        report_id: 2,
        request_id: null,
        assignment_id: null,
      },
      {
        id: 'n-2',
        user_id: USER_IDS.client,
        kind: 'assignment.created',
        title: 'Do zgłoszenia przypisano wykonawcę',
        body: 'Katarzyna Lis (Konserwator) obsługuje Twoje zgłoszenie.',
        read_at: at(-1380),
        created_at: at(-1400),
        report_id: 2,
        request_id: null,
        assignment_id: 1,
      },
      {
        id: 'n-3',
        user_id: USER_IDS.admin,
        kind: 'report.created',
        title: 'UWIĘZIENIE — nowe zgłoszenie w kolejce',
        body: 'Uwięziona osoba w kabinie — Kwiatowa 12, winda A.',
        read_at: null,
        created_at: at(0),
        report_id: 1,
        request_id: null,
        assignment_id: null,
      },
      {
        id: 'n-4',
        user_id: USER_IDS.admin,
        kind: 'report.created',
        title: 'UWIĘZIENIE — nowe zgłoszenie w kolejce',
        body: 'Uwięzienie dwóch osób — Parkowa 3, winda towarowa.',
        read_at: null,
        created_at: at(-15),
        report_id: 5,
        request_id: null,
        assignment_id: null,
      },
      {
        id: 'n-5',
        user_id: USER_IDS.staffTechnik,
        kind: 'assignment.created',
        title: 'Nowe zadanie: Wymiana rolki drzwi kabiny',
        body: 'Przydział do zadania w zgłoszeniu „Uszkodzone drzwi kabiny — Kwiatowa 12, winda B”.',
        read_at: null,
        created_at: at(-2800),
        report_id: 3,
        request_id: 4,
        assignment_id: 2,
      },
      {
        id: 'n-6',
        user_id: USER_IDS.staffKonserwator,
        kind: 'assignment.created',
        title: 'Nowe zadanie: Winda staje między piętrami — Słoneczna 5',
        body: 'Przydział do całego zgłoszenia.',
        read_at: null,
        created_at: at(-1400),
        report_id: 2,
        request_id: null,
        assignment_id: 1,
      },
    ],
    mediaSessions: [
      {
        id: 1,
        report_id: 3,
        kind: 'location',
        started_at: at(-120),
        ended_at: null,
      },
      {
        id: 2,
        report_id: 5,
        kind: 'camera',
        started_at: at(-14),
        ended_at: null,
      },
    ],
    tokens: {},
    sequences: {
      report: 6,
      request: 5,
      assignment: 4,
      suggestion: 4,
      attachment: 5,
      history: 9,
      notification: 6,
      mediaSession: 2,
      token: 0,
    },
  };
}

let state: MockState = createDataset();

export function mockState(): MockState {
  return state;
}

/** Restores the pristine demo dataset — used between tests and on dev reload. */
export function resetMockData(): void {
  state = createDataset();
}

export function nextId(sequence: string): number {
  state.sequences[sequence] = (state.sequences[sequence] ?? 0) + 1;

  return state.sequences[sequence];
}

export function nowIso(): string {
  return new Date().toISOString();
}
