import { DEMO_PASSWORD, demoAccounts } from "@roadcred/shared";
import type {
  ApiEnvelope,
  AuthResult,
  AuthUser,
  Booking,
  BookingDecisionInput,
  CompanyProfile,
  CompanyProfileUpdate,
  CompanySummary,
  ConversationSummary,
  ConversationThread,
  CreateBookingInput,
  CreateInviteInput,
  CreateJobInput,
  CreateReviewInput,
  DriverProfile,
  DriverProfileUpdate,
  DriverSummary,
  Invite,
  Job,
  MatchRecommendation,
  Message,
  Review,
  SignupInput,
  VerificationState
} from "@roadcred/shared";

export type Role = "company" | "driver";
export type Session = AuthUser;

const TOKEN_KEY = "roadcred-token";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export interface DriverFilterState {
  q: string;
  country: string;
  license: string;
  language: string;
  skill: string;
  availability: string;
  availableFrom: string;
  availableTo: string;
  minRating: string;
  verified: boolean;
}

export const defaultDriverFilters: DriverFilterState = {
  q: "",
  country: "",
  license: "",
  language: "",
  skill: "",
  availability: "",
  availableFrom: "",
  availableTo: "",
  minRating: "",
  verified: false
};

type RequestOptions = { method?: string; json?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.json);
  }

  const response = await fetch(path, init);
  const payload = (await response.json()) as ApiEnvelope<T> | { error: string };
  if (!response.ok) {
    throw new Error("error" in payload ? payload.error : `Request failed: ${response.status}`);
  }
  return (payload as ApiEnvelope<T>).data;
}

export function buildDriverQuery(filters: DriverFilterState): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.country) params.set("country", filters.country);
  if (filters.license) params.set("license", filters.license);
  if (filters.language) params.set("language", filters.language);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.availableFrom) params.set("availableFrom", filters.availableFrom);
  if (filters.availableTo) params.set("availableTo", filters.availableTo);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.verified) params.set("verified", "true");
  return `/api/drivers?${params.toString()}`;
}

export const api = {
  listDrivers: (filters: DriverFilterState) => request<DriverSummary[]>(buildDriverQuery(filters)),
  getDriver: (id: string) => request<DriverProfile>(`/api/drivers/${id}`),
  listCompanies: () => request<CompanySummary[]>("/api/companies"),
  getCompany: (id: string) => request<CompanyProfile>(`/api/companies/${id}`),
  listJobs: (companyId?: string) =>
    request<Job[]>(companyId ? `/api/jobs?companyId=${companyId}` : "/api/jobs"),
  getMatches: (companyId: string) => request<MatchRecommendation[]>(`/api/matches/company/${companyId}`),
  createReview: (input: CreateReviewInput) => request<Review>("/api/reviews", { method: "POST", json: input }),
  createBooking: (input: CreateBookingInput) => request<Booking>("/api/bookings", { method: "POST", json: input }),
  respondToBooking: (id: string, decision: BookingDecisionInput) =>
    request<Booking>(`/api/bookings/${id}/respond`, { method: "POST", json: decision }),
  listBookingsForCompany: (companyId: string) =>
    request<Booking[]>(`/api/bookings?companyId=${encodeURIComponent(companyId)}`),
  createJob: (input: CreateJobInput) => request<Job>("/api/jobs", { method: "POST", json: input }),
  createInvite: (input: CreateInviteInput) => request<Invite>("/api/invites", { method: "POST", json: input }),
  listInvites: (companyId: string) => request<Invite[]>(`/api/invites?companyId=${encodeURIComponent(companyId)}`),
  listPendingInvites: (email: string) =>
    request<Invite[]>(`/api/invites/pending?email=${encodeURIComponent(email)}`),
  submitVerification: (role: Role, id: string, checkIds?: string[]) =>
    request<VerificationState>(`/api/${role === "company" ? "companies" : "drivers"}/${id}/verification`, {
      method: "POST",
      json: checkIds ? { checkIds } : {}
    }),
  // auth
  login: (email: string, password: string) =>
    request<AuthResult>("/api/auth/login", { method: "POST", json: { email, password } }),
  signup: (input: SignupInput) => request<AuthResult>("/api/auth/signup", { method: "POST", json: input }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<AuthUser>("/api/auth/me"),
  // editing
  updateDriver: (id: string, update: DriverProfileUpdate) =>
    request<DriverProfile>(`/api/drivers/${id}`, { method: "PUT", json: update }),
  updateCompany: (id: string, update: CompanyProfileUpdate) =>
    request<CompanyProfile>(`/api/companies/${id}`, { method: "PUT", json: update }),
  // messaging
  listConversations: () => request<ConversationSummary[]>("/api/conversations"),
  startConversation: (counterpartId: string) =>
    request<ConversationSummary>("/api/conversations", { method: "POST", json: { counterpartId } }),
  getConversation: (id: string) => request<ConversationThread>(`/api/conversations/${id}`),
  sendMessage: (id: string, body: string) =>
    request<Message>(`/api/conversations/${id}/messages`, { method: "POST", json: { body } })
};

export { DEMO_PASSWORD };

export const driverDemoAccounts = demoAccounts.filter((account) => account.role === "driver");

export const companyDemoAccounts = demoAccounts.filter((account) => account.role === "company");

export const countryOptions = [
  "Germany",
  "Netherlands",
  "Austria",
  "Croatia",
  "Poland",
  "Spain",
  "France",
  "Denmark",
  "Serbia",
  "Romania"
];

export const licenseOptions = ["CE", "ADR", "Refrigerated", "Oversized", "Tanker", "C", "C1E"];
export const languageOptions = ["English", "French", "German", "Italian", "Spanish", "Serbian", "Polish"];
export const availabilityOptions = [
  "Available now",
  "Open to offers",
  "Available in 2 weeks",
  "Contracted"
];
export const skillCategoryOptions = [
  "Vehicle & equipment",
  "Mechanical",
  "Compliance & safety",
  "Logistics",
  "Soft skills"
];
export const skillLevelOptions = ["Familiar", "Proficient", "Expert"];
export const skillOptions = [
  "Refrigerated / temperature control",
  "ADR dangerous-goods handling",
  "Oversized / abnormal loads",
  "Tanker operation (food-grade & chemical)",
  "Forklift operation",
  "Roadside mechanical troubleshooting",
  "Preventive maintenance reporting",
  "Customs & cross-border paperwork",
  "Export documentation"
];
