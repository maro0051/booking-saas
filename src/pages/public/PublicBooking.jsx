import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import { getPublicBusiness } from "../../services/publicBooking";
import { supabase } from "../../lib/supabaseClient";
import BusinessHero from "../../components/public/BusinessHero";
import HowItWorks from "../../components/public/HowItWorks";
import StaffStrip from "../../components/public/StaffStrip";
import StickyBookBar from "../../components/public/StickyBookBar";
import ServiceCard from "../../components/public/ServiceCard";
import { useI18n } from "../../i18n/I18nContext";

export default function PublicBooking() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPublicBusiness(businessSlug)
      .then((b) => { if (mounted) setBusiness(b); })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [businessSlug]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser()
      .then(({ data }) => { if (mounted) setUser(data?.user || null); })
      .finally(() => { if (mounted) setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setUser(s?.user ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!business || !user || authLoading) return;
    if (business.require_account_to_book) {
      navigate(`/book/${businessSlug}/account`, { replace: true });
    }
  }, [business, user, authLoading, businessSlug, navigate]);

  if (loading || authLoading) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!business) {
    return (
      <Card>
        <h2>{t("booking.noSlots")}</h2>
        <p className="muted">{t("booking.noSlotsNext")}</p>
      </Card>
    );
  }

  const accountRequired = business.require_account_to_book;
  const signedIn = !!user;
  const hasStaff = (business.staff || []).length > 0;

  return (
    <>
      <div className="stack" style={{ gap: 20, paddingBottom: 96 }}>
        <BusinessHero business={business} />

        {hasStaff && (
          <Card><StaffStrip staff={business.staff} /></Card>
        )}

        {accountRequired && !signedIn && (
          <Card>
            <h2 style={{ marginBottom: 4 }}>{t("booking.howItWorks")}</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
              {t("booking.howItWorksSub")}
            </p>

            <HowItWorks />

            <div className="row" style={{ gap: 12, marginTop: 22, flexWrap: "wrap" }}>
              <Link to={`/book/${businessSlug}/register`}>
                <button className="btn btn-primary btn-lg">
                  <UserPlus size={16} /> {t("booking.createYourAccount")}
                </button>
              </Link>
              <Link to={`/book/${businessSlug}/login`}>
                <button className="btn btn-lg">
                  <LogIn size={16} /> {t("booking.alreadyAccount")}
                </button>
              </Link>
            </div>
          </Card>
        )}

        {signedIn && (
          <Card>
            <div className="row-between">
              <div>
                <h2 style={{ marginBottom: 4 }}>{t("customer.readyToBook")}</h2>
                <p className="muted" style={{ margin: 0 }}>{t("customer.readyToBookSub")}</p>
              </div>
              <Link to={`/book/${businessSlug}/account`}>
                <button className="btn">
                  {t("customer.account")} <ArrowRight size={14} />
                </button>
              </Link>
            </div>
          </Card>
        )}

        <Card id="services">
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>{t("booking.services")}</h2>
          <p className="muted text-sm" style={{ marginTop: 0, marginBottom: 14 }}>
            {t("booking.servicesSub")}
          </p>

          {business.services.length === 0 ? (
            <p className="muted">{t("services.noServices")}</p>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {business.services.map((s) => (
                <ServiceCard
                  key={s.id}
                  businessSlug={businessSlug}
                  service={s}
                  currency={business.currency}
                  timezone={business.timezone}
                  staff={business.staff || []}
                />
              ))}
            </div>
          )}
        </Card>

        {!accountRequired && !signedIn && (
          <Card>
            <div className="row-between" style={{ gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t("booking.wantToManage")}</div>
                <p className="muted text-sm" style={{ margin: "4px 0 0" }}>
                  {t("booking.wantToManageSub", { business: business.name })}
                </p>
              </div>
              <Link to={`/book/${businessSlug}/register`}>
                <button className="btn">{t("booking.createAccount")}</button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      <StickyBookBar
        businessSlug={businessSlug}
        businessName={business.name}
        to={`/book/${businessSlug}#services`}
        ctaLabel={t("booking.book")}
      />
    </>
  );
}