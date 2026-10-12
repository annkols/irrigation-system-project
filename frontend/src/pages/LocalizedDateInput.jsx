import React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { enGB, pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("pl", pl);
registerLocale("en-GB", enGB);

const pad = (value) => String(value).padStart(2, "0");

const parseValue = (value, includeTime) => {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const result = new Date(year, month - 1, day, includeTime ? hours : 0, includeTime ? minutes : 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

const serializeValue = (date, includeTime) => {
  if (!date) return "";
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return includeTime ? `${datePart}T${pad(date.getHours())}:${pad(date.getMinutes())}` : datePart;
};

export default function LocalizedDateInput({ value, onChange, includeTime = false, ariaLabel }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "pl" ? "pl" : "en-GB";

  return (
    <DatePicker
      selected={parseValue(value, includeTime)}
      onChange={(date) => onChange(serializeValue(date, includeTime))}
      locale={locale}
      dateFormat={includeTime ? "dd-MM-yyyy HH:mm" : "dd-MM-yyyy"}
      placeholderText={includeTime ? t("dates.dateTimePlaceholder") : t("dates.datePlaceholder")}
      showTimeSelect={includeTime}
      timeFormat="HH:mm"
      timeIntervals={15}
      timeCaption={t("dates.time")}
      isClearable
      ariaLabelledBy={undefined}
      aria-label={ariaLabel}
      calendarStartDay={1}
      wrapperClassName="localized-date-input-wrapper"
      className="localized-date-input"
      popperPlacement="bottom-start"
    />
  );
}
