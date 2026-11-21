import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  Gauge,
  Globe2,
  Languages,
  LogOut,
  MapPin,
  MessageSquareText,
  MessagesSquare,
  Pencil,
  Route,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Truck,
  Users
} from "lucide-react";
import type {
  Booking,
  CompanyProfile,
  DriverProfile,
  DriverSummary,
  Invite,
  Job,
  MatchRecommendation,
  Review,
  VerificationState
} from "@roadcred/shared";
import {
  api,
  availabilityOptions,
  countryOptions,
  defaultDriverFilters,
  languageOptions,
  licenseOptions,
  skillOptions,
  type DriverFilterState,
  type Session
} from "./api";
import {
  AvailabilityCalendar,
  Metric,
  ProfileHero,
  ProfileLocation,
  ProfileMark,
  ProfileMediaGallery,
  RatingPill,
  ReviewModal,
  ScoreRing,
  SkillGroups,
  TagList,
  VerificationPanel,
  VerificationPill,
  VerifiedBadge,
  groupByDate,
  routeLabel
} from "./ui";
import { BrandLockup } from "./Landing";
import { LocaleSelector } from "./LocaleSelector";
import { MessagingView } from "./Messaging";
import { BookDriverModal, EditCompanyModal, InviteDriverModal, PostRouteModal } from "./editors";
import { type TranslationKey, useI18n } from "./i18n";

type ViewKey = "discover" | "matches" | "routes" | "reputation" | "company" | "messages";

const navItems: { key: ViewKey; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { key: "discover", labelKey: "company.nav.discover", icon: <Search size={18} /> },
  { key: "matches", labelKey: "company.nav.matches", icon: <Gauge size={18} /> },
  { key: "routes", labelKey: "company.nav.routes", icon: <Route size={18} /> },
  { key: "messages", labelKey: "company.nav.messages", icon: <MessagesSquare size={18} /> },
  { key: "reputation", labelKey: "company.nav.reputation", icon: <ShieldCheck size={18} /> },
  { key: "company", labelKey: "company.nav.company", icon: <Building2 size={18} /> }
];

const viewTitles: Record<ViewKey, { eyebrowKey: TranslationKey; titleKey: TranslationKey }> = {
  discover: { eyebrowKey: "company.view.discover.eyebrow", titleKey: "company.view.discover.title" },
  matches: { eyebrowKey: "company.view.matches.eyebrow", titleKey: "company.view.matches.title" },
  routes: { eyebrowKey: "company.view.routes.eyebrow", titleKey: "company.view.routes.title" },
  messages: { eyebrowKey: "company.view.messages.eyebrow", titleKey: "company.view.messages.title" },
  reputation: { eyebrowKey: "company.view.reputation.eyebrow", titleKey: "company.view.reputation.title" },
  company: { eyebrowKey: "company.view.company.eyebrow", titleKey: "company.view.company.title" }
};

function ReviewCard({
  review,
  showAuthor = true,
  onAuthorClick
}: {
  review: Review;
  showAuthor?: boolean;
  onAuthorClick?: (review: Review) => void;
}) {
  return (
    <article className="review-row">
      <div className="row">
        <strong className="title">{review.title}</strong>
        <RatingPill average={review.rating} />
      </div>
      {showAuthor && onAuthorClick ? (
        <button type="button" className="sub author-link" onClick={() => onAuthorClick(review)}>
          {review.authorName}
        </button>
      ) : (
        <span className="sub">{showAuthor ? review.authorName : review.routeType}</span>
      )}
      <p>{review.comment}</p>
    </article>
  );
}

function FiltersPanel({
  filters,
  onChange
}: {
  filters: DriverFilterState;
  onChange: (filters: DriverFilterState) => void;
}) {
  const { t, translateValue } = useI18n();

  return (
    <section className="surface filters-panel" aria-label={t("company.filters.aria")}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("company.filters.eyebrow")}</span>
          <h2>{t("company.filters.title")}</h2>
        </div>
        <span className="head-icon">
          <Filter size={18} />
        </span>
      </div>

      <label className="search-field">
        <Search size={18} />
        <input
          value={filters.q}
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
          placeholder={t("company.filters.searchPlaceholder")}
        />
      </label>

      <div className="filter-grid">
        <label>
          {t("company.filters.country")}
          <select value={filters.country} onChange={(event) => onChange({ ...filters, country: event.target.value })}>
            <option value="">{t("company.filters.anyCountry")}</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {translateValue("country", country)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("company.filters.license")}
          <select value={filters.license} onChange={(event) => onChange({ ...filters, license: event.target.value })}>
            <option value="">{t("company.filters.anyLicense")}</option>
            {licenseOptions.map((license) => (
              <option key={license}>{license}</option>
            ))}
          </select>
        </label>

        <label>
          {t("company.filters.language")}
          <select value={filters.language} onChange={(event) => onChange({ ...filters, language: event.target.value })}>
            <option value="">{t("company.filters.anyLanguage")}</option>
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {translateValue("language", language)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("company.filters.skill")}
          <select value={filters.skill} onChange={(event) => onChange({ ...filters, skill: event.target.value })}>
            <option value="">{t("company.filters.anySkill")}</option>
            {skillOptions.map((skill) => (
              <option key={skill} value={skill}>
                {translateValue("skill", skill)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("company.filters.availability")}
          <select
            value={filters.availability}
            onChange={(event) => onChange({ ...filters, availability: event.target.value })}
          >
            <option value="">{t("company.filters.anyStatus")}</option>
            {availabilityOptions.map((availability) => (
              <option key={availability} value={availability}>
                {translateValue("availability", availability)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("company.filters.minRating")}
          <select value={filters.minRating} onChange={(event) => onChange({ ...filters, minRating: event.target.value })}>
            <option value="">{t("company.filters.anyRating")}</option>
            <option value="4.0">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </label>
      </div>

      <div className="availability-search">
        <div className="availability-search-head">
          <CalendarRange size={16} />
          {t("company.filters.availableBetween")}
        </div>
        <div className="date-range">
          <label>
            {t("company.filters.from")}
            <input
              type="date"
              value={filters.availableFrom}
              onChange={(event) => onChange({ ...filters, availableFrom: event.target.value })}
            />
          </label>
          <label>
            {t("company.filters.to")}
            <input
              type="date"
              value={filters.availableTo}
              onChange={(event) => onChange({ ...filters, availableTo: event.target.value })}
            />
          </label>
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={filters.verified}
          onChange={(event) => onChange({ ...filters, verified: event.target.checked })}
        />
        {t("company.filters.verifiedOnly")}
      </label>
    </section>
  );
}

function DriverCard({
  driver,
  active,
  onSelect
}: {
  driver: DriverSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const { translateValue } = useI18n();

  return (
    <button className={`driver-card ${active ? "is-active" : ""}`} onClick={onSelect} type="button">
      <div className="driver-card-header">
        <ProfileMark type="driver" name={driver.name} visualIdentity={driver.visualIdentity} compact />
        <div>
          <div className="name-line">
            <strong>{driver.name}</strong>
            {driver.profileVerified ? <VerifiedBadge /> : <VerificationPill status={driver.verification.status} />}
          </div>
          <span>
            {driver.city}, {translateValue("country", driver.country)}
          </span>
        </div>
      </div>

      <p>{driver.headline}</p>

      <div className="driver-card-meta">
        <RatingPill average={driver.rating.average} count={driver.rating.count} />
        <span className="availability">{translateValue("availability", driver.availability)}</span>
      </div>

      <TagList items={driver.licenses.slice(0, 3)} tone="strong" />
    </button>
  );
}

function DriverDetail({
  driver,
  viewerCompanyId,
  onReview,
  onMessage,
  onBook,
  onFilterTag
}: {
  driver: DriverProfile | null;
  viewerCompanyId: string;
  onReview: (driver: DriverProfile) => void;
  onMessage: (driver: DriverProfile) => void;
  onBook: (driver: DriverProfile, presetStart?: string) => void;
  onFilterTag: (field: "license" | "language" | "country" | "skill", value: string) => void;
}) {
  const { t } = useI18n();

  if (!driver) {
    return (
      <section className="surface profile-empty">
        <div className="empty-icon">
          <Users size={28} />
        </div>
        <h2>{t("company.empty.selectDriver.title")}</h2>
        <p>{t("company.empty.selectDriver.body")}</p>
      </section>
    );
  }

  return (
    <section className="surface profile-panel">
      <ProfileHero type="driver" name={driver.name} visualIdentity={driver.visualIdentity}>
        <div className="name-line profile-name">
          <h2>{driver.name}</h2>
          {driver.profileVerified ? <VerifiedBadge size={20} /> : null}
          <VerificationPill status={driver.verification.status} />
        </div>
        <p>{driver.visualIdentity.tagline || driver.headline}</p>
        {driver.visualIdentity.tagline ? <span className="profile-subtitle">{driver.headline}</span> : null}
        <ProfileLocation city={driver.city} country={driver.country} />
      </ProfileHero>
      <ProfileMediaGallery visualIdentity={driver.visualIdentity} />

      <div className="profile-actions">
        <button type="button" className="primary-button" onClick={() => onBook(driver)}>
          <CalendarRange size={17} />
          {t("booking.cta")}
        </button>
        <button type="button" className="secondary-button" onClick={() => onMessage(driver)}>
          <MessageSquareText size={17} />
          {t("company.driver.startConversation")}
        </button>
        <button type="button" className="secondary-button" onClick={() => onReview(driver)}>
          <Star size={17} />
          {t("company.driver.leaveReview")}
        </button>
      </div>

      <div className="metric-grid">
        <Metric label={t("common.rating")} value={driver.rating.average.toFixed(1)} icon={<Star size={18} />} />
        <Metric label={t("common.verifiedReviews")} value={driver.rating.verifiedCount} icon={<ShieldCheck size={18} />} />
        <Metric label={t("common.experience")} value={t("common.yearsShort", { count: driver.yearsExperience })} icon={<Truck size={18} />} />
        <Metric label={t("common.onTimeRate")} value={`${driver.reliability.onTimeRate}%`} icon={<Clock3 size={18} />} />
      </div>

      <div className="profile-section">
        <h3>{t("common.availability")}</h3>
        <AvailabilityCalendar
          periods={driver.availabilityPeriods}
          bookings={driver.bookings ?? []}
          viewerCompanyId={viewerCompanyId}
          onDayClick={(date) => onBook(driver, date)}
        />
      </div>

      <div className="profile-section">
        <h3>{t("company.driver.operatingFit")}</h3>
        <div className="fit-grid">
          <div>
            <span>{t("common.licenses")}</span>
            <TagList items={driver.licenses} tone="strong" onTagClick={(value) => onFilterTag("license", value)} />
          </div>
          <div>
            <span>{t("common.languages")}</span>
            <TagList items={driver.languages} valueNamespace="language" onTagClick={(value) => onFilterTag("language", value)} />
          </div>
          <div>
            <span>{t("common.countries")}</span>
            <TagList items={driver.countries} valueNamespace="country" onTagClick={(value) => onFilterTag("country", value)} />
          </div>
          <div>
            <span>{t("common.routeTypes")}</span>
            <TagList items={driver.routeTypes} tone="warm" />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>{t("common.skillsSpecialties")}</h3>
        <SkillGroups skills={driver.skills} onSkillClick={(name) => onFilterTag("skill", name)} />
      </div>

      <div className="profile-section">
        <h3>{t("common.publicSummary")}</h3>
        <p className="bio">{driver.bio}</p>
      </div>

      <div className="profile-section">
        <h3>{t("common.experienceHistory")}</h3>
        <div className="timeline">
          {driver.experience.map((item) => (
            <article key={item.id} className="timeline-item">
              <div className="row">
                <div>
                  <strong className="role">{item.role}</strong>
                  <span className="company">{item.companyName}</span>
                </div>
                <span className="period">
                  {item.startDate} – {item.endDate ?? t("common.present")}
                </span>
              </div>
              <p>{item.description}</p>
              <TagList items={[...item.countries.slice(0, 4), ...item.truckTypes.slice(0, 2)]} valueNamespace="country" />
            </article>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <h3>{t("common.verification")}</h3>
        <VerificationPanel
          role="driver"
          id={driver.id}
          verification={driver.verification}
          canManage={false}
          onUpdated={() => undefined}
        />
      </div>

      <div className="profile-section">
        <h3>{t("common.recentReviews")}</h3>
        <div className="review-list">
          {driver.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JobsPanel({ jobs }: { jobs: Job[] }) {
  const { t } = useI18n();

  return (
    <section className="surface compact-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t("company.jobs.eyebrow")}</span>
          <h2>{t("company.jobs.title")}</h2>
        </div>
        <span className="head-icon">
          <BriefcaseBusiness size={18} />
        </span>
      </div>

      <div className="job-list">
        {jobs.map((job) => (
          <article className="job-row" key={job.id}>
            <div className="row">
              <strong className="title">{job.title}</strong>
            </div>
            <span className="lane">
              {job.origin} → {job.destination}
            </span>
            <TagList items={[job.requiredLicense, job.truckType, job.status]} tone="strong" />
            <p>
              {job.startWindow} · {job.contractType} · {job.payBand}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MatchBoard({
  matches,
  jobs,
  companyName,
  onOpenDriver
}: {
  matches: MatchRecommendation[];
  jobs: Job[];
  companyName: string;
  onOpenDriver: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="match-layout">
      <section className="surface matches-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("company.matches.eyebrow")}</span>
            <h2>{t("company.matches.title", { name: companyName })}</h2>
          </div>
          <span className="head-icon">
            <Gauge size={18} />
          </span>
        </div>

        <div className="match-list">
          {matches.map((match) => (
            <article
              className="match-row clickable-row"
              key={match.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDriver(match.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenDriver(match.id);
                }
              }}
            >
              <ScoreRing value={match.matchScore} />
              <div className="match-body">
                <div className="name-line">
                  <strong>{match.name}</strong>
                  {match.profileVerified ? <VerifiedBadge size={15} /> : null}
                  <RatingPill average={match.rating.average} count={match.rating.count} />
                  <span className="row-open-cue">{t("company.driver.viewProfile")} →</span>
                </div>
                <p>{match.headline}</p>
                <div className="score-track">
                  <span style={{ width: `${match.matchScore}%` }} />
                </div>
                <TagList items={match.matchReasons} tone="strong" />
                {match.riskSignals.length > 0 ? (
                  <div className="risk-line">
                    <TrendingUp size={14} />
                    {match.riskSignals.join(" · ")}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <JobsPanel jobs={jobs} />
    </div>
  );
}

function CompanyProfileView({
  company,
  onVerificationUpdated,
  onEdit,
  onOpenDriver
}: {
  company: CompanyProfile;
  onVerificationUpdated: (state: VerificationState) => void;
  onEdit: () => void;
  onOpenDriver: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="company-layout">
      <section className="surface company-panel">
        <ProfileHero type="company" name={company.name} visualIdentity={company.visualIdentity}>
          <div className="name-line profile-name">
            <h2>{company.name}</h2>
            {company.verified ? <VerifiedBadge size={20} /> : null}
            <VerificationPill status={company.verification.status} />
          </div>
          <p className="company-desc">{company.visualIdentity.tagline || company.description}</p>
          {company.visualIdentity.tagline ? <span className="profile-subtitle">{company.description}</span> : null}
          <ProfileLocation city={company.city} country={company.country} />
        </ProfileHero>
        <ProfileMediaGallery visualIdentity={company.visualIdentity} />

        <div className="profile-actions">
          <button type="button" className="secondary-button" onClick={onEdit}>
            <Pencil size={16} /> {t("company.profile.edit")}
          </button>
        </div>

        <div className="metric-grid">
          <Metric label={t("company.profile.rating")} value={company.rating.average.toFixed(1)} icon={<Star size={18} />} />
          <Metric label={t("company.profile.openJobs")} value={company.activeJobs} icon={<BriefcaseBusiness size={18} />} />
          <Metric label={t("common.response")} value={company.responseTime} icon={<Clock3 size={18} />} variant="text" />
          <Metric label={t("common.fleet")} value={company.fleetType} icon={<Truck size={18} />} variant="text" />
        </div>

        <div className="profile-section">
          <h3>{t("common.operatingRegions")}</h3>
          <TagList items={company.operatingRegions} tone="strong" />
        </div>

        <div className="profile-section">
          <h3>{t("common.verification")}</h3>
          <VerificationPanel
            role="company"
            id={company.id}
            verification={company.verification}
            canManage
            onUpdated={onVerificationUpdated}
          />
        </div>

        <div className="profile-section">
          <h3>{t("company.profile.driverReviews")}</h3>
          <div className="review-list">
            {company.reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onAuthorClick={(entry) => onOpenDriver(entry.authorId)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ReputationPanel({
  company,
  driver
}: {
  company: CompanyProfile | null;
  driver: DriverProfile | null;
}) {
  const companyReviews = company?.reviews ?? [];
  const driverReviews = driver?.reviews ?? [];
  const { t } = useI18n();

  return (
    <div className="reputation-grid">
      <section className="surface reputation-summary">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("company.reputation.eyebrow")}</span>
            <h2>{t("company.reputation.title")}</h2>
          </div>
          <span className="head-icon">
            <ShieldCheck size={18} />
          </span>
        </div>

        <div className="metric-grid">
          <Metric label={t("company.reputation.driverRating")} value={driver ? driver.rating.average.toFixed(1) : "—"} icon={<Star size={18} />} />
          <Metric
            label={t("company.reputation.verifiedDriverReviews")}
            value={driver ? driver.rating.verifiedCount : "—"}
            icon={<CheckCircle2 size={18} />}
          />
          <Metric label={t("company.reputation.companyRating")} value={company ? company.rating.average.toFixed(1) : "—"} icon={<Building2 size={18} />} />
          <Metric label={t("company.reputation.companyReviews")} value={company ? company.rating.count : "—"} icon={<MessageSquareText size={18} />} />
        </div>
      </section>

      <section className="surface compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("company.reputation.driverSide")}</span>
            <h2>{driver?.name ?? t("company.reputation.selectedDriver")}</h2>
          </div>
        </div>
        <div className="review-list">
          {driverReviews.map((review) => (
            <ReviewCard key={review.id} review={review} showAuthor={false} />
          ))}
        </div>
      </section>

      <section className="surface compact-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("company.reputation.companySide")}</span>
            <h2>{company?.name ?? t("common.company")}</h2>
          </div>
        </div>
        <div className="review-list">
          {companyReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BookingStatusChip({ status }: { status: Booking["status"] }) {
  const { t } = useI18n();
  const key = status === "accepted" ? "confirmed" : status;
  return <span className={`status-chip status-${status}`}>{t(`routes.bookingStatus.${key}` as TranslationKey)}</span>;
}

function downloadContract(booking: Booking, t: (key: TranslationKey, vars?: Record<string, string | number>) => string): void {
  const lines = [
    `RoadCred — ${t("routes.contract.title")}`,
    "",
    `${t("routes.contract.bookingId")}: ${booking.id}`,
    `${t("common.driver")}: ${booking.driverName}`,
    `${t("common.transportCompany")}: ${booking.companyName}`,
    `${t("job.form.from")} → ${t("job.form.to")}: ${routeLabel(booking) || "—"}`,
    `${t("routes.dates")}: ${booking.startDate} – ${booking.endDate}`,
    `${t("routes.status")}: ${booking.status}`,
    `${t("routes.contract.bookedOn")}: ${booking.createdAt.slice(0, 10)}`,
    booking.note ? `${t("invite.form.note")}: ${booking.note}` : ""
  ].filter(Boolean);
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `contract-${booking.id}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function RouteBookingCard({
  booking,
  onOpenDriver
}: {
  booking: Booking;
  onOpenDriver: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <article className="route-card">
      <div className="route-card-head">
        <span className="route-lane">
          <MapPin size={15} /> {routeLabel(booking) || booking.routeType || "—"}
        </span>
        <BookingStatusChip status={booking.status} />
      </div>
      <div className="route-card-meta">
        <span>
          <CalendarRange size={14} /> {booking.startDate} – {booking.endDate}
        </span>
        <button type="button" className="route-driver-link" onClick={() => onOpenDriver(booking.driverId)}>
          <Truck size={14} /> {booking.driverName}
        </button>
      </div>
      <div className="contract-record">
        <div className="contract-head">
          <span className="contract-title">{t("routes.contract.title")}</span>
          <button type="button" className="ghost-button contract-download" onClick={() => downloadContract(booking, t)}>
            <Download size={14} /> {t("routes.contract.save")}
          </button>
        </div>
        <dl className="contract-grid">
          <div>
            <dt>{t("routes.contract.bookingId")}</dt>
            <dd>{booking.id}</dd>
          </div>
          <div>
            <dt>{t("routes.contract.bookedOn")}</dt>
            <dd>{booking.createdAt.slice(0, 10)}</dd>
          </div>
        </dl>
        {booking.note ? <p className="contract-note">{booking.note}</p> : null}
      </div>
    </article>
  );
}

function RoutesActivityView({
  bookings,
  jobs,
  invites,
  today,
  onOpenDriver
}: {
  bookings: Booking[];
  jobs: Job[];
  invites: Invite[];
  today: string;
  onOpenDriver: (id: string) => void;
}) {
  const { t } = useI18n();
  const relevant = bookings.filter((booking) => booking.status === "accepted" || booking.status === "pending");
  const groups: { key: "active" | "upcoming" | "past"; labelKey: TranslationKey; items: Booking[] }[] = [
    { key: "active", labelKey: "routes.group.active", items: [] },
    { key: "upcoming", labelKey: "routes.group.upcoming", items: [] },
    { key: "past", labelKey: "routes.group.past", items: [] }
  ];
  relevant.forEach((booking) => {
    const bucket = groupByDate(booking, today);
    groups.find((group) => group.key === bucket)?.items.push(booking);
  });
  const pendingInvites = invites.filter((invite) => invite.status === "pending");
  const hasAny = relevant.length > 0 || jobs.length > 0 || pendingInvites.length > 0;

  return (
    <div className="routes-view">
      {!hasAny ? <p className="empty-hint">{t("routes.empty")}</p> : null}

      <section className="surface routes-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("routes.openRoutes.eyebrow")}</span>
            <h2>{t("routes.openRoutes.title", { count: jobs.length })}</h2>
          </div>
          <span className="head-icon">
            <Route size={18} />
          </span>
        </div>
        {jobs.length === 0 ? (
          <p className="empty-hint">{t("routes.openRoutes.empty")}</p>
        ) : (
          <div className="open-routes-grid">
            {jobs.map((job) => (
              <article key={job.id} className="open-route-card">
                <div className="route-card-head">
                  <span className="route-lane">
                    <MapPin size={15} /> {job.origin} → {job.destination}
                  </span>
                  <span className="status-chip status-open">{job.status}</span>
                </div>
                <strong className="open-route-title">{job.title}</strong>
                <div className="route-card-meta">
                  <span>
                    <CalendarRange size={14} /> {job.startDate && job.endDate ? `${job.startDate} – ${job.endDate}` : job.startWindow}
                  </span>
                  <span>
                    <Truck size={14} /> {job.truckType || job.requiredLicense}
                  </span>
                </div>
                <span className="open-route-pay">{job.payBand}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface routes-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("routes.hired.eyebrow")}</span>
            <h2>{t("routes.hired.title", { count: relevant.length })}</h2>
          </div>
          <span className="head-icon">
            <Truck size={18} />
          </span>
        </div>
        {relevant.length === 0 ? (
          <p className="empty-hint">{t("routes.hired.empty")}</p>
        ) : (
          <div className="routes-groups">
            {groups.map((group) => (
              <div key={group.key} className="route-group">
                <h3>
                  {t(group.labelKey)} <span className="route-group-count">{group.items.length}</span>
                </h3>
                {group.items.length === 0 ? (
                  <p className="empty-hint subtle">{t("routes.group.empty")}</p>
                ) : (
                  <div className="route-cards">
                    {group.items.map((booking) => (
                      <RouteBookingCard key={booking.id} booking={booking} onOpenDriver={onOpenDriver} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {pendingInvites.length > 0 ? (
        <section className="surface routes-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("routes.invites.eyebrow")}</span>
              <h2>{t("routes.invites.title", { count: pendingInvites.length })}</h2>
            </div>
            <span className="head-icon">
              <Users size={18} />
            </span>
          </div>
          <div className="invite-list">
            {pendingInvites.map((invite) => (
              <article key={invite.id} className="invite-row">
                <div className="row">
                  <strong>{invite.driverName}</strong>
                  <span className="status-chip status-pending">{t("invite.status.pending")}</span>
                </div>
                <span className="sub">{invite.driverEmail}</span>
                {invite.note ? <p>{invite.note}</p> : null}
                <span className="invite-meta">
                  <Clock3 size={13} /> {t("pending.invites.sentOn", { date: invite.sentAt.slice(0, 10) })}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function CompanyApp({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<ViewKey>("discover");
  const [filters, setFilters] = useState<DriverFilterState>(defaultDriverFilters);
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("driver-mateo-kovac");
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<DriverProfile | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [bookingTarget, setBookingTarget] = useState<{ driver: DriverProfile; presetStart: string } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [postingRoute, setPostingRoute] = useState(false);
  const [inviting, setInviting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const openDriverProfile = useCallback((id: string) => {
    setSelectedDriverId(id);
    setOpenProfile(true);
  }, []);

  const startConversation = useCallback(async (driver: DriverProfile) => {
    try {
      const conversation = await api.startConversation(driver.id);
      setActiveConversationId(conversation.id);
      setActiveView("messages");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.conversation.start"));
    }
  }, [t]);

  const loadCompanyContext = useCallback(async () => {
    try {
      const [companyPayload, jobsPayload, matchesPayload, bookingsPayload, invitesPayload] = await Promise.all([
        api.getCompany(session.id),
        api.listJobs(session.id),
        api.getMatches(session.id),
        api.listBookingsForCompany(session.id),
        api.listInvites(session.id)
      ]);
      setCompany(companyPayload);
      setJobs(jobsPayload);
      setMatches(matchesPayload);
      setBookings(bookingsPayload);
      setInvites(invitesPayload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.companyContext.load"));
    }
  }, [session.id, t]);

  useEffect(() => {
    void loadCompanyContext();
  }, [loadCompanyContext]);

  useEffect(() => {
    const loadDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const driverPayload = await api.listDrivers(filters);
        setDrivers(driverPayload);
        setError(null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t("error.drivers.load"));
      } finally {
        setLoadingDrivers(false);
      }
    };
    void loadDrivers();
  }, [filters, t]);

  const loadDriverProfile = useCallback(async (id: string) => {
    try {
      const profile = await api.getDriver(id);
      setSelectedDriver(profile);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.driverProfile.load"));
    }
  }, [t]);

  useEffect(() => {
    void loadDriverProfile(selectedDriverId);
  }, [selectedDriverId, loadDriverProfile]);

  const refreshDrivers = useCallback(async () => {
    try {
      setDrivers(await api.listDrivers(filters));
    } catch {
      /* ignore refresh errors */
    }
  }, [filters]);

  const goDiscover = (next: DriverFilterState) => {
    setFilters(next);
    setOpenProfile(false);
    setActiveView("discover");
  };

  const topMetrics = useMemo(
    () => [
      {
        label: t("company.metrics.verifiedDrivers"),
        value: drivers.filter((d) => d.profileVerified).length,
        icon: <ShieldCheck size={18} />,
        onClick: () => goDiscover({ ...defaultDriverFilters, verified: true })
      },
      {
        label: t("company.metrics.driversInMarket"),
        value: drivers.length,
        icon: <Users size={18} />,
        onClick: () => goDiscover(defaultDriverFilters)
      },
      {
        label: t("company.metrics.marketRegions"),
        value: company?.operatingRegions.length ?? "—",
        icon: <Globe2 size={18} />,
        onClick: () => goDiscover(defaultDriverFilters)
      },
      {
        label: t("company.metrics.languagesCovered"),
        value: new Set(drivers.flatMap((driver) => driver.languages)).size,
        icon: <Languages size={18} />,
        onClick: () => goDiscover(defaultDriverFilters)
      }
    ],
    [company?.operatingRegions.length, drivers, t]
  );

  const heading = viewTitles[activeView];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandLockup />

        <nav className="side-nav" aria-label={t("common.mainNavigation")}>
          <span className="side-label">{t("company.workspace")}</span>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={activeView === item.key ? "active" : ""}
              onClick={() => setActiveView(item.key)}
              type="button"
            >
              {item.icon}
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <div className="account-panel">
          <div className="account-id">
            <div className="account-avatar">
              <Building2 size={18} />
            </div>
            <div>
              <span>{t("common.signedInAs")}</span>
              <strong>{session.name}</strong>
            </div>
          </div>
          <LocaleSelector />
          <button type="button" className="signout-button" onClick={onSignOut}>
            <LogOut size={15} /> {t("common.signOut")}
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              <Route size={13} /> {t(heading.eyebrowKey)}
            </span>
            <h1>{t(heading.titleKey)}</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="secondary-button" onClick={() => setPostingRoute(true)}>
              <Route size={17} />
              {t("company.action.postRoute")}
            </button>
            <button type="button" className="primary-button" onClick={() => setInviting(true)}>
              <Users size={17} />
              {t("company.action.inviteDriver")}
            </button>
          </div>
        </header>

        {error ? (
          <div className="error-banner">
            <ShieldCheck size={17} />
            {error}
          </div>
        ) : null}

        <section className="metrics-strip" aria-label={t("company.metrics.aria")}>
          {topMetrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} onClick={metric.onClick} />
          ))}
        </section>

        {activeView === "discover" ? (
          openProfile && selectedDriver ? (
            <div className="profile-view">
              <button type="button" className="back-button" onClick={() => setOpenProfile(false)}>
                <ArrowLeft size={16} /> {t("common.back")}
              </button>
              <DriverDetail
                driver={selectedDriver}
                viewerCompanyId={session.id}
                onReview={(driver) => setReviewTarget(driver)}
                onMessage={startConversation}
                onBook={(driver, presetStart) => setBookingTarget({ driver, presetStart: presetStart ?? "" })}
                onFilterTag={(field, value) => {
                  setFilters({ ...defaultDriverFilters, [field]: value });
                  setOpenProfile(false);
                }}
              />
            </div>
          ) : (
            <div className="browse-layout">
              <FiltersPanel filters={filters} onChange={setFilters} />
              <section className="surface driver-results">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{t("common.results")}</span>
                    <h2>{loadingDrivers ? t("company.results.searching") : t("company.results.count", { count: drivers.length })}</h2>
                  </div>
                </div>
                {loadingDrivers ? (
                  <div className="driver-grid">
                    <div className="skeleton" />
                    <div className="skeleton" />
                    <div className="skeleton" />
                    <div className="skeleton" />
                    <div className="skeleton" />
                    <div className="skeleton" />
                  </div>
                ) : drivers.length === 0 ? (
                  <p className="empty-hint">{t("company.results.empty")}</p>
                ) : (
                  <div className="driver-grid">
                    {drivers.map((driver) => (
                      <DriverCard
                        key={driver.id}
                        driver={driver}
                        active={driver.id === selectedDriverId}
                        onSelect={() => openDriverProfile(driver.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )
        ) : null}

        {activeView === "matches" ? (
          <MatchBoard
            matches={matches}
            jobs={jobs}
            companyName={company?.name ?? session.name}
            onOpenDriver={(id) => {
              openDriverProfile(id);
              setActiveView("discover");
            }}
          />
        ) : null}

        {activeView === "routes" ? (
          <RoutesActivityView
            bookings={bookings}
            jobs={jobs}
            invites={invites}
            today={today}
            onOpenDriver={(id) => {
              openDriverProfile(id);
              setActiveView("discover");
            }}
          />
        ) : null}

        {activeView === "messages" ? (
          <MessagingView session={session} openConversationId={activeConversationId} />
        ) : null}

        {activeView === "reputation" ? <ReputationPanel company={company} driver={selectedDriver} /> : null}

        {activeView === "company" && company ? (
          <CompanyProfileView
            company={company}
            onVerificationUpdated={(state) => setCompany({ ...company, verification: state, verified: state.status === "verified" })}
            onEdit={() => setEditingCompany(true)}
            onOpenDriver={(id) => {
              openDriverProfile(id);
              setActiveView("discover");
            }}
          />
        ) : null}
      </main>

      {editingCompany && company ? (
        <EditCompanyModal company={company} onClose={() => setEditingCompany(false)} onSaved={setCompany} />
      ) : null}

      {reviewTarget ? (
        <ReviewModal
          subjectType="driver"
          subjectId={reviewTarget.id}
          subjectName={reviewTarget.name}
          author={session}
          defaultRouteType={reviewTarget.routeTypes[0] ?? "General"}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            void loadDriverProfile(reviewTarget.id);
            void refreshDrivers();
          }}
        />
      ) : null}

      {bookingTarget ? (
        <BookDriverModal
          driver={bookingTarget.driver}
          author={session}
          presetStart={bookingTarget.presetStart}
          onClose={() => setBookingTarget(null)}
          onBooked={() => {
            void loadDriverProfile(bookingTarget.driver.id);
            void loadCompanyContext();
            void refreshDrivers();
          }}
        />
      ) : null}

      {postingRoute ? (
        <PostRouteModal
          author={session}
          onClose={() => setPostingRoute(false)}
          onCreated={() => {
            void loadCompanyContext();
            setPostingRoute(false);
            setActiveView("routes");
          }}
        />
      ) : null}

      {inviting ? (
        <InviteDriverModal
          author={session}
          onClose={() => setInviting(false)}
          onInvited={() => {
            void loadCompanyContext();
          }}
        />
      ) : null}
    </div>
  );
}
