import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, addMonths, startOfWeek } from "date-fns";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { useRealtimeAppointments } from "../../hooks/useRealtimeAppointments";
import { businessAppointmentsRange } from "../../services/calendar";
import { listServices } from "../../services/services";
import { listStaff } from "../../services/staff";
import { listLocations } from "../../services/locations";
import { dayRange, weekRange, monthRange } from "../../utils/calendar";
import { formatInTz } from "../../utils/datetime";
import CalendarToolbar from "../../components/calendar/CalendarToolbar";
import DayView from "../../components/calendar/DayView";
import WeekView from "../../components/calendar/WeekView";
import MonthView from "../../components/calendar/MonthView";
import AppointmentDrawer from "../../components/calendar/AppointmentDrawer";
import AppointmentFormModal from "../../components/calendar/AppointmentFormModal";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import PlanLimitBanner from "../../components/business/PlanLimitBanner";
import { useI18n } from "../../i18n/I18nContext";

export default function BusinessCalendar() {
  const business = useBusinessContext();
  const { limits } = usePlanLimits(business.id);
  const { t } = useI18n();

  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [filters, setFilters] = useState({ staffId: "", locationId: "", serviceId: "" });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [locations, setLocations] = useState([]);

  const refreshTimer = useRef(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      listServices(business.id),
      listStaff(business.id),
      listLocations(business.id),
    ]).then(([s, st, l]) => {
      if (!mounted) return;
      setServices(s.filter((x) => x.is_active));
      setStaff(st.filter((x) => x.is_active));
      setLocations(l.filter((x) => x.is_active));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [business.id]);

  const { start, end } = useMemo(() => {
    if (view === "day") return dayRange(cursor);
    if (view === "week") return weekRange(cursor, 1);
    return monthRange(cursor);
  }, [view, cursor]);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await businessAppointmentsRange({
        businessId: business.id,
        from: start.toISOString(),
        to: end.toISOString(),
        staffId: filters.staffId || null,
        locationId: filters.locationId || null,
        serviceId: filters.serviceId || null,
      });
      setAppointments(rows);
      setError("");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [
    business.id, view, cursor.toISOString(),
    filters.staffId, filters.locationId, filters.serviceId,
  ]);

  useRealtimeAppointments(business.id, () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { refresh(); setSelected((s) => s); }, 400);
  });

  function rangeLabel() {
    if (view === "day") return formatInTz(cursor, business.timezone, "EEE, MMM d, yyyy");
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = addDays(s, 6);
      return `${formatInTz(s, business.timezone, "MMM d")} - ${formatInTz(e, business.timezone, "MMM d, yyyy")}`;
    }
    return formatInTz(cursor, business.timezone, "MMMM yyyy");
  }

  function navigate(dir) {
    if (view === "day") setCursor((c) => addDays(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addMonths(c, dir));
  }

  const canCreate = !(limits && limits.can_add?.appointments === false);

  return (
    <div>
      <h1>{t("calendar.title")}</h1>
      <p className="muted">{t("calendar.sub")}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <PlanLimitBanner limits={limits} resource="appointments" />

      <CalendarToolbar
        view={view}
        setView={setView}
        rangeLabel={rangeLabel()}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={() => setCursor(new Date())}
        filters={filters}
        setFilters={setFilters}
        staffOptions={staff}
        locationOptions={locations}
        serviceOptions={services}
        onNew={() => setShowForm(true)}
        canCreate={canCreate}
      />

      {loading && appointments.length === 0 ? (
        <Card><p className="muted">{t("common.loading")}</p></Card>
      ) : view === "day" ? (
        <DayView
          date={cursor}
          appointments={appointments}
          timezone={business.timezone}
          onSelect={setSelected}
        />
      ) : view === "week" ? (
        <WeekView
          weekStart={startOfWeek(cursor, { weekStartsOn: 1 })}
          appointments={appointments}
          timezone={business.timezone}
          onSelect={setSelected}
        />
      ) : (
        <MonthView
          monthStart={cursor}
          appointments={appointments}
          timezone={business.timezone}
          onSelect={setSelected}
        />
      )}

      <AppointmentDrawer
        appointment={selected}
        timezone={business.timezone}
        onClose={() => setSelected(null)}
        onChange={async () => { await refresh(); setSelected(null); }}
        onReschedule={() => {}}
      />

      {showForm && (
        <AppointmentFormModal
          business={business}
          services={services}
          staff={staff}
          locations={locations}
          onClose={() => setShowForm(false)}
          onCreated={async () => { setShowForm(false); await refresh(); }}
        />
      )}
    </div>
  );
}