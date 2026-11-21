import { useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  Loader2,
  MapPinned,
  MessageSquareText,
  Route,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
  Upload,
  Users,
  Wrench,
  X
} from "lucide-react";
import type {
  AvailabilityPeriod,
  Booking,
  CreateReviewInput,
  DriverSkill,
  ProfileVisualIdentity,
  Review,
  VerificationState,
  VerificationStatus
} from "@roadcred/shared";
import { MAX_UPLOAD_BYTES } from "@roadcred/shared";
import { api, type Role, type Session } from "./api";
import { type TranslationKey, type ValueNamespace, useI18n } from "./i18n";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function profileStyle(accentColor?: string): React.CSSProperties | undefined {
  return accentColor ? ({ "--profile-accent": accentColor } as React.CSSProperties) : undefined;
}

export function Avatar({
  name,
  large = false,
  imageUrl = "",
  accentColor
}: {
  name: string;
  large?: boolean;
  imageUrl?: string;
  accentColor?: string;
}) {
  return (
    <div className={`avatar ${large ? "avatar-large" : ""}`} style={profileStyle(accentColor)}>
      {imageUrl ? <img src={imageUrl} alt="" /> : initials(name)}
    </div>
  );
}

export function ProfileMark({
  type,
  name,
  visualIdentity,
  large = false,
  compact = false
}: {
  type: "driver" | "company";
  name: string;
  visualIdentity: ProfileVisualIdentity;
  large?: boolean;
  compact?: boolean;
}) {
  if (type === "driver") {
    return (
      <Avatar
        name={name}
        large={large}
        imageUrl={visualIdentity.profileImageUrl}
        accentColor={visualIdentity.accentColor}
      />
    );
  }

  return (
    <div
      className={`company-mark profile-mark ${large ? "profile-mark-large" : ""} ${compact ? "small" : ""}`}
      style={profileStyle(visualIdentity.accentColor)}
    >
      {visualIdentity.profileImageUrl ? <img src={visualIdentity.profileImageUrl} alt="" /> : <Building2 size={compact ? 20 : 30} />}
    </div>
  );
}

export function ProfileHero({
  type,
  name,
  visualIdentity,
  children
}: {
  type: "driver" | "company";
  name: string;
  visualIdentity: ProfileVisualIdentity;
  children: React.ReactNode;
}) {
  return (
    <div className="profile-hero" style={profileStyle(visualIdentity.accentColor)}>
      <div className={`profile-cover ${visualIdentity.coverImageUrl ? "has-image" : ""}`}>
        {visualIdentity.coverImageUrl ? <img src={visualIdentity.coverImageUrl} alt="" /> : null}
      </div>
      <div className="profile-hero-row">
        <ProfileMark type={type} name={name} visualIdentity={visualIdentity} large />
        <div className="profile-hero-copy">{children}</div>
      </div>
    </div>
  );
}

export function ProfileMediaGallery({ visualIdentity }: { visualIdentity: ProfileVisualIdentity }) {
  if (visualIdentity.galleryImageUrls.length === 0) {
    return null;
  }

  return (
    <div className="profile-gallery">
      {visualIdentity.galleryImageUrls.map((url) => (
        <img key={url} src={url} alt="" />
      ))}
    </div>
  );
}

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  const { t } = useI18n();
  return <BadgeCheck size={size} className="verified-badge" aria-label={t("common.verified")} />;
}

export function RatingPill({ average, count }: { average: number; count?: number }) {
  const { t } = useI18n();

  return (
    <span className="rating-pill">
      <Star size={15} />
      {average.toFixed(1)}
      {typeof count === "number" ? <span>{count} {t("common.reviews")}</span> : null}
    </span>
  );
}

export function RatingStars({ value }: { value: number }) {
  const { t } = useI18n();

  return (
    <span className="rating-stars" aria-label={t("rating.outOfFive", { value })}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} size={15} className={index <= Math.round(value) ? "on" : "off"} />
      ))}
    </span>
  );
}

export function TagList({
  items,
  tone = "neutral",
  valueNamespace,
  onTagClick
}: {
  items: string[];
  tone?: "neutral" | "strong" | "warm";
  valueNamespace?: ValueNamespace;
  onTagClick?: (value: string) => void;
}) {
  const { translateValue } = useI18n();

  return (
    <div className="tag-list">
      {items.map((item) => {
        const label = valueNamespace ? translateValue(valueNamespace, item) : item;
        return onTagClick ? (
          <button type="button" className={`tag tag-${tone} tag-button`} key={item} onClick={() => onTagClick(item)}>
            {label}
          </button>
        ) : (
          <span className={`tag tag-${tone}`} key={item}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function Metric({
  label,
  value,
  icon,
  variant = "number",
  onClick
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "number" | "text";
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={`metric metric-${variant} metric-button`} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={`metric metric-${variant}`}>{inner}</div>;
}

export function ScoreRing({ value, size = 76 }: { value: number; size?: number }) {
  const { t } = useI18n();
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  const center = size / 2;

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f7bf0" />
            <stop offset="100%" stopColor="#1f47cf" />
          </linearGradient>
        </defs>
        <circle className="track" cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="bar"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="label">
        <strong>{value}</strong>
        <span>{t("common.fit")}</span>
      </div>
    </div>
  );
}

const verificationCopy: Record<VerificationStatus, { labelKey: TranslationKey; icon: React.ReactNode }> = {
  verified: { labelKey: "common.verified", icon: <ShieldCheck size={14} /> },
  pending: { labelKey: "common.inReview", icon: <Clock3 size={14} /> },
  unverified: { labelKey: "common.unverified", icon: <ShieldAlert size={14} /> }
};

export function VerificationPill({ status }: { status: VerificationStatus }) {
  const { t } = useI18n();
  const copy = verificationCopy[status];
  return (
    <span className={`verif-pill verif-${status}`}>
      {copy.icon}
      {t(copy.labelKey)}
    </span>
  );
}

const categoryIcons: Record<DriverSkill["category"], React.ReactNode> = {
  "Vehicle & equipment": <Truck size={15} />,
  Mechanical: <Wrench size={15} />,
  "Compliance & safety": <ShieldCheck size={15} />,
  Logistics: <Route size={15} />,
  "Soft skills": <Users size={15} />
};

export function SkillGroups({ skills, onSkillClick }: { skills: DriverSkill[]; onSkillClick?: (name: string) => void }) {
  const { translateValue } = useI18n();
  const grouped = useMemo(() => {
    const map = new Map<DriverSkill["category"], DriverSkill[]>();
    skills.forEach((skill) => {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    });
    return Array.from(map.entries());
  }, [skills]);

  return (
    <div className="skill-groups">
      {grouped.map(([category, list]) => (
        <div className="skill-group" key={category}>
          <div className="skill-group-head">
            <span className="skill-cat-icon">{categoryIcons[category]}</span>
            {translateValue("skillCategory", category)}
          </div>
          <div className="skill-chips">
            {list.map((skill) =>
              onSkillClick ? (
                <button
                  type="button"
                  className={`skill-chip level-${skill.level.toLowerCase()} skill-chip-button`}
                  key={skill.id}
                  onClick={() => onSkillClick(skill.name)}
                >
                  {translateValue("skill", skill.name)}
                  <em>{translateValue("skillLevel", skill.level)}</em>
                </button>
              ) : (
                <span className={`skill-chip level-${skill.level.toLowerCase()}`} key={skill.id}>
                  {translateValue("skill", skill.name)}
                  <em>{translateValue("skillLevel", skill.level)}</em>
                </span>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function toDate(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

export function AvailabilityTimeline({
  periods,
  months = 8
}: {
  periods: AvailabilityPeriod[];
  months?: number;
}) {
  const { locale, t } = useI18n();
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + months, 1).getTime();
  const span = windowEnd - windowStart;

  const monthLabels = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return { label: date.toLocaleString(locale, { month: "short" }), left: (index / months) * 100 };
  });

  const bars = periods
    .map((period) => {
      const start = Math.max(toDate(period.startDate), windowStart);
      const end = period.endDate ? Math.min(toDate(period.endDate), windowEnd) : windowEnd;
      if (end <= windowStart || start >= windowEnd) {
        return null;
      }
      return {
        id: period.id,
        status: period.status,
        note: period.note,
        left: ((start - windowStart) / span) * 100,
        width: Math.max(((end - start) / span) * 100, 1.5)
      };
    })
    .filter((bar): bar is NonNullable<typeof bar> => bar !== null);

  return (
    <div className="timeline-av">
      <div className="tav-track">
        {monthLabels.map((month) => (
          <span className="tav-grid" key={month.label + month.left} style={{ left: `${month.left}%` }} />
        ))}
        {bars.map((bar) => (
          <span
            key={bar.id}
            className={`tav-bar tav-${bar.status.toLowerCase()}`}
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
            title={`${bar.status} — ${bar.note}`}
          />
        ))}
      </div>
      <div className="tav-months">
        {monthLabels.map((month) => (
          <span key={month.label + month.left} style={{ left: `${month.left}%` }}>
            {month.label}
          </span>
        ))}
      </div>
      <div className="tav-legend">
        <span className="tav-key tav-available">{t("availability.available")}</span>
        <span className="tav-key tav-tentative">{t("availability.tentative")}</span>
        <span className="tav-key tav-hired">{t("availability.hired")}</span>
      </div>
    </div>
  );
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type CalendarDayStatus = "hired" | "reserved" | "tentative" | "available" | "free";

export function AvailabilityCalendar({
  periods,
  bookings = [],
  onDayClick,
  viewerCompanyId,
  readOnly = false
}: {
  periods: AvailabilityPeriod[];
  bookings?: Booking[];
  onDayClick?: (date: string) => void;
  /** When set, this company's own PENDING bookings show as blue "Reserved"; other companies' pending bookings stay hidden. */
  viewerCompanyId?: string;
  /** Driver's own calendar — never clickable and never shows any company's reservation. */
  readOnly?: boolean;
}) {
  const { locale, t } = useI18n();
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  const viewMonth = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const header = viewMonth.toLocaleString(locale, { month: "long", year: "numeric" });

  const covers = (booking: Booking, iso: string) => booking.startDate <= iso && booking.endDate >= iso;

  const statusForDay = (iso: string): CalendarDayStatus => {
    // Accepted bookings = "Hired" (red), visible to everyone.
    if (bookings.some((booking) => booking.status === "accepted" && covers(booking, iso))) {
      return "hired";
    }
    // A pending request the VIEWING company made = "Reserved" (blue), only that company sees it.
    if (
      viewerCompanyId &&
      bookings.some((booking) => booking.status === "pending" && booking.companyId === viewerCompanyId && covers(booking, iso))
    ) {
      return "reserved";
    }
    const hit = periods.find((period) => period.startDate <= iso && (period.endDate === null || period.endDate >= iso));
    if (!hit) {
      return "free";
    }
    return hit.status.toLowerCase() as "hired" | "tentative" | "available";
  };

  const dayTitle = (status: CalendarDayStatus, clickable: boolean): string => {
    if (status === "free") {
      return clickable ? t("availability.clickToBook") : "";
    }
    const label = t(`availability.${status}` as TranslationKey);
    return clickable ? `${label} · ${t("availability.clickToBook")}` : label;
  };

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const lead = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: ({ iso: string; day: number } | null)[] = [];
  for (let i = 0; i < lead; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: ymd(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)), day });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 1 + index).toLocaleString(locale, { weekday: "short" })
  );

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="icon-button" onClick={() => setMonthOffset((value) => value - 1)} aria-label={t("common.back")}>
          <ChevronLeft size={16} />
        </button>
        <strong className="cal-title">{header}</strong>
        <button type="button" className="icon-button" onClick={() => setMonthOffset((value) => value + 1)} aria-label={t("calendar.next")}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="cal-weekdays">
        {weekdays.map((weekday, index) => (
          <span key={`${weekday}-${index}`}>{weekday}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`blank-${index}`} className="cal-day cal-empty" />;
          }
          const status = statusForDay(cell.iso);
          // Bookable on any day that isn't already taken (hired) or reserved by you.
          const clickable = !readOnly && Boolean(onDayClick) && status !== "hired" && status !== "reserved";
          return (
            <button
              type="button"
              key={cell.iso}
              className={`cal-day cal-${status}${clickable ? " cal-clickable" : ""}`}
              disabled={!clickable}
              onClick={clickable ? () => onDayClick?.(cell.iso) : undefined}
              title={dayTitle(status, clickable)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="cal-legend">
        <span className="cal-key cal-available" title={t("availability.legend.availableTip")}>
          {t("availability.available")}
        </span>
        <span className="cal-key cal-tentative" title={t("availability.legend.tentativeTip")}>
          {t("availability.tentative")}
        </span>
        <span className="cal-key cal-hired" title={t("availability.legend.hiredTip")}>
          {t("availability.hired")}
        </span>
        {viewerCompanyId ? (
          <span className="cal-key cal-reserved" title={t("availability.legend.reservedTip")}>
            {t("availability.reserved")}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** "Hamburg → Rotterdam" from a route-bearing record, falling back to routeType. */
export function routeLabel(route: { origin?: string; destination?: string; routeType?: string }): string {
  if (route.origin && route.destination) {
    return `${route.origin} → ${route.destination}`;
  }
  return route.routeType ?? "";
}

/** Bucket a dated record relative to `today` (YYYY-MM-DD). Open-ended (empty end) counts as active once started. */
export function groupByDate(
  range: { startDate: string; endDate: string },
  today: string
): "active" | "upcoming" | "past" {
  const { startDate, endDate } = range;
  if (endDate && endDate < today) {
    return "past";
  }
  if (startDate && startDate > today) {
    return "upcoming";
  }
  return "active";
}

export function ImageUploadField({
  label,
  value,
  onChange,
  hint
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  hint?: string;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t("profile.media.uploadSize"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      onChange(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => setError(t("profile.media.uploadError"));
    reader.readAsDataURL(file);
  };

  return (
    <div className="upload-field">
      <span className="field-label">{label}</span>
      {value ? (
        <img className="upload-preview" src={value} alt={label} />
      ) : (
        <div className="upload-placeholder">
          <ImagePlus size={22} />
          <span>{hint ?? t("profile.media.uploadHint")}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="upload-input"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="upload-actions">
        <button type="button" className="secondary-button upload-button" onClick={() => inputRef.current?.click()}>
          <Upload size={15} />
          {value ? t("profile.media.changeImage") : t("profile.media.selectFile")}
        </button>
        {value ? (
          <button type="button" className="ghost-button upload-button" onClick={() => onChange("")}>
            <Trash2 size={15} />
            {t("profile.media.removeImage")}
          </button>
        ) : null}
      </div>
      {error ? <span className="upload-error">{error}</span> : null}
    </div>
  );
}

export function GalleryUploadField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const accepted = Array.from(files).filter((file) => file.size <= MAX_UPLOAD_BYTES);
    if (accepted.length < files.length) {
      setError(t("profile.media.uploadSize"));
    }
    let pending = accepted.length;
    if (pending === 0) {
      return;
    }
    const collected: string[] = [];
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          collected.push(reader.result);
        }
        pending -= 1;
        if (pending === 0) {
          onChange([...value, ...collected]);
        }
      };
      reader.onerror = () => {
        setError(t("profile.media.uploadError"));
        pending -= 1;
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="upload-field">
      <span className="field-label">{label}</span>
      {value.length > 0 ? (
        <div className="gallery-upload-grid">
          {value.map((url, index) => (
            <div key={`${url.slice(0, 24)}-${index}`} className="gallery-upload-item">
              <img src={url} alt={`${label} ${index + 1}`} />
              <button
                type="button"
                className="gallery-remove"
                aria-label={t("profile.media.removeImage")}
                onClick={() => onChange(value.filter((_, position) => position !== index))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="upload-placeholder">
          <ImagePlus size={22} />
          <span>{t("profile.media.uploadHint")}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="upload-input"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="upload-actions">
        <button type="button" className="secondary-button upload-button" onClick={() => inputRef.current?.click()}>
          <Upload size={15} />
          {t("profile.media.selectFile")}
        </button>
      </div>
      {error ? <span className="upload-error">{error}</span> : null}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((index) => (
        <button
          key={index}
          type="button"
          className={index <= active ? "on" : "off"}
          onMouseEnter={() => setHover(index)}
          onClick={() => onChange(index)}
          aria-label={`${index} ${t(index === 1 ? "rating.star" : "rating.stars")}`}
        >
          <Star size={26} />
        </button>
      ))}
    </div>
  );
}

export function ReviewModal({
  subjectType,
  subjectId,
  subjectName,
  author,
  defaultRouteType = "General",
  onClose,
  onSubmitted
}: {
  subjectType: "driver" | "company";
  subjectId: string;
  subjectName: string;
  author: Session;
  defaultRouteType?: string;
  onClose: () => void;
  onSubmitted: (review: Review) => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [routeType, setRouteType] = useState(defaultRouteType);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const input: CreateReviewInput = {
      subjectType,
      subjectId,
      authorType: author.role,
      authorId: author.id,
      authorName: author.name,
      rating,
      title: title.trim() || t("common.review"),
      comment: comment.trim(),
      routeType: routeType.trim() || "General"
    };
    try {
      const review = await api.createReview(input);
      onSubmitted(review);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.review.submit"));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t("review.title", { name: subjectName })} subtitle={t("review.subtitle", { name: author.name })} onClose={onClose}>
      <div className="modal-body">
        <label className="field">
          {t("review.yourRating")}
          <StarInput value={rating} onChange={setRating} />
        </label>
        <label className="field">
          {t("review.headline")}
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("review.headlinePlaceholder")} />
        </label>
        <label className="field">
          {t("review.routeContext")}
          <input value={routeType} onChange={(event) => setRouteType(event.target.value)} placeholder={t("review.routePlaceholder")} />
        </label>
        <label className="field">
          {t("review.comment")}
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            placeholder={t("review.commentPlaceholder")}
          />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="secondary-button" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary-button" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 size={16} className="spin" /> : <MessageSquareText size={16} />}
          {submitting ? t("review.posting") : t("review.post")}
        </button>
      </div>
    </Modal>
  );
}

type VerifyPhase = "idle" | "submitting" | "reviewing" | "done";

export function VerificationPanel({
  role,
  id,
  verification,
  canManage,
  onUpdated
}: {
  role: Role;
  id: string;
  verification: VerificationState;
  canManage: boolean;
  onUpdated: (state: VerificationState) => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<VerifyPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pct = verification.totalCount
    ? Math.round((verification.verifiedCount / verification.totalCount) * 100)
    : 0;

  const run = () => {
    setError(null);
    setPhase("submitting");
    window.setTimeout(() => setPhase("reviewing"), 800);
    window.setTimeout(async () => {
      try {
        const state = await api.submitVerification(role, id);
        onUpdated(state);
        setPhase("done");
        window.setTimeout(() => setPhase("idle"), 1600);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t("error.verification.failed"));
        setPhase("idle");
      }
    }, 1700);
  };

  const busy = phase === "submitting" || phase === "reviewing";
  const phaseLabel =
    phase === "submitting"
      ? t("verification.uploading")
      : phase === "reviewing"
        ? t("verification.running")
        : phase === "done"
          ? t("verification.complete")
          : "";

  return (
    <div className="verif-panel">
      <div className="verif-top">
        <VerificationPill status={verification.status} />
        <span className="verif-progress-label">
          {t("verification.checks", { verified: verification.verifiedCount, total: verification.totalCount })}
        </span>
      </div>
      <div className="verif-progress">
        <span style={{ width: `${pct}%` }} />
      </div>

      <ul className="verif-checks">
        {verification.checks.map((check) => (
          <li key={check.id} className={`verif-check is-${check.status}`}>
            <span className="vc-icon">
              {check.status === "verified" ? (
                <CheckCircle2 size={17} />
              ) : check.status === "pending" ? (
                <Clock3 size={17} />
              ) : (
                <ShieldAlert size={17} />
              )}
            </span>
            <div>
              <strong>{check.label}</strong>
              <span>{check.description}</span>
            </div>
            <VerificationPill status={check.status} />
          </li>
        ))}
      </ul>

      {canManage && verification.status !== "verified" ? (
        <div className="verif-action">
          {busy || phase === "done" ? (
            <div className={`verif-progress-state ${phase === "done" ? "is-done" : ""}`}>
              {phase === "done" ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="spin" />}
              {phaseLabel}
            </div>
          ) : (
            <button type="button" className="primary-button" onClick={run}>
              <ShieldCheck size={16} />
              {t("verification.completeAction")}
            </button>
          )}
          <p className="verif-hint">{t("verification.hint")}</p>
        </div>
      ) : null}

      {canManage && verification.status === "verified" ? (
        <div className="verif-done-banner">
          <ShieldCheck size={16} /> {t("verification.done")}
        </div>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}
    </div>
  );
}

export function ProfileLocation({ city, country }: { city: string; country: string }) {
  const { translateValue } = useI18n();

  return (
    <div className="profile-location">
      <MapPinned size={15} />
      {city}, {translateValue("country", country)}
    </div>
  );
}
