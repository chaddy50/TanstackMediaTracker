import { describe, expect, it } from "vitest";
import { SETTINGS_TABS } from "#/features/screens/settings/settingsTabs";
import { en } from "#/i18n/locales/en";

/**
 * The entity-agnostic keys `TaxonomySection` and `DeleteTaxonomyEntryDialog`
 * hand to `t`, whichever taxonomy they are managing.
 */
const SHARED_TAXONOMY_UI_KEYS = [
	"settings.taxonomy.add",
	"settings.taxonomy.adding",
	"settings.taxonomy.save",
	"settings.taxonomy.cancel",
	"settings.taxonomy.rename",
	"settings.taxonomy.delete",
	"settings.taxonomy.emptyNameError",
	"settings.taxonomy.conflictError",
	"settings.taxonomy.deleting",
	"settings.taxonomy.confirmDelete",
	"settings.taxonomy.deleteTitle",
];

/**
 * The entity-agnostic keys the merge control and `MergeTaxonomyEntryDialog`
 * hand to `t`, whichever taxonomy they are managing.
 */
const MERGE_TAXONOMY_UI_KEYS = [
	"settings.taxonomy.merge",
	"settings.taxonomy.mergeTitle",
	"settings.taxonomy.merging",
	"settings.taxonomy.confirmMerge",
	"settings.taxonomy.mergeTargetLabel",
	"settings.taxonomy.mergeConflictShortcut",
	"settings.taxonomy.noMergeTargets",
];

/**
 * The per-entity key suffixes the panel resolves under its config's i18n prefix.
 * i18next plural keys only exist in the locale as `_one`/`_other`, so those are
 * listed suffixed.
 */
const PER_ENTITY_UI_KEY_SUFFIXES = [
	"title",
	"description",
	"empty",
	"newPlaceholder",
	"usageCount_one",
	"usageCount_other",
	"deleteDescription",
	"deleteInUseDescription_one",
	"deleteInUseDescription_other",
	"mergePrompt",
	"mergeDescription",
];

const TAXONOMY_ENTITIES = ["tags", "genres"];

describe("en locale", () => {
	it("resolves a label and description for every registered settings tab", () => {
		for (const tab of SETTINGS_TABS) {
			expect(resolveKey(en, tab.labelKey)).toBeTypeOf("string");
			expect(resolveKey(en, tab.labelKey)).toBeTruthy();
			expect(resolveKey(en, tab.descriptionKey)).toBeTypeOf("string");
			expect(resolveKey(en, tab.descriptionKey)).toBeTruthy();
		}
	});

	it("defines every shared taxonomy key the panel renders", () => {
		for (const key of SHARED_TAXONOMY_UI_KEYS) {
			const value = resolveKey(en, key);
			expect(value, key).toBeTypeOf("string");
			expect(value, key).toBeTruthy();
		}
	});

	it("defines every shared taxonomy merge key the panel and dialog render", () => {
		for (const key of MERGE_TAXONOMY_UI_KEYS) {
			const value = resolveKey(en, key);
			expect(value, key).toBeTypeOf("string");
			expect(value, key).toBeTruthy();
		}
	});

	describe.each(TAXONOMY_ENTITIES)("%s", (entity) => {
		it(`defines every per-entity key the ${entity} panel renders`, () => {
			for (const suffix of PER_ENTITY_UI_KEY_SUFFIXES) {
				const key = `settings.${entity}.${suffix}`;
				const value = resolveKey(en, key);
				expect(value, key).toBeTypeOf("string");
				expect(value, key).toBeTruthy();
			}
		});
	});
});

// ---- Private helpers

function resolveKey(translations: unknown, key: string): unknown {
	return key.split(".").reduce<unknown>((currentValue, segment) => {
		if (typeof currentValue !== "object" || currentValue === null) {
			return undefined;
		}
		return (currentValue as Record<string, unknown>)[segment];
	}, translations);
}
