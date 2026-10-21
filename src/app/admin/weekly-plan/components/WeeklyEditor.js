"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  categoryOptionsFor,
  WEEKDAY_LABELS,
  usePromoEditorForm,
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

// Roditelj (WeeklyPlanClient) renderuje editor sa key={weekday}, pa se pri
// promeni dana komponenta remount-uje i seed se ponovo primenjuje.
export default function WeeklyEditor({ initial, onCancel, onSave }) {
  const seed = useMemo(() => {
    return {
      ...initial,
      scratch: !!initial?.scratch,
      flipCard: !!initial?.flipCard,
      translations: initial?.translations || {},
      buttonColor: initial?.buttonColor || "green",
      category: initial?.category || "ALL",
    };
  }, [initial]);

  const {
    form, setField, setTranslationField,
    market, activeLang, setActiveLang, currentT, langSuffix,
    validateActiveTranslation, contentPayload, themeFor,
  } = usePromoEditorForm(seed, initial);
  const [saving, setSaving] = useState(false);

  // Golden Ball samo u mesecima sa football temom (API ga inače odbija).
  const theme = themeFor(form.year, form.month);
  const isFootball = theme === null || theme === "football";
  const categoryOptions = categoryOptionsFor(isFootball ? "football" : theme);
  const invalidForTheme = !isFootball && form.category === "GOLD";

  async function save() {
    if (!validateActiveTranslation()) return;
    if (invalidForTheme) {
      toast.error("Golden Ball is only allowed in football-theme months.");
      return;
    }

    setSaving(true);
    try {
      await onSave({ ...contentPayload(), weekday: form.weekday });
      toast.success("Saved.");
    } catch (e) {
      toast.error(`Error: ${e.message || "Saving failed."}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      heading={
        <>
          <div className="text-sm text-neutral-600">Edit:</div>
          <div className="text-base font-semibold text-neutral-900">
            {WEEKDAY_LABELS[form.weekday] || ""}
          </div>
        </>
      }
      active={form.active}
      onToggleActive={() => setField("active", !form.active)}
      onPreview={() => openCalendarPreview(form.year, form.month)}
      onCancel={onCancel}
      onSave={save}
      saving={saving}
    >
      <LanguageTabs market={market} activeLang={activeLang} onChange={setActiveLang} />

      <Section title="Content">
        <TextField
          label={`Title${langSuffix}`}
          value={currentT.title}
          onChange={(v) => setTranslationField(activeLang, "title", v)}
        />
        <DescriptionField
          label={`Description${langSuffix}`}
          activeLang={activeLang}
          currentT={currentT}
          setTranslationField={setTranslationField}
          placeholder="Write content for this weekly promotion…"
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
        {invalidForTheme && (
          <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Golden Ball only exists in football-theme months. Pick another category before saving.
          </p>
        )}
      </Section>

      <Section title="Effects">
        <CardEffectToggles form={form} setField={setField} />
      </Section>

      {form.id && (
        <Section title="History">
          <PromoHistory entity="weekly" entityId={form.id} />
        </Section>
      )}
    </EditorShell>
  );
}
