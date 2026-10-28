"use client";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  categoryOptionsFor,
  usePromoEditorForm,
  askOverwrite,
  openCalendarPreview,
  EditorShell,
  Section,
  LanguageTabs,
  CardEffectToggles,
  TextField,
  LinkField,
  ButtonColorPicker,
  PillSelector,
  IconField,
  DescriptionField,
} from "../../components/PromoEditorFields";
import PromoHistory from "../../components/PromoHistory";

const KNOCKOUT_OPTIONS = [
  { value: null, label: "None" },
  { value: "QUARTER_FINAL", label: "⚽ Quarterfinal (1/4)" },
  { value: "SEMI_FINAL", label: "⚽ Semifinal (1/2)" },
  { value: "FINAL", label: "🏆 Final" },
];

// yyyy-mm-dd ⇄ {year, month(0-11), day}
function ymdFromDateInput(v) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function dateInputFromYMD({ year, month, day }) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export default function SpecialEditor({ initial, onCancel, onSaved }) {
  const seed = useMemo(() => {
    const now = new Date();
    const y = initial?.year ?? now.getFullYear();
    const m = initial?.month ?? now.getMonth(); // 0..11
    const d = initial?.day ?? now.getDate();

    return {
      id: initial?.id ?? null,
      year: y,
      month: m,
      day: d,
      dateStr: dateInputFromYMD({ year: y, month: m, day: d }),

      icon: initial?.icon ?? "",
      active: initial?.active ?? true,
      scratch: !!initial?.scratch,
      flipCard: !!initial?.flipCard,
      buttonColor: initial?.buttonColor ?? "green",

      translations: initial?.translations || {},

      category: initial?.category || "ALL",
      knockoutPhase: initial?.knockoutPhase || null,
    };
  }, [initial]);

  const {
    form, setForm, setField, setTranslationField,
    market, activeLang, setActiveLang, currentT, langSuffix,
    validateActiveTranslation, contentPayload, themeFor, dirty,
  } = usePromoEditorForm(seed, initial);
  const [saving, setSaving] = useState(false);

  // Golden Ball i knockout faza važe samo u mesecima sa football temom (API
  // ih inače odbija). Dok se tema ne učita (null), ne skrivamo ništa.
  const theme = themeFor(form.year, form.month);
  const isFootball = theme === null || theme === "football";
  const categoryOptions = categoryOptionsFor(isFootball ? "football" : theme);
  const invalidForTheme =
    theme !== null && !isFootball && (form.category === "GOLD" || !!form.knockoutPhase);

  function onDateChange(v) {
    const ymd = ymdFromDateInput(v);
    const nextTheme = ymd ? themeFor(ymd.year, ymd.month) : null;
    const resetFootball =
      nextTheme && nextTheme !== "football" && (form.category === "GOLD" || form.knockoutPhase);
    setForm((prev) => ({
      ...prev,
      dateStr: v,
      ...(ymd || {}),
      ...(resetFootball ? { category: prev.category === "GOLD" ? "ALL" : prev.category, knockoutPhase: null } : {}),
    }));
    if (resetFootball) {
      toast("Golden Ball and knockout phase only exist in football-theme months — reset.", { icon: "ℹ️" });
    }
  }

  async function save() {
    if (!validateActiveTranslation()) return;
    if (invalidForTheme) {
      toast.error("Golden Ball / knockout phase are only allowed in football-theme months.");
      return;
    }

    const dt = new Date(Date.UTC(form.year, form.month, form.day));
    const valid =
      dt.getUTCFullYear() === Number(form.year) &&
      dt.getUTCMonth() === Number(form.month) &&
      dt.getUTCDate() === Number(form.day);
    if (!valid) {
      toast.error("Invalid date.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/special/${form.id}` : `/api/special`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...contentPayload(),
        year: form.year,
        month: form.month,
        day: form.day,
        knockoutPhase: form.knockoutPhase || null,
      };
      const send = (body) =>
        fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      // izmena: server odbija upis ako je neko snimio posle našeg učitavanja
      let res = await send(isEdit && initial?.updatedAt ? { ...payload, expectedUpdatedAt: initial.updatedAt } : payload);
      if (res.status === 409) {
        if (!(await askOverwrite(await res.json()))) return;
        res = await send(payload);
      }

      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();

      toast.success(isEdit ? "Success!" : "Created!");
      onSaved(saved);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      heading={
        <div className="text-base font-semibold text-neutral-900">
          {form.id
            ? "Edit Special Promotion"
            : initial?.duplicateOf
              ? `Duplicate of “${initial.duplicateOf}”`
              : "New Special Promotion"}
        </div>
      }
      active={form.active}
      onToggleActive={() => setField("active", !form.active)}
      onPreview={() => openCalendarPreview(form.year, form.month)}
      onCancel={onCancel}
      onSave={save}
      saving={saving}
      dirty={dirty}
      ready={!!market}
    >
      <LanguageTabs market={market} activeLang={activeLang} onChange={setActiveLang} />

      <Section title="Content">
        <div className="grid md:grid-cols-[minmax(0,1fr)_200px] gap-4 text-neutral-800">
          <TextField
            label={`Title${langSuffix}`}
            value={currentT.title}
            onChange={(v) => setTranslationField(activeLang, "title", v)}
          />
          <label className="block">
            <span className="text-sm mb-1 inline-block">Date</span>
            <input
              type="date"
              className="w-full border border-[#D0D0D0] rounded px-2.5 py-1.5 text-sm"
              value={form.dateStr}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </label>
        </div>

        <DescriptionField
          label={`Description${langSuffix}`}
          activeLang={activeLang}
          currentT={currentT}
          setTranslationField={setTranslationField}
        />
      </Section>

      <Section title="Button">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-start">
          <TextField
            label={`Label${langSuffix}`}
            value={currentT.button}
            onChange={(v) => setTranslationField(activeLang, "button", v)}
          />
          <LinkField
            label={`Link${langSuffix}`}
            value={currentT.link}
            onChange={(v) => setTranslationField(activeLang, "link", v)}
          />
          <ButtonColorPicker
            value={form.buttonColor}
            onChange={(v) => setField("buttonColor", v)}
          />
        </div>
      </Section>

      <Section title="Appearance">
        <IconField value={form.icon} onChange={(v) => setField("icon", v)} />

        <PillSelector
          label="Category"
          options={categoryOptions}
          value={form.category}
          onChange={(v) => setField("category", v)}
        />

        {isFootball && (
          <PillSelector
            label={
              <>
                Knockout Phase{" "}
                <span className="text-neutral-400 font-normal">(combines with category)</span>
              </>
            }
            options={KNOCKOUT_OPTIONS}
            value={form.knockoutPhase || null}
            onChange={(v) => setField("knockoutPhase", v)}
          />
        )}

        {invalidForTheme && (
          <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This promotion uses Golden Ball / a knockout phase, which only exist in football-theme
            months. Pick another category or a football month before saving.
          </p>
        )}
      </Section>

      <Section title="Effects">
        <CardEffectToggles form={form} setField={setField} />
      </Section>

      {form.id && (
        <Section title="History">
          <PromoHistory entity="special" entityId={form.id} />
        </Section>
      )}
    </EditorShell>
  );
}
