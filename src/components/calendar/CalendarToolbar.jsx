import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Button from "../ui/Button";
import { useI18n } from "../../i18n/I18nContext";

export default function CalendarToolbar({
  view, setView,
  rangeLabel,
  onPrev, onNext, onToday,
  filters, setFilters,
  staffOptions, locationOptions, serviceOptions,
  onNew,
  canCreate = true,
}) {
  const { t } = useI18n();

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", gap: 12,
        alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="segmented">
          {["day", "week", "month"].map((v) => (
            <button
              key={v}
              data-active={view === v}
              onClick={() => setView(v)}
              style={{ textTransform: "capitalize" }}
            >
              {t(`calendar.${v}`)}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onToday}>
          {t("calendar.today")}
        </Button>
        <div className="row" style={{ gap: 2 }}>
          <button className="btn btn-ghost btn-icon" onClick={onPrev} aria-label="Previous">
            <ChevronLeft size={15} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onNext} aria-label="Next">
            <ChevronRight size={15} />
          </button>
        </div>
        <span style={{ fontWeight: 500, fontSize: 14 }}>{rangeLabel}</span>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          className="select"
          style={{ width: 160 }}
          value={filters.staffId}
          onChange={(e) => setFilters((f) => ({ ...f, staffId: e.target.value }))}
        >
          <option value="">{t("calendar.allStaff")}</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: 160 }}
          value={filters.locationId}
          onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value }))}
        >
          <option value="">{t("calendar.allLocations")}</option>
          {locationOptions.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: 160 }}
          value={filters.serviceId}
          onChange={(e) => setFilters((f) => ({ ...f, serviceId: e.target.value }))}
        >
          <option value="">{t("calendar.allServices")}</option>
          {serviceOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Button
          variant="primary"
          onClick={onNew}
          disabled={!canCreate}
          title={!canCreate ? t("limits.planLimitReached") : undefined}
        >
          <Plus size={15} /> {t("calendar.newAppointment")}
        </Button>
      </div>
    </div>
  );
}