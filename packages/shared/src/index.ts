export type AvailabilityStatus =
  | "Available now"
  | "Available in 2 weeks"
  | "Open to offers"
  | "Contracted";

export interface RatingSummary {
  average: number;
  count: number;
  verifiedCount: number;
}

export type VerificationStatus = "unverified" | "pending" | "verified";

export interface VerificationCheck {
  id: string;
  label: string;
  description: string;
  status: VerificationStatus;
  verifiedAt: string | null;
}

export interface VerificationState {
  status: VerificationStatus;
  verifiedCount: number;
  totalCount: number;
  checks: VerificationCheck[];
}

export type SkillCategory =
  | "Vehicle & equipment"
  | "Mechanical"
  | "Compliance & safety"
  | "Logistics"
  | "Soft skills";

export type SkillLevel = "Familiar" | "Proficient" | "Expert";

export interface DriverSkill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
}

export type AvailabilityPeriodStatus = "Available" | "Hired" | "Tentative";

export interface AvailabilityPeriod {
  id: string;
  startDate: string;
  endDate: string | null;
  status: AvailabilityPeriodStatus;
  note: string;
  origin?: "driver" | "booking";
}

export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface Booking {
  id: string;
  driverId: string;
  driverName: string;
  companyId: string;
  companyName: string;
  startDate: string;
  endDate: string;
  routeType: string;
  origin: string;
  destination: string;
  originCountry: string;
  destinationCountry: string;
  note: string;
  status: BookingStatus;
  createdAt: string;
  availabilityPeriodId: string | null;
}

export interface CreateBookingInput {
  driverId: string;
  companyId: string;
  companyName: string;
  startDate: string;
  endDate: string;
  routeType: string;
  origin: string;
  destination: string;
  originCountry: string;
  destinationCountry: string;
  note: string;
}

export interface BookingDecisionInput {
  status: "accepted" | "declined";
}

export interface ProfileVisualIdentity {
  profileImageUrl: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  accentColor: string;
  tagline: string;
}

export interface ProfileVisualIdentityUpdate {
  profileImageUrl?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  accentColor?: string;
  tagline?: string;
}

export interface DriverSummary {
  id: string;
  name: string;
  city: string;
  country: string;
  headline: string;
  yearsExperience: number;
  availability: AvailabilityStatus;
  licenses: string[];
  languages: string[];
  countries: string[];
  preferredRegions: string[];
  routeTypes: string[];
  skills: DriverSkill[];
  availabilityPeriods: AvailabilityPeriod[];
  rating: RatingSummary;
  completedTransports: number;
  responseRate: number;
  profileVerified: boolean;
  verification: VerificationState;
  visualIdentity: ProfileVisualIdentity;
  lastActive: string;
}

export interface ReliabilityMetrics {
  onTimeRate: number;
  incidentFreeRate: number;
  documentsVerified: boolean;
}

export interface ExperienceItem {
  id: string;
  companyName: string;
  role: string;
  startDate: string;
  endDate: string | null;
  countries: string[];
  truckTypes: string[];
  description: string;
  verified: boolean;
}

export interface Review {
  id: string;
  subjectType: "driver" | "company";
  subjectId: string;
  authorType: "driver" | "company";
  authorId: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  routeType: string;
  occurredAt: string;
  verified: boolean;
}

export interface DriverProfile extends DriverSummary {
  bio: string;
  reliability: ReliabilityMetrics;
  experience: ExperienceItem[];
  reviews: Review[];
  bookings: Booking[];
}

export interface CompanySummary {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  fleetType: string;
  operatingRegions: string[];
  rating: RatingSummary;
  activeJobs: number;
  verified: boolean;
  verification: VerificationState;
  visualIdentity: ProfileVisualIdentity;
  responseTime: string;
}

export interface CompanyProfile extends CompanySummary {
  reviews: Review[];
  openJobs: Job[];
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  origin: string;
  destination: string;
  countries: string[];
  truckType: string;
  requiredLicense: string;
  languages: string[];
  startWindow: string;
  startDate: string;
  endDate: string;
  contractType: string;
  payBand: string;
  status: "Open" | "Interviewing" | "Paused";
  createdAt: string;
}

export interface CreateJobInput {
  companyId: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  countries: string[];
  truckType: string;
  requiredLicense: string;
  languages: string[];
  contractType: string;
  payBand: string;
}

export type InviteStatus = "pending" | "accepted" | "expired";

export interface Invite {
  id: string;
  companyId: string;
  companyName: string;
  driverEmail: string;
  driverName: string;
  note: string;
  status: InviteStatus;
  sentAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateInviteInput {
  driverEmail: string;
  driverName: string;
  note: string;
}

/** Max byte size for client-side image uploads (data URLs) in the mock demo. */
export const MAX_UPLOAD_BYTES = 1_500_000;

export interface MatchRecommendation extends DriverSummary {
  matchScore: number;
  matchReasons: string[];
  riskSignals: string[];
}

export interface DriverFilters {
  q?: string;
  country?: string;
  license?: string;
  language?: string;
  skill?: string;
  availability?: AvailabilityStatus;
  availableFrom?: string;
  availableTo?: string;
  minRating?: number;
  verified?: boolean;
}

export interface CreateReviewInput {
  subjectType: "driver" | "company";
  subjectId: string;
  authorType: "driver" | "company";
  authorId: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  routeType: string;
}

export interface VerificationSubmitInput {
  checkIds?: string[];
}

export interface AuthUser {
  role: "driver" | "company";
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface SignupInput {
  role: "driver" | "company";
  name: string;
  email: string;
  password: string;
  city?: string;
  country?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface DriverProfileUpdate {
  headline?: string;
  bio?: string;
  city?: string;
  country?: string;
  availability?: AvailabilityStatus;
  licenses?: string[];
  languages?: string[];
  countries?: string[];
  preferredRegions?: string[];
  routeTypes?: string[];
  skills?: Omit<DriverSkill, "id">[];
  availabilityPeriods?: Omit<AvailabilityPeriod, "id">[];
  visualIdentity?: ProfileVisualIdentityUpdate;
}

export interface CompanyProfileUpdate {
  description?: string;
  fleetType?: string;
  responseTime?: string;
  city?: string;
  country?: string;
  operatingRegions?: string[];
  visualIdentity?: ProfileVisualIdentityUpdate;
}

export interface Message {
  id: string;
  conversationId: string;
  senderRole: "driver" | "company";
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  counterpartId: string;
  counterpartName: string;
  counterpartRole: "driver" | "company";
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ConversationThread {
  id: string;
  counterpartId: string;
  counterpartName: string;
  counterpartRole: "driver" | "company";
  messages: Message[];
}

export interface DemoAccount {
  role: "driver" | "company";
  id: string;
  name: string;
  email: string;
  note: string;
  accessLabel: string;
}

export const DEMO_PASSWORD = "demo1234";

export const demoDriverNames = {
  "driver-mateo-kovac": "Demo Driver 01",
  "driver-anna-nowak": "Demo Driver 02",
  "driver-luis-martin": "Demo Driver 03",
  "driver-jelena-petrovic": "Demo Driver 04",
  "driver-ovidiu-ionescu": "Demo Driver 05",
  "driver-tomas-eriksen": "Demo Driver 06",
  "driver-nikola-jovanovic": "Demo Driver 07",
  "driver-mira-horvat": "Demo Driver 08",
  "driver-erik-weiss": "Demo Driver 09",
  "driver-amina-haddad": "Demo Driver 10",
  "driver-petra-kovacova": "Demo Driver 11",
  "driver-sofia-rossi": "Demo Driver 12",
  "driver-david-oconnor": "Demo Driver 13",
  "driver-kateryna-shevchenko": "Demo Driver 14",
  "driver-luka-kralj": "Demo Driver 15",
  "driver-lea-schneider": "Demo Driver 16",
  "driver-ioannis-papadopoulos": "Demo Driver 17"
} as const;

export const demoAccounts = [
  {
    role: "company",
    id: "company-nordtrail",
    name: "NordTrail Logistics GmbH",
    email: "admin@nordtrail.eu",
    note: "Hamburg dispatch admin · refrigerated and ADR lanes",
    accessLabel: "Company admin"
  },
  {
    role: "company",
    id: "company-adriatrans",
    name: "AdriaTrans Group",
    email: "admin@adriatrans.eu",
    note: "Ljubljana operations admin · Balkans and port freight",
    accessLabel: "Company admin"
  },
  {
    role: "company",
    id: "company-iberiafreight",
    name: "Iberia Freight Network",
    email: "admin@iberiafreight.eu",
    note: "Valencia network admin · Iberia and France lanes",
    accessLabel: "Company admin"
  },
  {
    role: "company",
    id: "company-alpinefreight",
    name: "Alpine Freight Labs AG",
    email: "admin@alpinefreight.eu",
    note: "Innsbruck fleet admin · DACH high-value freight",
    accessLabel: "Company admin"
  },
  {
    role: "company",
    id: "company-balticroute",
    name: "BalticRoute Carriers",
    email: "admin@balticroute.eu",
    note: "Gdansk operations admin · Baltics and Nordics",
    accessLabel: "Company admin"
  },
  {
    role: "driver",
    id: "driver-nikola-jovanovic",
    name: demoDriverNames["driver-nikola-jovanovic"],
    email: "driver-07@roadcred.demo",
    note: "New profile · finish verification from 0/5 to 5/5",
    accessLabel: "Driver login"
  },
  {
    role: "driver",
    id: "driver-mateo-kovac",
    name: demoDriverNames["driver-mateo-kovac"],
    email: "driver-01@roadcred.demo",
    note: "Verified senior CE driver · refrigerated freight",
    accessLabel: "Driver login"
  },
  {
    role: "driver",
    id: "driver-anna-nowak",
    name: demoDriverNames["driver-anna-nowak"],
    email: "driver-02@roadcred.demo",
    note: "ADR route lead · Benelux and Germany lanes",
    accessLabel: "Driver login"
  },
  {
    role: "driver",
    id: "driver-mira-horvat",
    name: demoDriverNames["driver-mira-horvat"],
    email: "driver-08@roadcred.demo",
    note: "High-value freight driver · DACH and Northern Italy",
    accessLabel: "Driver login"
  },
  {
    role: "driver",
    id: "driver-erik-weiss",
    name: demoDriverNames["driver-erik-weiss"],
    email: "driver-09@roadcred.demo",
    note: "Baltic-Nordic curtainsider driver · winter routes",
    accessLabel: "Driver login"
  }
] as const satisfies readonly DemoAccount[];

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}
