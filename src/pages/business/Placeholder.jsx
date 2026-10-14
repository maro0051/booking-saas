import Card from "../../components/ui/Card";
import { useI18n } from "../../i18n/I18nContext";

export default function Placeholder({ title, titleKey, phase }) {
  const { t } = useI18n();
  const heading = titleKey ? t(titleKey) : title;
  return (
    <div>
      <h1>{heading}</h1>
      <Card>
        <p className="muted">{t("payments.comingSoon")}</p>
      </Card>
    </div>
  );
}