import { useState } from "react";
import { CalendarRange, CheckCircle2, Loader2, Plus, Route, Save, Send, Trash2 } from "lucide-react";
import type {
  AvailabilityPeriod,
  AvailabilityStatus,
  Booking,
  CompanyProfile,
  CreateBookingInput,
  CreateInviteInput,
  CreateJobInput,
  DriverProfile,
  DriverSkill,
  Invite,
  Job
} from "@roadcred/shared";
import { GalleryUploadField, ImageUploadField, Modal } from "./ui";
import { api, availabilityOptions, skillCategoryOptions, skillLevelOptions, type Session } from "./api";
import { useI18n } from "./i18n";

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(items: string[]): string {
  return items.join(", ");
}

type SkillDraft = { name: string; category: string; level: string };

export function EditDriverModal({
  driver,
  onClose,
  onSaved
}: {
  driver: DriverProfile;
  onClose: () => void;
  onSaved: (updated: DriverProfile) => void;
}) {
  const [headline, setHeadline] = useState(driver.headline);
  const [bio, setBio] = useState(driver.bio);
  const [city, setCity] = useState(driver.city);
  const [country, setCountry] = useState(driver.country);
  const [availability, setAvailability] = useState<string>(driver.availability);
  const [licenses, setLicenses] = useState(joinList(driver.licenses));
  const [languages, setLanguages] = useState(joinList(driver.languages));
  const [countries, setCountries] = useState(joinList(driver.countries));
  const [routeTypes, setRouteTypes] = useState(joinList(driver.routeTypes));
  const [profileImageUrl, setProfileImageUrl] = useState(driver.visualIdentity.profileImageUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(driver.visualIdentity.coverImageUrl);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>(driver.visualIdentity.galleryImageUrls);
  const [accentColor, setAccentColor] = useState(driver.visualIdentity.accentColor || "#2f64e6");
  const [tagline, setTagline] = useState(driver.visualIdentity.tagline);
  const [skills, setSkills] = useState<SkillDraft[]>(
    driver.skills.map((skill) => ({ name: skill.name, category: skill.category, level: skill.level }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, translateValue } = useI18n();

  const updateSkill = (index: number, patch: Partial<SkillDraft>) => {
    setSkills((current) => current.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateDriver(driver.id, {
        headline,
        bio,
        city,
        country,
        availability: availability as AvailabilityStatus,
        licenses: splitList(licenses),
        languages: splitList(languages),
        countries: splitList(countries),
        routeTypes: splitList(routeTypes),
        visualIdentity: {
          profileImageUrl: profileImageUrl.trim(),
          coverImageUrl: coverImageUrl.trim(),
          galleryImageUrls,
          accentColor,
          tagline: tagline.trim()
        },
        skills: skills
          .filter((skill) => skill.name.trim())
          .map((skill) => ({
            name: skill.name.trim(),
            category: skill.category as DriverSkill["category"],
            level: skill.level as DriverSkill["level"]
          }))
      });
      onSaved(updated);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("editor.error.saveProfile"));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("editor.driver.title")} subtitle={t("editor.driver.subtitle")} onClose={onClose}>
      <div className="modal-body">
        <label className="field">
          {t("editor.headline")}
          <input value={headline} onChange={(event) => setHeadline(event.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            {t("editor.city")}
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label className="field">
            {t("editor.country")}
            <input value={country} onChange={(event) => setCountry(event.target.value)} />
          </label>
        </div>
        <label className="field">
          {t("editor.currentAvailability")}
          <select value={availability} onChange={(event) => setAvailability(event.target.value)} className="text-select">
            {availabilityOptions.map((option) => (
              <option key={option} value={option}>
                {translateValue("availability", option)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("editor.aboutMe")}
          <textarea value={bio} rows={3} onChange={(event) => setBio(event.target.value)} />
        </label>
        <div className="field-group">
          <span>{t("editor.profileMediaAppearance")}</span>
          <ImageUploadField
            label={t("profile.media.profileImage")}
            value={profileImageUrl}
            onChange={setProfileImageUrl}
          />
          <ImageUploadField label={t("profile.media.coverImage")} value={coverImageUrl} onChange={setCoverImageUrl} />
          <GalleryUploadField label={t("profile.media.gallery")} value={galleryImageUrls} onChange={setGalleryImageUrls} />
          <div className="field-row">
            <label className="field">
              {t("editor.accentColor")}
              <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
            </label>
            <label className="field">
              {t("editor.profileTagline")}
              <input value={tagline} onChange={(event) => setTagline(event.target.value)} />
            </label>
          </div>
        </div>
        <label className="field">
          {t("editor.licensesComma")}
          <input value={licenses} onChange={(event) => setLicenses(event.target.value)} />
        </label>
        <label className="field">
          {t("editor.languagesComma")}
          <input value={languages} onChange={(event) => setLanguages(event.target.value)} />
        </label>
        <label className="field">
          {t("editor.countriesComma")}
          <input value={countries} onChange={(event) => setCountries(event.target.value)} />
        </label>
        <label className="field">
          {t("editor.routeTypesComma")}
          <input value={routeTypes} onChange={(event) => setRouteTypes(event.target.value)} />
        </label>

        <div className="field">
          <span>{t("editor.skills")}</span>
          <div className="editor-rows">
            {skills.map((skill, index) => (
              <div className="editor-row skill-row" key={index}>
                <input
                  value={skill.name}
                  placeholder={t("editor.skillNamePlaceholder")}
                  onChange={(event) => updateSkill(index, { name: event.target.value })}
                />
                <select
                  value={skill.category}
                  className="text-select"
                  onChange={(event) => updateSkill(index, { category: event.target.value })}
                >
                  {skillCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateValue("skillCategory", option)}
                    </option>
                  ))}
                </select>
                <select
                  value={skill.level}
                  className="text-select"
                  onChange={(event) => updateSkill(index, { level: event.target.value })}
                >
                  {skillLevelOptions.map((option) => (
                    <option key={option} value={option}>
                      {translateValue("skillLevel", option)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setSkills((current) => current.filter((_, i) => i !== index))}
                  aria-label={t("editor.removeSkill")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="add-row-button"
            onClick={() =>
            setSkills((current) => [...current, { name: "", category: "Vehicle & equipment", level: "Proficient" }])
            }
          >
            <Plus size={15} /> {t("editor.addSkill")}
          </button>
        </div>

        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="secondary-button" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary-button" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {t("editor.saveProfile")}
        </button>
      </div>
    </Modal>
  );
}

type PeriodDraft = { startDate: string; endDate: string; status: string; note: string };

export function AvailabilityModal({
  driver,
  onClose,
  onSaved
}: {
  driver: DriverProfile;
  onClose: () => void;
  onSaved: (updated: DriverProfile) => void;
}) {
  const [periods, setPeriods] = useState<PeriodDraft[]>(
    driver.availabilityPeriods
      .filter((period) => period.origin !== "booking")
      .map((period) => ({
        startDate: period.startDate,
        endDate: period.endDate ?? "",
        status: period.status,
        note: period.note
      }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const update = (index: number, patch: Partial<PeriodDraft>) => {
    setPeriods((current) => current.map((period, i) => (i === index ? { ...period, ...patch } : period)));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const availabilityPeriods = periods
        .filter((period) => period.startDate)
        .map((period) => ({
          startDate: period.startDate,
          endDate: period.endDate ? period.endDate : null,
          status: period.status as AvailabilityPeriod["status"],
          note: period.note
        }));
      const updated = await api.updateDriver(driver.id, { availabilityPeriods });
      onSaved(updated);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("editor.error.saveAvailability"));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("editor.availability.title")} subtitle={t("editor.availability.subtitle")} onClose={onClose}>
      <div className="modal-body">
        <div className="editor-rows">
          {periods.map((period, index) => (
            <div className="editor-row period-row" key={index}>
              <select
                value={period.status}
                className="text-select"
                onChange={(event) => update(index, { status: event.target.value })}
              >
                <option value="Available">{t("availability.available")}</option>
                <option value="Tentative">{t("availability.tentative")}</option>
                <option value="Hired">{t("availability.hired")}</option>
              </select>
              <input type="date" value={period.startDate} onChange={(event) => update(index, { startDate: event.target.value })} />
              <input type="date" value={period.endDate} onChange={(event) => update(index, { endDate: event.target.value })} />
              <input
                value={period.note}
                placeholder={t("editor.noteOptional")}
                onChange={(event) => update(index, { note: event.target.value })}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setPeriods((current) => current.filter((_, i) => i !== index))}
                aria-label={t("editor.removePeriod")}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="add-row-button"
          onClick={() =>
            setPeriods((current) => [...current, { startDate: "", endDate: "", status: "Available", note: "" }])
          }
        >
          <Plus size={15} /> {t("editor.addPeriod")}
        </button>
        <p className="verif-hint">{t("editor.openEndedHint")}</p>
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="secondary-button" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary-button" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {t("editor.saveAvailability")}
        </button>
      </div>
    </Modal>
  );
}

export function EditCompanyModal({
  company,
  onClose,
  onSaved
}: {
  company: CompanyProfile;
  onClose: () => void;
  onSaved: (updated: CompanyProfile) => void;
}) {
  const [description, setDescription] = useState(company.description);
  const [fleetType, setFleetType] = useState(company.fleetType);
  const [responseTime, setResponseTime] = useState(company.responseTime);
  const [city, setCity] = useState(company.city);
  const [country, setCountry] = useState(company.country);
  const [operatingRegions, setOperatingRegions] = useState(joinList(company.operatingRegions));
  const [profileImageUrl, setProfileImageUrl] = useState(company.visualIdentity.profileImageUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(company.visualIdentity.coverImageUrl);
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>(company.visualIdentity.galleryImageUrls);
  const [accentColor, setAccentColor] = useState(company.visualIdentity.accentColor || "#2f64e6");
  const [tagline, setTagline] = useState(company.visualIdentity.tagline);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateCompany(company.id, {
        description,
        fleetType,
        responseTime,
        city,
        country,
        operatingRegions: splitList(operatingRegions),
        visualIdentity: {
          profileImageUrl: profileImageUrl.trim(),
          coverImageUrl: coverImageUrl.trim(),
          galleryImageUrls,
          accentColor,
          tagline: tagline.trim()
        }
      });
      onSaved(updated);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("editor.error.saveCompany"));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("editor.company.title")} subtitle={t("editor.company.subtitle")} onClose={onClose}>
      <div className="modal-body">
        <label className="field">
          {t("editor.description")}
          <textarea value={description} rows={3} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="field">
          {t("editor.fleetSpecialty")}
          <input value={fleetType} onChange={(event) => setFleetType(event.target.value)} />
        </label>
        <label className="field">
          {t("editor.responseTime")}
          <input value={responseTime} onChange={(event) => setResponseTime(event.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            {t("editor.city")}
            <input value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label className="field">
            {t("editor.country")}
            <input value={country} onChange={(event) => setCountry(event.target.value)} />
          </label>
        </div>
        <label className="field">
          {t("editor.operatingRegionsComma")}
          <input value={operatingRegions} onChange={(event) => setOperatingRegions(event.target.value)} />
        </label>
        <div className="field-group">
          <span>{t("editor.brandMediaAppearance")}</span>
          <ImageUploadField label={t("profile.media.logo")} value={profileImageUrl} onChange={setProfileImageUrl} />
          <ImageUploadField label={t("profile.media.coverImage")} value={coverImageUrl} onChange={setCoverImageUrl} />
          <GalleryUploadField label={t("profile.media.gallery")} value={galleryImageUrls} onChange={setGalleryImageUrls} />
          <div className="field-row">
            <label className="field">
              {t("editor.brandColor")}
              <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
            </label>
            <label className="field">
              {t("editor.brandTagline")}
              <input value={tagline} onChange={(event) => setTagline(event.target.value)} />
            </label>
          </div>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="secondary-button" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary-button" onClick={save} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {t("editor.saveChanges")}
        </button>
      </div>
    </Modal>
  );
}

export function BookDriverModal({
  driver,
  author,
  presetStart,
  onClose,
  onBooked
}: {
  driver: DriverProfile;
  author: Session;
  presetStart?: string;
  onClose: () => void;
  onBooked: (booking: Booking) => void;
}) {
  const { t } = useI18n();
  const [startDate, setStartDate] = useState(presetStart ?? "");
  const [endDate, setEndDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeType, setRouteType] = useState(driver.routeTypes[0] ?? "General");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError(t("booking.invalidDates"));
      return;
    }
    setBusy(true);
    setError(null);
    const input: CreateBookingInput = {
      driverId: driver.id,
      companyId: author.id,
      companyName: author.name,
      startDate,
      endDate,
      routeType,
      origin: origin.trim(),
      destination: destination.trim(),
      originCountry: "",
      destinationCountry: "",
      note
    };
    try {
      const booking = await api.createBooking(input);
      onBooked(booking);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("editor.error.createBooking"));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("booking.title", { name: driver.name })} subtitle={t("booking.subtitle")} onClose={onClose}>
      <div className="modal-body">
        <div className="field-row">
          <label className="field">
            <span>{t("booking.origin")}</span>
            <input value={origin} placeholder={t("booking.originPlaceholder")} onChange={(event) => setOrigin(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("booking.destination")}</span>
            <input
              value={destination}
              placeholder={t("booking.destinationPlaceholder")}
              onChange={(event) => setDestination(event.target.value)}
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>{t("booking.startDate")}</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("booking.endDate")}</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>{t("booking.routeType")}</span>
          <input value={routeType} onChange={(event) => setRouteType(event.target.value)} />
        </label>
        <label className="field">
          <span>{t("booking.note")}</span>
          <textarea value={note} placeholder={t("booking.notePlaceholder")} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="secondary-button" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary-button" onClick={submit} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <CalendarRange size={16} />}
          {busy ? t("booking.submitting") : t("booking.submit")}
        </button>
      </div>
    </Modal>
  );
}

export function PostRouteModal({
  author,
  onClose,
  onCreated
}: {
  author: Session;
  onClose: () => void;
  onCreated: (job: Job) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [truckType, setTruckType] = useState("");
  const [requiredLicense, setRequiredLicense] = useState("");
  const [languages, setLanguages] = useState("");
  const [countries, setCountries] = useState("");
  const [contractType, setContractType] = useState("");
  const [payBand, setPayBand] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !origin.trim() || !destination.trim()) {
      setError(t("job.form.invalid"));
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setError(t("booking.invalidDates"));
      return;
    }
    setBusy(true);
    setError(null);
    const input: CreateJobInput = {
      companyId: author.id,
      title: title.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      countries: splitList(countries),
      truckType: truckType.trim(),
      requiredLicense: requiredLicense.trim(),
      languages: splitList(languages),
      contractType: contractType.trim(),
      payBand: payBand.trim()
    };
    try {
      const job = await api.createJob(input);
      onCreated(job);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("editor.error.postRoute"));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("job.form.routeTitle")} subtitle={t("job.form.subtitle")} onClose={onClose}>
      <div className="modal-body">
        <label className="field">
          <span>{t("job.form.title")}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>{t("job.form.from")}</span>
            <input value={origin} placeholder={t("booking.originPlaceholder")} onChange={(event) => setOrigin(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("job.form.to")}</span>
            <input
              value={destination}
              placeholder={t("booking.destinationPlaceholder")}
              onChange={(event) => setDestination(event.target.value)}
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>{t("job.form.startDate")}</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("job.form.endDate")}</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>{t("job.form.truckType")}</span>
            <input value={truckType} onChange={(event) => setTruckType(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("job.form.requiredLicense")}</span>
            <input value={requiredLicense} onChange={(event) => setRequiredLicense(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>{t("job.form.countries")}</span>
          <input value={countries} onChange={(event) => setCountries(event.target.value)} />
        </label>
        <label className="field">
          <span>{t("job.form.languages")}</span>
          <input value={languages} onChange={(event) => setLanguages(event.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>{t("job.form.contractType")}</span>
            <input value={contractType} onChange={(event) => setContractType(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("job.form.payBand")}</span>
            <input value={payBand} onChange={(event) => setPayBand(event.target.value)} />
          </label>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="modal-foot">
        <button type="button" className="secondary-button" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="button" className="primary-button" onClick={submit} disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Route size={16} />}
          {busy ? t("job.form.submitting") : t("job.form.submit")}
        </button>
      </div>
    </Modal>
  );
}

export function InviteDriverModal({
  author,
  onClose,
  onInvited
}: {
  author: Session;
  onClose: () => void;
  onInvited: (invite: Invite) => void;
}) {
  const { t } = useI18n();
  const [driverEmail, setDriverEmail] = useState("");
  const [driverName, setDriverName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!driverEmail.includes("@") || !driverName.trim()) {
      setError(t("invite.form.invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    const input: CreateInviteInput = { driverEmail: driverEmail.trim(), driverName: driverName.trim(), note: note.trim() };
    try {
      const invite = await api.createInvite(input);
      setSent(true);
      onInvited(invite);
      window.setTimeout(() => onClose(), 1300);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("editor.error.sendInvite"));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("invite.form.title")} subtitle={t("invite.form.subtitle", { company: author.name })} onClose={onClose}>
      {sent ? (
        <div className="invite-success">
          <div className="invite-success-icon">
            <CheckCircle2 size={30} />
          </div>
          <h3>{t("invite.sent")}</h3>
          <p>{t("invite.sentBody", { name: driverName })}</p>
        </div>
      ) : (
        <>
          <div className="modal-body">
            <label className="field">
              <span>{t("invite.form.name")}</span>
              <input value={driverName} onChange={(event) => setDriverName(event.target.value)} />
            </label>
            <label className="field">
              <span>{t("invite.form.email")}</span>
              <input type="email" value={driverEmail} onChange={(event) => setDriverEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>{t("invite.form.note")}</span>
              <textarea
                value={note}
                placeholder={t("invite.form.notePlaceholder")}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {error ? <div className="form-error">{error}</div> : null}
          </div>
          <div className="modal-foot">
            <button type="button" className="secondary-button" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="button" className="primary-button" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              {busy ? t("invite.form.submitting") : t("invite.form.submit")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
