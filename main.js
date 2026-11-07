"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vendor/media-source-v2.cjs
var require_media_source_v2 = __commonJS({
  "vendor/media-source-v2.cjs"(exports, module2) {
    "use strict";
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __commonJS2 = (cb, mod) => function __require() {
      return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    var require_field_description = __commonJS2({
      "src/contracts/field-description.js"(exports2, module22) {
        "use strict";
        var BASE_SEMANTICS = { text: "text", number: "finite-number", list: "text-list", boolean: "boolean" };
        function frontmatterField(field, details = {}) {
          const { key, type, label, entities, editable, options, nullable } = field;
          return {
            id: `entity.${key}`,
            domain: "entity",
            semantic: BASE_SEMANTICS[type],
            meaning: label,
            storage: { kind: "frontmatter", key, read: "preserve-raw", write: "validated-patch" },
            missing: { absent: "unknown", null: nullable ? "explicit-empty" : "preserve-legacy", empty: "preserve-user-intent", zero: "value" },
            permissions: { user: editable !== false, localService: false, sourceCandidate: false },
            ...type === "list" && { memberType: "text" },
            ...options && { enumeration: "closed" },
            entities,
            ...field,
            ...details
          };
        }
        module22.exports = { frontmatterField };
      }
    });
    var require_rating_schemes = __commonJS2({
      "src/rating-schemes.js"(exports2, module22) {
        "use strict";
        var { frontmatterField } = require_field_description();
        var RATING_SCHEMA_VERSION = 1;
        var ID = "[a-z][a-z0-9]*(?:_[a-z0-9]+)*";
        var IDENTIFIER = new RegExp(`^${ID}$`);
        var FLAT_KEY = new RegExp(`^user_rating_(${ID})__(${ID})__v([1-9]\\d*)$`);
        var MEDIA = /^[a-z][a-z0-9_-]*$/;
        var TYPES = /* @__PURE__ */ new Set(["text", "number", "boolean", "list"]);
        var ENTITIES = Object.freeze(["work", "series"]);
        var DIMENSION_KEYS = ["id", "revision", "label", "type", "enabled", "meaning", "min", "max", "step", "options"];
        var own = (object, key) => Object.hasOwn(object, key);
        var record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
        var known = (value, keys) => record(value) && Object.keys(value).every((key) => keys.includes(key));
        var equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
        var copy = (value) => JSON.parse(JSON.stringify(value));
        var validId = (value) => typeof value === "string" && value.length <= 48 && IDENTIFIER.test(value);
        var validSchemeId = (value) => validId(value) && !["none", "default"].includes(value);
        var validVersion = (value) => Number.isSafeInteger(value) && value > 0;
        var OVERALL_RATING = Object.freeze(frontmatterField({
          key: "rating",
          label: "\u6211\u7684\u8BC4\u5206",
          type: "number",
          group: "user",
          entities: ENTITIES,
          editable: true,
          nullable: true,
          min: 0,
          max: 10,
          step: "any"
        }, { semantic: "overall-personal-rating", meaning: "\u7528\u6237\u5728\u672C\u5730\u586B\u5199\u7684\u6574\u4F53\u8BC4\u5206\uFF0C\u91CF\u5C3A\u4E3A 0\u201310\u3002" }));
        function emptyRatingSchemes() {
          return { schemaVersion: RATING_SCHEMA_VERSION, defaults: {}, schemes: [] };
        }
        function labelText(value, field) {
          const label = typeof value === "string" ? value.trim() : "";
          if (!label || label.length > 120 || /[\x00-\x1f\x7f]/.test(label)) throw Error(`${field}\u987B\u4E3A\u975E\u7A7A\u5355\u884C\u6587\u672C\u3002`);
          return label;
        }
        function normalizeOptions(value, id) {
          if (!record(value) || !Object.keys(value).length) throw Error(`${id} \u987B\u63D0\u4F9B\u81F3\u5C11\u4E00\u4E2A\u6587\u672C\u9009\u9879\u3002`);
          return Object.fromEntries(Object.entries(value).map(([key, label]) => {
            if (labelText(key, "\u9009\u9879\u503C") !== key) throw Error(`${id} \u7684\u9009\u9879\u503C\u9996\u5C3E\u4E0D\u80FD\u6709\u7A7A\u683C\u3002`);
            return [key, labelText(label, "\u9009\u9879\u540D\u79F0")];
          }));
        }
        function normalizeDimension(input, { draft = false } = {}) {
          if (!known(input, DIMENSION_KEYS) || !validId(input.id) || !TYPES.has(input.type) || !draft && !validVersion(input.revision))
            throw Error("\u8BC4\u5206\u7EF4\u5EA6\u987B\u6709\u6709\u6548\u7684\u56FA\u5B9A ID\u3001\u7C7B\u578B\u548C\u7248\u672C\u3002");
          const { id, type } = input;
          if (input.enabled !== void 0 && typeof input.enabled !== "boolean") throw Error(`${id} \u7684\u542F\u7528\u72B6\u6001\u65E0\u6548\u3002`);
          const result = { id, ...!draft ? { revision: input.revision } : {}, label: labelText(input.label, "\u7EF4\u5EA6\u540D\u79F0"), type, enabled: input.enabled !== false };
          if (input.meaning !== void 0) {
            if (typeof input.meaning !== "string" || input.meaning.length > 2e3 || input.meaning.includes("\0")) throw Error(`${id} \u7684\u5B9A\u4E49\u8BF4\u660E\u65E0\u6548\u3002`);
            if (input.meaning.trim()) result.meaning = input.meaning.trim();
          }
          for (const key of ["min", "max", "step"]) {
            if (input[key] === void 0) continue;
            if (type !== "number" || !Number.isFinite(input[key]) || key === "step" && input[key] <= 0) throw Error(`${id} \u7684 ${key} \u65E0\u6548\u3002`);
            result[key] = input[key];
          }
          if (result.min > result.max) throw Error(`${id} \u7684\u6700\u5C0F\u503C\u4E0D\u80FD\u5927\u4E8E\u6700\u5927\u503C\u3002`);
          if (input.options !== void 0) {
            if (type !== "text") throw Error(`${id} \u53EA\u6709\u6587\u672C\u7EF4\u5EA6\u53EF\u4EE5\u5B9A\u4E49\u9009\u9879\u3002`);
            result.options = normalizeOptions(input.options, id);
          }
          return result;
        }
        function normalizeDimensions(values, options) {
          if (!Array.isArray(values)) throw Error("\u8BC4\u5206\u7EF4\u5EA6\u987B\u4E3A\u6309\u987A\u5E8F\u6392\u5217\u7684\u5217\u8868\u3002");
          const dimensions = values.map((value) => normalizeDimension(value, options));
          if (new Set(dimensions.map((dimension) => dimension.id)).size !== dimensions.length) throw Error("\u8BC4\u5206\u7EF4\u5EA6 ID \u91CD\u590D\u3002");
          return dimensions;
        }
        function sameMeaning(left, right) {
          const semantic = (value) => [
            value.type,
            value.meaning,
            value.min,
            value.max,
            value.step,
            value.options && Object.keys(value.options).sort().map((key) => [key, value.options[key]])
          ];
          return equal(semantic(left), semantic(right));
        }
        function normalizeRatingSchemes(input) {
          if (input == null) return emptyRatingSchemes();
          if (!known(input, ["schemaVersion", "defaults", "schemes"]) || input.schemaVersion !== RATING_SCHEMA_VERSION || !record(input.defaults) || !Array.isArray(input.schemes)) throw Error("\u8BC4\u5206\u65B9\u6848\u914D\u7F6E\u7684\u7248\u672C\u6216\u683C\u5F0F\u65E0\u6548\u3002");
          const schemes = input.schemes.map((scheme) => {
            if (!known(scheme, ["id", "active", "versions"]) || !validSchemeId(scheme.id) || typeof scheme.active !== "boolean" || !Array.isArray(scheme.versions) || !scheme.versions.length) throw Error("\u8BC4\u5206\u65B9\u6848\u7F3A\u5C11\u6709\u6548 ID\u3001\u72B6\u6001\u6216\u5386\u53F2\u5B9A\u4E49\u3002");
            const history = /* @__PURE__ */ new Map();
            const versions = scheme.versions.map((entry, index) => {
              if (!known(entry, ["version", "name", "dimensions"]) || entry.version !== index + 1) throw Error(`${scheme.id} \u7684\u65B9\u6848\u7248\u672C\u987B\u4ECE 1 \u8FDE\u7EED\u4FDD\u5B58\u3002`);
              const dimensions = normalizeDimensions(entry.dimensions);
              for (const dimension of dimensions) {
                const before = history.get(dimension.id);
                const expected = before ? before.revision + (sameMeaning(before, dimension) ? 0 : 1) : 1;
                if (dimension.revision !== expected) throw Error(`${scheme.id} \u7684 ${dimension.id} \u672A\u6309\u5B9A\u4E49\u53D8\u5316\u4FDD\u5B58\u7248\u672C\u3002`);
                history.set(dimension.id, dimension);
              }
              return { version: entry.version, name: labelText(entry.name, "\u65B9\u6848\u540D\u79F0"), dimensions };
            });
            return { id: scheme.id, active: scheme.active, versions };
          });
          if (new Set(schemes.map((scheme) => scheme.id)).size !== schemes.length) throw Error("\u8BC4\u5206\u65B9\u6848 ID \u91CD\u590D\u3002");
          const active = new Set(schemes.filter((scheme) => scheme.active).map((scheme) => scheme.id));
          const defaults = Object.fromEntries(Object.entries(input.defaults).map(([media, id]) => {
            if (!MEDIA.test(media) || !active.has(id)) throw Error(`\u5A92\u4ECB ${media} \u7684\u9ED8\u8BA4\u8BC4\u5206\u65B9\u6848\u65E0\u6548\u6216\u5DF2\u505C\u7528\u3002`);
            return [media, id];
          }));
          return { schemaVersion: RATING_SCHEMA_VERSION, defaults, schemes };
        }
        function validateRatingTransition(previous, input) {
          const before = normalizeRatingSchemes(previous), after = normalizeRatingSchemes(input);
          for (const scheme of before.schemes) {
            const next = after.schemes.find((value) => value.id === scheme.id);
            if (!next || !equal(scheme.versions, next.versions.slice(0, scheme.versions.length)))
              throw Error(`${scheme.id} \u7684\u8BC4\u5206\u5386\u53F2\u4E0D\u53EF\u4FEE\u6539\u6216\u79FB\u9664\u3002\u8BF7\u505C\u7528\u65B9\u6848\u6216\u8FFD\u52A0\u5B9A\u4E49\u3002`);
          }
          return after;
        }
        function latest(scheme) {
          return scheme?.versions[scheme.versions.length - 1];
        }
        function currentRatingScheme(config, id) {
          const scheme = config?.schemes?.find((value) => value.id === id);
          return scheme ? copy({ id: scheme.id, active: scheme.active, ...latest(scheme) }) : null;
        }
        function ratingFieldKey(schemeId, dimensionId, revision = 1) {
          if (!validSchemeId(schemeId) || !validId(dimensionId) || !validVersion(revision)) throw Error("\u8BC4\u5206\u5B57\u6BB5\u6807\u8BC6\u65E0\u6548\u3002");
          return `user_rating_${schemeId}__${dimensionId}__v${revision}`;
        }
        function isManagedRatingKey(key) {
          const match = typeof key === "string" && FLAT_KEY.exec(key);
          return !!match && validSchemeId(match[1]) && validId(match[2]) && validVersion(Number(match[3]));
        }
        function previewRatingScheme(config, draft) {
          const next = normalizeRatingSchemes(config);
          if (!known(draft, ["id", "name", "active", "dimensions"]) || !validSchemeId(draft.id) || draft.active !== void 0 && typeof draft.active !== "boolean")
            throw Error("\u8BC4\u5206\u65B9\u6848\u7F3A\u5C11\u6709\u6548\u7684\u56FA\u5B9A ID \u6216\u72B6\u6001\u3002");
          const { id } = draft;
          const old = next.schemes.find((scheme) => scheme.id === id), current = latest(old);
          const active = draft.active ?? old?.active ?? true;
          const name = labelText(draft.name, "\u65B9\u6848\u540D\u79F0");
          const draftDimensions = normalizeDimensions(draft.dimensions, { draft: true });
          const changes = [];
          const history = new Map((old?.versions || []).flatMap((version) => version.dimensions.map((dimension) => [dimension.id, dimension])));
          const dimensions = draftDimensions.map((dimension) => {
            const before = history.get(dimension.id);
            const revised = before && !sameMeaning(before, dimension);
            const revision = (before?.revision ?? 1) + (revised ? 1 : 0);
            const toKey = ratingFieldKey(id, dimension.id, revision);
            const details = { id: dimension.id, label: dimension.label, toKey };
            if (!before) changes.push({ kind: "added", ...details });
            else {
              if (revised) changes.push({ kind: "versioned", ...details, fromKey: ratingFieldKey(id, dimension.id, before.revision) });
              if (before.label !== dimension.label) changes.push({ kind: "renamed", ...details });
              if (before.enabled !== dimension.enabled) changes.push({ kind: dimension.enabled ? "enabled" : "disabled", ...details });
            }
            return { ...dimension, revision };
          });
          const drafted = new Set(dimensions.map((dimension) => dimension.id));
          for (const before of current?.dimensions || []) {
            if (drafted.has(before.id)) continue;
            dimensions.push({ ...before, enabled: false });
            if (before.enabled) changes.push({ kind: "disabled", id: before.id, label: before.label, toKey: ratingFieldKey(id, before.id, before.revision) });
          }
          if (current) {
            const previousOrder = current.dimensions.map((dimension) => dimension.id).filter((id2) => drafted.has(id2));
            const currentIds = new Set(current.dimensions.map((dimension) => dimension.id));
            const proposedOrder = draftDimensions.map((dimension) => dimension.id).filter((id2) => currentIds.has(id2));
            if (!equal(previousOrder, proposedOrder)) changes.push({ kind: "reordered" });
            if (current.name !== name) changes.push({ kind: "scheme-renamed", id, label: name });
            if (old.active !== active) changes.push({ kind: active ? "scheme-enabled" : "scheme-disabled", id, label: name });
          } else changes.push({ kind: "scheme-added", id, label: name });
          const normalized = normalizeDimensions(dimensions);
          const versionChanged = !current || current.name !== name || !equal(current.dimensions, normalized);
          const versions = [...old?.versions || []];
          if (versionChanged) versions.push({ version: versions.length + 1, name, dimensions: normalized });
          const replacement = { id, active, versions };
          next.schemes = old ? next.schemes.map((scheme) => scheme.id === id ? replacement : scheme) : [...next.schemes, replacement];
          if (!active) for (const [media, schemeId] of Object.entries(next.defaults)) {
            if (schemeId !== id) continue;
            delete next.defaults[media];
            changes.push({ kind: "default-cleared", id, media });
          }
          return { config: validateRatingTransition(config, next), changes, requiresReview: changes.some((change) => change.kind === "versioned") };
        }
        function setRatingDefault(config, media, id) {
          const next = normalizeRatingSchemes(config);
          if (typeof media !== "string" || !MEDIA.test(media)) throw Error("\u9ED8\u8BA4\u8BC4\u5206\u65B9\u6848\u7684\u5A92\u4ECB\u6807\u8BC6\u65E0\u6548\u3002");
          if (id == null) delete next.defaults[media];
          else {
            if (!next.schemes.some((scheme) => scheme.id === id && scheme.active)) throw Error("\u8BF7\u9009\u62E9\u5DF2\u542F\u7528\u7684\u8BC4\u5206\u65B9\u6848\u3002");
            next.defaults = { ...next.defaults, [media]: id };
          }
          return next;
        }
        function resolveRatingScheme(config, entity = {}) {
          const selection = entity.rating_scheme;
          if (selection === "none") return { choice: "none", scheme: null };
          if (selection && selection !== "default") return { choice: "override", scheme: currentRatingScheme(config, selection) };
          const media = entity.type === "work" ? entity.media : void 0;
          const id = media && config?.defaults && own(config.defaults, media) ? config.defaults[media] : void 0;
          return { choice: "default", scheme: currentRatingScheme(config, id) };
        }
        function fieldFor(schemeId, version, dimension, historical) {
          const { id, revision, label, type, meaning, min, max, step, options } = dimension;
          return frontmatterField(
            {
              key: ratingFieldKey(schemeId, id, revision),
              label,
              type,
              group: "user",
              entities: ENTITIES,
              editable: !historical,
              nullable: true,
              schemeId,
              schemeVersion: version,
              dimensionId: id,
              dimensionRevision: revision,
              historical,
              ...meaning ? { meaning } : {},
              ...min !== void 0 ? { min } : {},
              ...max !== void 0 ? { max } : {},
              ...type === "number" ? { step: step ?? "any" } : {},
              ...options ? { options: { "": "\uFF08\u7559\u7A7A\uFF09", ...options } } : {}
            },
            { semantic: "rating-dimension", compatibility: { schemeId, version, dimensionId: id, revision } }
          );
        }
        function ratingFieldHistory(config) {
          const fields = /* @__PURE__ */ new Map();
          for (const scheme of config?.schemes || []) for (const version of scheme.versions) for (const dimension of version.dimensions) {
            const field = fieldFor(scheme.id, version.version, dimension, true);
            if (!fields.has(field.key)) fields.set(field.key, field);
          }
          return [...fields.values()];
        }
        function ratingFields(config, entity = {}, { includeHistorical = true } = {}) {
          if (!ENTITIES.includes(entity.type)) return [];
          const { scheme } = resolveRatingScheme(config, entity);
          const current = scheme?.active ? scheme.dimensions.filter((dimension) => dimension.enabled).map((dimension) => fieldFor(scheme.id, scheme.version, dimension, false)) : [];
          if (!includeHistorical || !Object.keys(entity).some(isManagedRatingKey)) return current;
          const activeKeys = new Set(current.map((field) => field.key));
          return [...current, ...ratingFieldHistory(config).filter((field) => own(entity, field.key) && !activeKeys.has(field.key))];
        }
        function validateRatingValue(field, value) {
          if (field.nullable && value === null) return value;
          const label = field.label || field.key;
          if (field.type === "number") {
            if (!Number.isFinite(value) || field.min !== void 0 && value < field.min || field.max !== void 0 && value > field.max)
              throw Error(`${label} \u6570\u503C\u8D85\u51FA\u8303\u56F4\u3002`);
            if (typeof field.step === "number") {
              const index = (value - (field.min ?? 0)) / field.step;
              if (!Number.isFinite(index) || Math.abs(index - Math.round(index)) > 1e-8) throw Error(`${label} \u987B\u7B26\u5408 ${field.step} \u7684\u6B65\u8FDB\u3002`);
            }
          } else if (field.type === "text") {
            if (typeof value !== "string" || field.options && !own(field.options, value)) throw Error(`${label} \u7684\u6587\u672C\u6216\u9009\u9879\u65E0\u6548\u3002`);
          } else if (field.type === "boolean") {
            if (typeof value !== "boolean") throw Error(`${label} \u987B\u4E3A\u52FE\u9009\u503C\u3002`);
          } else if (field.type === "list") {
            if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw Error(`${label} \u987B\u4E3A\u6587\u672C\u5217\u8868\u3002`);
          } else throw Error(`${label} \u7684\u8BC4\u5206\u5B57\u6BB5\u7C7B\u578B\u4E0D\u53D7\u652F\u6301\u3002`);
          return value;
        }
        module22.exports = {
          RATING_SCHEMA_VERSION,
          OVERALL_RATING,
          emptyRatingSchemes,
          normalizeRatingSchemes,
          validateRatingTransition,
          currentRatingScheme,
          previewRatingScheme,
          setRatingDefault,
          resolveRatingScheme,
          ratingFieldKey,
          isManagedRatingKey,
          ratingFieldHistory,
          ratingFields,
          validateRatingValue
        };
      }
    });
    var require_semantics = __commonJS2({
      "src/contracts/semantics.js"(exports2, module22) {
        "use strict";
        var PROVIDER_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
        var PARTIAL_DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;
        var TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|([+-])(\d{2}):(\d{2}))$/;
        var LOCAL_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;
        var POINTER_PATTERN = /^(?:\/(?:[^~/]|~[01])*)*$/;
        var CODE_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
        var ContractError = class extends Error {
          constructor(code, message, { path, retryable = false } = {}) {
            super(message);
            this.name = "ContractError";
            this.code = code;
            if (path !== void 0) this.path = path;
            this.retryable = retryable;
          }
        };
        function invalid(path, message) {
          throw new ContractError("invalid_structure", `${path || "/"} ${message}`, { path });
        }
        function pointer(path, key) {
          return `${path}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
        }
        function isRecord2(value) {
          if (!value || typeof value !== "object" || Array.isArray(value)) return false;
          const prototype = Object.getPrototypeOf(value);
          return prototype === Object.prototype || prototype === null;
        }
        function normalizePartialDate22(value, path = "") {
          const match = typeof value === "string" && PARTIAL_DATE_PATTERN.exec(value);
          if (!match) invalid(path, "\u987B\u4F7F\u7528 YYYY\u3001YYYY-MM \u6216 YYYY-MM-DD\u3002");
          const [, yearText, monthText = "01", dayText = "01"] = match;
          const year = Number(yearText), month = Number(monthText), day = Number(dayText);
          const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
          const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) invalid(path, "\u65E5\u5386\u65E5\u671F\u65E0\u6548\u3002");
          return value;
        }
        function normalizeTimestamp22(value, path = "") {
          const match = typeof value === "string" && TIMESTAMP_PATTERN.exec(value);
          if (!match) invalid(path, "\u987B\u4E3A\u5E26\u5DF2\u77E5\u65F6\u533A\u7684 RFC 3339 \u65F6\u95F4\u6233\u3002");
          const [, date, hour, minute, second, fraction = "", zone, sign, offsetHour, offsetMinute] = match;
          normalizePartialDate22(date, path);
          if (+hour > 23 || +minute > 59 || +second > 59 || +offsetHour > 23 || +offsetMinute > 59 || zone === "-00:00") {
            invalid(path, "\u65F6\u523B\u6216\u65F6\u533A\u504F\u79FB\u65E0\u6548\u3002");
          }
          const offset = sign ? (sign === "-" ? -1 : 1) * (+offsetHour * 60 + +offsetMinute) : 0;
          const instant = new Date(Date.parse(`${date}T${hour}:${minute}:${second}Z`) - offset * 6e4).toISOString();
          if (!/^\d{4}-/.test(instant) || instant.startsWith("0000")) invalid(path, "\u8F6C\u6362\u81F3 UTC \u540E\u5E74\u4EFD\u8D85\u51FA 0001\u20139999\u3002");
          return `${instant.slice(0, 19)}.${fraction.replace(/0+$/, "").padEnd(3, "0")}Z`;
        }
        function normalizeDisplayTime22(value, path = "") {
          if (typeof value === "string" && PARTIAL_DATE_PATTERN.test(value)) return normalizePartialDate22(value, path);
          const local = typeof value === "string" && LOCAL_TIME_PATTERN.exec(value);
          if (!local) {
            normalizeTimestamp22(value, path);
            return value;
          }
          const [, date, hour, minute, second = "00"] = local;
          normalizePartialDate22(date, path);
          if (+hour > 23 || +minute > 59 || +second > 59) invalid(path, "\u672C\u5730\u65F6\u523B\u65E0\u6548\u3002");
          return value;
        }
        function compareTimestamps(left, right) {
          const [a, aFraction = ""] = left.replace(/Z$/, "").split(".");
          const [b, bFraction = ""] = right.replace(/Z$/, "").split(".");
          if (a !== b) return a < b ? -1 : 1;
          const length = Math.max(aFraction.length, bFraction.length);
          const aFull = aFraction.padEnd(length, "0"), bFull = bFraction.padEnd(length, "0");
          return aFull === bFull ? 0 : aFull < bFull ? -1 : 1;
        }
        function normalizeExternalUrl22(value, path = "", { httpsOnly = false } = {}) {
          let parsed;
          if (typeof value === "string" && /^https?:\/\//i.test(value.trim()) && !/[\x00-\x1f\x7f]/.test(value)) {
            try {
              parsed = new URL(value.trim());
            } catch {
            }
          }
          if (!parsed || parsed.username || parsed.password || httpsOnly && parsed.protocol !== "https:")
            invalid(path, httpsOnly ? "\u987B\u4E3A\u4E0D\u542B\u51ED\u636E\u7684 HTTPS \u5730\u5740\u3002" : "\u987B\u4E3A\u4E0D\u542B\u51ED\u636E\u7684 HTTP(S) \u5730\u5740\u3002");
          return parsed.href;
        }
        function normalizeTextList(value, path = "") {
          if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) invalid(path, "\u987B\u4E3A\u6587\u672C\u5217\u8868\u3002");
          return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
        }
        function cloneJson(value, path = "") {
          if (value === null || typeof value === "string" || typeof value === "boolean" || Number.isFinite(value)) return value;
          if (Array.isArray(value)) return Array.from(value, (item, index) => cloneJson(item, pointer(path, index)));
          if (isRecord2(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJson(item, pointer(path, key))]));
          invalid(path, "\u987B\u4E3A JSON \u6570\u636E\u3002");
        }
        module22.exports = {
          ContractError,
          invalid,
          pointer,
          isRecord: isRecord2,
          cloneJson,
          normalizeTextList,
          normalizeExternalUrl: normalizeExternalUrl22,
          normalizeTimestamp: normalizeTimestamp22,
          normalizePartialDate: normalizePartialDate22,
          normalizeDisplayTime: normalizeDisplayTime22,
          compareTimestamps,
          PROVIDER_PATTERN,
          PARTIAL_DATE_PATTERN,
          TIMESTAMP_PATTERN,
          LOCAL_TIME_PATTERN,
          POINTER_PATTERN,
          CODE_PATTERN
        };
      }
    });
    var require_structure = __commonJS2({
      "src/contracts/structure.js"(exports2, module22) {
        "use strict";
        var {
          invalid,
          pointer,
          isRecord: isRecord2,
          cloneJson,
          normalizeTextList,
          normalizeExternalUrl: normalizeExternalUrl22,
          normalizeTimestamp: normalizeTimestamp22,
          normalizePartialDate: normalizePartialDate22,
          normalizeDisplayTime: normalizeDisplayTime22,
          PROVIDER_PATTERN,
          PARTIAL_DATE_PATTERN,
          TIMESTAMP_PATTERN,
          LOCAL_TIME_PATTERN,
          POINTER_PATTERN,
          CODE_PATTERN
        } = require_semantics();
        var define = (schema, parse) => ({ schema, parse });
        var scalar = (schema, passes, message, normalize2 = (value) => value) => define(schema, (value, path) => {
          if (!passes(value)) invalid(path, message);
          return normalize2(value);
        });
        var string = (schema, passes, message, normalize2) => scalar({ type: "string", ...schema }, (value) => typeof value === "string" && passes(value), message, normalize2);
        var trimmed2 = (value) => value.trim();
        var text2 = string({}, () => true, "\u987B\u4E3A\u6587\u672C\u3002", trimmed2);
        var nonEmptyText = string({ pattern: "\\S" }, (value) => Boolean(value.trim()), "\u987B\u4E3A\u975E\u7A7A\u6587\u672C\u3002", trimmed2);
        var markdown = string({}, () => true, "\u987B\u4E3A Markdown \u6587\u672C\u3002");
        var nonEmptyMarkdown = string({ pattern: "\\S" }, (value) => Boolean(value.trim()), "\u987B\u4E3A\u975E\u7A7A Markdown \u6587\u672C\u3002");
        var id = string(
          { pattern: "^(?=[^\\x00-\\x1f\\x7f]*\\S)[^\\x00-\\x1f\\x7f]+$" },
          (value) => Boolean(value.trim()) && !/[\x00-\x1f\x7f]/.test(value),
          "\u987B\u4E3A\u975E\u7A7A\u6587\u672C ID\u3002",
          trimmed2
        );
        var matching = (pattern, message) => string({ pattern: pattern.source }, (value) => pattern.test(value), message);
        var provider = matching(PROVIDER_PATTERN, "\u987B\u4E3A\u5C0F\u5199\u6765\u6E90\u5E73\u53F0\u6807\u8BC6\u3002");
        var diagnosticCode = matching(CODE_PATTERN, "\u987B\u4E3A\u7A33\u5B9A\u9519\u8BEF\u4EE3\u7801\u3002");
        var jsonPointer = matching(POINTER_PATTERN, "\u987B\u4E3A\u6709\u6548\u7684 JSON Pointer\u3002");
        var boolean = scalar({ type: "boolean" }, (value) => typeof value === "boolean", "\u987B\u4E3A\u5E03\u5C14\u503C\u3002");
        function numeric({ integer = false, min, max, positive = false } = {}) {
          const schema = { type: integer ? "integer" : "number" };
          if (min !== void 0) schema.minimum = min;
          if (max !== void 0) schema.maximum = max;
          if (positive) schema.exclusiveMinimum = 0;
          return scalar(
            schema,
            (value) => Number.isFinite(value) && (!integer || Number.isSafeInteger(value)) && (min === void 0 || value >= min) && (max === void 0 || value <= max) && (!positive || value > 0),
            "\u6570\u503C\u8D85\u51FA\u5141\u8BB8\u8303\u56F4\u6216\u7C7B\u578B\u4E0D\u7B26\u3002"
          );
        }
        function enumOf(values) {
          return scalar({ enum: values }, (value) => values.includes(value), `\u987B\u4E3A ${values.join("\u3001")} \u4E4B\u4E00\u3002`);
        }
        function literal(value) {
          return scalar({ const: value }, (other) => other === value, `\u987B\u4E3A ${value}\u3002`);
        }
        function arrayOf(item, { nonEmpty = false } = {}) {
          return define({ type: "array", items: item.schema, ...nonEmpty && { minItems: 1 } }, (value, path) => {
            if (!Array.isArray(value) || nonEmpty && !value.length) invalid(path, "\u5217\u8868\u7C7B\u578B\u6216\u957F\u5EA6\u4E0D\u7B26\u3002");
            return Array.from(value, (entry, index) => item.parse(entry, pointer(path, index)));
          });
        }
        function textList({ nonEmpty = false } = {}) {
          const schema = { type: "array", items: { type: "string" }, ...nonEmpty && { contains: { type: "string", pattern: "\\S" } } };
          return define(schema, (value, path) => {
            const result = normalizeTextList(value, path);
            if (nonEmpty && !result.length) invalid(path, "\u987B\u5305\u542B\u6709\u6548\u6587\u672C\u3002");
            return result;
          });
        }
        function shape(fields, { required = [], nonEmpty = false } = {}) {
          const schema = {
            type: "object",
            properties: Object.fromEntries(Object.entries(fields).map(([key, definition]) => [key, definition.schema])),
            additionalProperties: false,
            ...required.length && { required },
            ...nonEmpty && { minProperties: 1 }
          };
          return define(schema, (value, path) => {
            if (!isRecord2(value) || nonEmpty && !Object.keys(value).length) invalid(path, "\u987B\u4E3A\u6709\u6548\u5BF9\u8C61\u3002");
            for (const key of Object.keys(value)) if (!Object.hasOwn(fields, key)) invalid(pointer(path, key), "\u5B57\u6BB5\u4E0D\u53D7\u652F\u6301\u3002");
            for (const key of required) if (!Object.hasOwn(value, key)) invalid(pointer(path, key), "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5\u3002");
            return Object.fromEntries(Object.entries(fields).flatMap(([key, definition]) => Object.hasOwn(value, key) ? [[key, definition.parse(value[key], pointer(path, key))]] : []));
          });
        }
        function jsonObject(value, path) {
          if (!isRecord2(value)) invalid(path, "\u987B\u4E3A JSON \u5BF9\u8C61\u3002");
          return cloneJson(value, path);
        }
        var timestampSchema = { type: "string", format: "date-time", pattern: TIMESTAMP_PATTERN.source, not: { pattern: "-00:00$" } };
        var partialDateSchema = { type: "string", pattern: PARTIAL_DATE_PATTERN.source };
        var dateTime = define(timestampSchema, normalizeTimestamp22);
        var partialDate = define(partialDateSchema, normalizePartialDate22);
        var displayTime = define({ anyOf: [partialDateSchema, { type: "string", pattern: LOCAL_TIME_PATTERN.source }, timestampSchema] }, normalizeDisplayTime22);
        var httpsUrl = define({ type: "string", format: "uri", pattern: "^https://" }, (value, path) => normalizeExternalUrl22(value, path, { httpsOnly: true }));
        var httpUrl = define({ type: "string", format: "uri", pattern: "^https?://" }, normalizeExternalUrl22);
        var json = define({}, cloneJson);
        var jsonRecord = define({ type: "object" }, jsonObject);
        module22.exports = {
          define,
          string,
          text: text2,
          nonEmptyText,
          markdown,
          nonEmptyMarkdown,
          id,
          provider,
          diagnosticCode,
          jsonPointer,
          boolean,
          numeric,
          enumOf,
          literal,
          arrayOf,
          textList,
          shape,
          dateTime,
          partialDate,
          displayTime,
          httpsUrl,
          httpUrl,
          json,
          jsonRecord
        };
      }
    });
    var require_ratings = __commonJS2({
      "src/contracts/ratings.js"(exports2, module22) {
        "use strict";
        var wire = require_structure();
        var { invalid, pointer } = require_semantics();
        function ratingCodec({ platform = false } = {}) {
          const shape = wire.shape({
            value: wire.numeric({ min: 0 }),
            scale: wire.numeric({ positive: true }),
            ...platform && { votes: wire.numeric({ min: 0, max: Number.MAX_SAFE_INTEGER, integer: true }) }
          }, { required: ["value", "scale"] });
          return wire.define(shape.schema, (value, path) => {
            const rating = shape.parse(value, path);
            if (rating.value > rating.scale) invalid(pointer(path, "value"), "\u8BC4\u5206\u4E0D\u80FD\u8D85\u8FC7\u91CF\u5C3A\u3002");
            return rating;
          });
        }
        module22.exports = { ratingCodec };
      }
    });
    var require_positions = __commonJS2({
      "src/positions.js"(exports2, module22) {
        "use strict";
        var POSITION_KINDS = /* @__PURE__ */ new Set(["episode", "volume", "chapter", "page", "paragraph", "excerpt"]);
        var POSITION_FIELDS = /* @__PURE__ */ new Set(["kind", "number", "label", "episodeType", "timepoint", "edition", "external"]);
        var EPISODE_TYPES = /* @__PURE__ */ new Set(["regular", "special", "unknown"]);
        var START = /^<!-- media-core:position (\{.*\}) -->$/;
        var END = /^<!-- media-core:position:end ([A-Za-z0-9-]+) -->$/;
        var ANCHOR = /^.+\s\^([A-Za-z0-9-]+)$/;
        var RECORD_ID = /^[A-Za-z0-9-]+$/;
        var WORK_UID = /^[A-Za-z0-9_-]+$/;
        var object = (value) => value && typeof value === "object" && !Array.isArray(value);
        function oneLine(value, name) {
          if (typeof value !== "string" || /[\r\n\0]/.test(value) || !value.trim()) throw Error(name + "\u987B\u4E3A\u975E\u7A7A\u5355\u884C\u6587\u672C\u3002");
          return value.trim();
        }
        function normalizeTimepoint(input) {
          const value = oneLine(input, "\u65F6\u95F4\u70B9");
          if (!/^(?:\d{1,3}:)?[0-5]?\d:[0-5]\d$/.test(value)) throw Error("\u65F6\u95F4\u70B9\u683C\u5F0F\u4E3A MM:SS \u6216 HH:MM:SS\u3002");
          const pieces = value.split(":").map(Number);
          if (pieces.length === 2) pieces.unshift(0);
          return pieces.map((value2) => String(value2).padStart(2, "0")).join(":");
        }
        function normalizePosition(input) {
          if (!object(input) || !POSITION_KINDS.has(input.kind)) throw Error("\u4E0D\u652F\u6301\u7684\u4F5C\u54C1\u4F4D\u7F6E\u7C7B\u578B\u3002");
          for (const key of Object.keys(input)) if (!POSITION_FIELDS.has(key)) throw Error("\u672A\u77E5\u4F4D\u7F6E\u5B57\u6BB5\uFF1A" + key);
          const { kind } = input;
          const position = { kind };
          if (input.number !== void 0) {
            const whole = ["episode", "page", "paragraph"].includes(kind);
            if (!Number.isFinite(input.number) || input.number <= 0 || whole && !Number.isSafeInteger(input.number)) {
              throw Error(whole ? "\u4F4D\u7F6E\u7F16\u53F7\u987B\u4E3A\u6B63\u6574\u6570\u3002" : "\u4F4D\u7F6E\u7F16\u53F7\u987B\u4E3A\u6B63\u6570\u3002");
            }
            position.number = input.number;
          }
          if (input.label !== void 0) position.label = oneLine(input.label, "\u4F4D\u7F6E\u6807\u7B7E");
          if (kind === "episode") {
            const episodeType = input.episodeType ?? (position.number || position.label ? "regular" : "unknown");
            if (!EPISODE_TYPES.has(episodeType) || episodeType === "unknown" && position.number !== void 0) {
              throw Error("\u96C6\u6570\u7C7B\u578B\u987B\u4E3A\u666E\u901A\u3001\u7279\u522B\u7BC7\u6216\u672A\u77E5\u3002\u672A\u77E5\u96C6\u6570\u4E0D\u586B\u7F16\u53F7\u3002");
            }
            position.episodeType = episodeType;
            if (input.timepoint !== void 0) position.timepoint = normalizeTimepoint(input.timepoint);
          } else if (input.episodeType !== void 0 || input.timepoint !== void 0) {
            throw Error("\u96C6\u6570\u7C7B\u578B\u548C\u5F71\u89C6\u65F6\u95F4\u70B9\u53EA\u80FD\u7528\u4E8E\u5F71\u89C6\u4F4D\u7F6E\u3002");
          }
          if (position.number === void 0 && !position.label && (kind !== "episode" || position.episodeType === "regular")) {
            throw Error("\u8BF7\u586B\u5199\u4F4D\u7F6E\u7F16\u53F7\u6216\u6807\u7B7E\u3002");
          }
          if (input.edition !== void 0) position.edition = oneLine(input.edition, "\u7248\u672C\u5F15\u7528");
          if (input.external !== void 0) {
            const value = input.external;
            if (!object(value) || typeof value.provider !== "string" || !/^[a-z][a-z0-9_-]*$/.test(value.provider) || Object.keys(value).some((key) => !["provider", "id"].includes(key))) throw Error("\u5916\u90E8\u4F4D\u7F6E\u987B\u5305\u542B\u6765\u6E90\u6807\u8BC6\u548C\u6761\u76EE ID\u3002");
            position.external = { provider: value.provider, id: oneLine(value.id, "\u5916\u90E8\u4F4D\u7F6E ID") };
          }
          return position;
        }
        function formatPositionLabel(input) {
          const { kind, number, label, episodeType, timepoint, edition } = normalizePosition(input);
          let display = label;
          if (!display) {
            const numbered = { episode: "\u96C6", volume: "\u5377", chapter: "\u7AE0", page: "\u9875", paragraph: "\u6BB5", excerpt: "\u5904\u6458\u5F55" };
            if (kind === "episode" && episodeType === "unknown") display = "\u96C6\u6570\u5F85\u8865";
            else if (kind === "episode" && episodeType === "special") display = number === void 0 ? "\u7279\u522B\u7BC7" : "\u7279\u522B\u7BC7 " + number;
            else display = "\u7B2C " + number + " " + numbered[kind];
          }
          return [display, timepoint?.replace(/^00:/, ""), edition && "\u7248\u672C\uFF1A" + edition].filter(Boolean).join(" \xB7 ");
        }
        function positionKey(input) {
          const { kind, number, label, episodeType, timepoint, edition } = normalizePosition(input);
          return JSON.stringify([kind, episodeType, number ?? label, timepoint, edition]);
        }
        function normalizeRecord(input) {
          if (!object(input) || typeof input.id !== "string" || !RECORD_ID.test(input.id) || typeof input.workUid !== "string" || !WORK_UID.test(input.workUid)) throw Error("\u4F4D\u7F6E\u8BB0\u5F55\u7F3A\u5C11\u6709\u6548\u7684\u6BB5\u843D\u6807\u8BC6\u6216 Work UID\u3002");
          const { id, workUid, date } = input;
          if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("\u8BB0\u5F55\u65E5\u671F\u987B\u4E3A YYYY-MM-DD\u3002");
          const instant = /* @__PURE__ */ new Date(date + "T00:00:00Z");
          if (!Number.isFinite(instant.valueOf()) || instant.toISOString().slice(0, 10) !== date) throw Error("\u8BB0\u5F55\u65E5\u671F\u65E0\u6548\u3002");
          return { v: 1, id, workUid, date, position: normalizePosition(input.position) };
        }
        function escapeInline(value) {
          return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/[\\*_[\]\x60|^]/g, "\\$&");
        }
        function makePositionEntry(input) {
          const record = normalizeRecord(input);
          const { id, date, position } = record;
          const { body = "" } = input;
          if (typeof body !== "string") throw Error("\u4F4D\u7F6E\u8BB0\u5F55\u6B63\u6587\u987B\u4E3A Markdown \u6587\u672C\u3002");
          const metadata = JSON.stringify(record).replace(/[<>&[\]\u2028\u2029]/g, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
          return [
            "<!-- media-core:position " + metadata + " -->",
            "",
            "**" + escapeInline(date + " \xB7 " + formatPositionLabel(position)) + "** ^" + id,
            "",
            body,
            "",
            "<!-- media-core:position:end " + id + " -->",
            ""
          ].join("\n");
        }
        function fenceAfter(line, fence) {
          const match = line.match(/^ {0,3}(\x60{3,}|~{3,})(.*)$/);
          if (!match) return fence;
          const [, delimiter, info] = match;
          if (fence) return delimiter[0] === fence[0] && delimiter.length >= fence.length && !info.trim() ? null : fence;
          return delimiter[0] === "`" && info.includes("`") ? null : delimiter;
        }
        function readPositionEntries(markdown, { workUid, includeEmpty = false } = {}) {
          const lines = String(markdown).split(/\r\n|\r|\n/);
          const frontmatterEnd = /^\uFEFF?---\s*$/.test(lines[0]) ? lines.findIndex((line, i) => i > 0 && /^---\s*$/.test(line)) : -1;
          const entries = [];
          const seen = /* @__PURE__ */ new Set();
          const duplicates = /* @__PURE__ */ new Set();
          let fence = null;
          let active = null;
          for (let line = frontmatterEnd + 1; line < lines.length; line++) {
            const previousFence = fence;
            fence = fenceAfter(lines[line], fence);
            if (previousFence || fence) continue;
            const start = lines[line].match(START);
            if (start) {
              try {
                const raw = JSON.parse(start[1]);
                if (raw?.v !== 1) continue;
                const record = normalizeRecord(raw);
                const anchorLine2 = lines[line + 1]?.trim() === "" ? line + 2 : line + 1;
                if (lines[anchorLine2]?.match(ANCHOR)?.[1] !== record.id) continue;
                const bodyLine2 = lines[anchorLine2 + 1]?.trim() === "" ? anchorLine2 + 2 : anchorLine2 + 1;
                active = { ...record, anchorLine: anchorLine2, bodyLine: bodyLine2 };
              } catch {
              }
              continue;
            }
            const closingId = lines[line].match(END)?.[1];
            if (!active || closingId !== active.id || line < active.bodyLine) continue;
            const { id, date, position, anchorLine, bodyLine } = active;
            const bodyEnd = lines[line - 1]?.trim() === "" ? line - 1 : line;
            const body = lines.slice(bodyLine, bodyEnd).join("\n");
            const hasContent = !!body.replace(/<!--[\s\S]*?-->/g, "").trim();
            if (seen.has(id)) duplicates.add(id);
            seen.add(id);
            entries.push({
              id,
              date,
              position,
              anchorLine,
              bodyLine,
              body,
              hasContent,
              workUid: active.workUid,
              blockRef: "^" + id,
              label: formatPositionLabel(position)
            });
            active = null;
          }
          return entries.filter((entry) => !duplicates.has(entry.id) && (workUid === void 0 || entry.workUid === workUid) && (includeEmpty || entry.hasContent));
        }
        function findPositionLine(markdown, id, { workUid, body = false } = {}) {
          const entry = readPositionEntries(markdown, { workUid, includeEmpty: true }).find((entry2) => entry2.id === id);
          return entry ? body ? entry.bodyLine : entry.anchorLine : null;
        }
        module22.exports = { normalizePosition, formatPositionLabel, positionKey, makePositionEntry, readPositionEntries, findPositionLine };
      }
    });
    var require_position = __commonJS2({
      "src/contracts/position.js"(exports2, module22) {
        "use strict";
        var { normalizePosition } = require_positions();
        var { invalid } = require_semantics();
        var wire = require_structure();
        var positionShape = wire.shape({
          kind: wire.enumOf(["episode", "volume", "chapter", "page", "paragraph", "excerpt"]),
          number: wire.numeric({ positive: true }),
          label: wire.nonEmptyText,
          episodeType: wire.enumOf(["regular", "special", "unknown"]),
          timepoint: wire.nonEmptyText,
          edition: wire.id,
          external: wire.shape({ provider: wire.provider, id: wire.id }, { required: ["provider", "id"] })
        }, { required: ["kind"] });
        var position = wire.define(positionShape.schema, (value, path) => {
          positionShape.parse(value, path);
          try {
            return normalizePosition(value);
          } catch (error) {
            invalid(path, error.message);
          }
        });
        module22.exports = { position };
      }
    });
    var require_field_catalog = __commonJS2({
      "src/field-catalog.js"(exports2, module22) {
        "use strict";
        var { OVERALL_RATING } = require_rating_schemes();
        var { frontmatterField } = require_field_description();
        var { normalizeTextList } = require_semantics();
        var wire = require_structure();
        var { ratingCodec } = require_ratings();
        var { position } = require_position();
        var MEDIA_LABELS = Object.freeze({ anime: "\u52A8\u753B", manga: "\u6F2B\u753B", light_novel: "\u8F7B\u5C0F\u8BF4", book: "\u56FE\u4E66", short_story: "\u77ED\u7BC7", article: "\u6587\u7AE0", webnovel: "\u7F51\u6587", film: "\u7535\u5F71", tv: "\u7535\u89C6\u5267", game: "\u6E38\u620F", music: "\u97F3\u4E50" });
        var SERIES_KINDS = Object.freeze({ work: "\u4F5C\u54C1\u7CFB\u5217", creator: "\u521B\u4F5C\u8005", theme: "\u4E3B\u9898\u96C6\u5408" });
        var STATUS_LABELS = Object.freeze({ wish: "\u60F3\u770B / \u60F3\u8BFB", doing: "\u8FDB\u884C\u4E2D", done: "\u5DF2\u5B8C\u6210", paused: "\u6401\u7F6E", dropped: "\u653E\u5F03" });
        var WORK = ["work"];
        var WORK_AND_SERIES = ["work", "series"];
        var ENTITIES = ["work", "series", "note"];
        var NON_NEGATIVE = wire.numeric({ min: 0 });
        var COUNT = wire.numeric({ integer: true, min: 0, max: Number.MAX_SAFE_INTEGER });
        var TEXT_LIST = wire.textList({ nonEmpty: true });
        var STATUS_UNKNOWN = /^(?:[Uu][Nn][Kk][Nn][Oo][Ww][Nn])$/;
        var ORIGINAL_STATUS = wire.string(
          { pattern: "\\S", not: { pattern: STATUS_UNKNOWN.source } },
          (value) => Boolean(value.trim()) && !STATUS_UNKNOWN.test(value.trim()),
          "\u672A\u77E5\u539F\u4F5C\u72B6\u6001\u987B\u7701\u7565\uFF0C\u539F\u6587\u53EF\u653E\u5165\u5E73\u53F0\u6269\u5C55\u3002",
          (value) => value.trim()
        );
        function local(key, label, type, details = {}) {
          const { group = "basic", entities = WORK_AND_SERIES, editable = true, ...metadata } = details;
          return frontmatterField({ key, label, type, group, entities, editable }, metadata);
        }
        function sourced(key, label, type, meaning, details = {}) {
          const {
            wireType = wire.nonEmptyText,
            v1 = "text",
            merge = "single",
            semantic = "text",
            localService = false,
            compatibility,
            ...localDetails
          } = details;
          return local(key, label, type, {
            meaning,
            semantic,
            ...localDetails,
            permissions: { user: true, localService, sourceCandidate: true },
            source: { v1, v2: wireType, scope: "work", merge, protectLocal: true },
            ...compatibility && { compatibility }
          });
        }
        var credit = (role, extra = {}) => ({
          wireType: TEXT_LIST,
          v1: "text-list",
          semantic: role,
          compatibility: { readAs: "credit-list" },
          ...extra
        });
        var list2 = (merge = "single") => ({
          wireType: TEXT_LIST,
          v1: "text-list",
          merge,
          semantic: "text-list",
          compatibility: { readAs: "list-default" }
        });
        var relation = (key, label, entities) => local(key, label, "list", {
          entities,
          semantic: "entity-reference-list",
          memberType: "entity-reference",
          meaning: `\u539F\u751F\u94FE\u63A5\u8868\u8FBE${label}\u5173\u7CFB\u3002`,
          compatibility: { readAs: "list-default" }
        });
        var personal = (key, label, type = "text", details = {}) => local(key, label, type, { group: "user", entities: WORK, ...details });
        var system = (key, label, type, entities, semantic) => local(key, label, type, {
          group: "system",
          entities,
          semantic,
          editable: false,
          permissions: { user: false, localService: true, sourceCandidate: false }
        });
        var FRONTMATTER_FIELDS = Object.freeze([
          sourced("title", "\u6807\u9898", "text", "\u4F5C\u54C1\u6216\u96C6\u5408\u7684\u5F53\u524D\u6807\u9898\u3002", { compatibility: { readAs: "filename-fallback" } }),
          sourced("original", "\u539F\u540D", "text", "\u539F\u6587\u6807\u9898\uFF0C\u4E0E\u8BD1\u540D\u548C\u5176\u4ED6\u522B\u540D\u5206\u5F00\u3002"),
          sourced("aliases", "\u522B\u540D", "list", "\u4F5C\u54C1\u7684\u5176\u4ED6\u68C0\u7D22\u540D\u79F0\u3002", list2("combine")),
          sourced("summary", "\u7B80\u4ECB", "text", "\u8D44\u6599\u7B80\u4ECB\uFF0C\u72EC\u7ACB\u4E8E\u6765\u6E90\u6B63\u6587\u548C\u4E2A\u4EBA\u77ED\u8BC4\u3002", {
            wireType: wire.nonEmptyMarkdown,
            semantic: "markdown",
            multiline: true
          }),
          sourced("authors", "\u4F5C\u8005 / \u521B\u4F5C\u8005", "list", "\u4F5C\u8005\u89D2\u8272\u7F72\u540D\uFF0C\u517C\u5BB9\u65E7 author\u3002", {
            ...credit("author-list"),
            localService: true,
            compatibility: { readAs: "credit-list", aliases: ["author"] }
          }),
          sourced("directors", "\u5BFC\u6F14", "list", "\u5BFC\u6F14\u89D2\u8272\u7F72\u540D\u3002", credit("director-list")),
          sourced("illustrators", "\u63D2\u753B\u8005", "list", "\u63D2\u753B\u89D2\u8272\u7F72\u540D\u3002", credit("illustrator-list", { entities: WORK })),
          sourced("performers", "\u8868\u6F14\u8005", "list", "\u8868\u6F14\u8005\u3001\u6F14\u5531\u8005\u6216\u6F14\u5458\u89D2\u8272\u7F72\u540D\u3002", credit("performer-list", { entities: WORK })),
          sourced("publishers", "\u51FA\u7248\u793E", "list", "\u4F5C\u54C1\u8D44\u6599\u7684\u51FA\u7248\u793E\u540D\u5355\uFF0C\u4E0E\u7248\u672C\u8BD1\u8005\u5206\u5F00\u3002", {
            ...list2(),
            semantic: "publisher-list",
            compatibility: { comparison: "scalar-or-list" }
          }),
          local("author", "\u4F5C\u8005\uFF08\u65E7\u5B57\u6BB5\uFF09", "text", { legacy: true, compatibility: { replacement: "authors" } }),
          sourced("studio", "\u5236\u4F5C\u65B9", "text", "\u8D1F\u8D23\u5236\u4F5C\u7684\u673A\u6784\u3002"),
          sourced("year", "\u9996\u53D1\u5E74", "text", "\u4F5C\u54C1\u7684\u9996\u53D1\u516C\u5143\u5E74\u4EFD\u3002", {
            v1: "year-text-or-integer",
            wireType: wire.numeric({ integer: true, min: 1, max: 9999 }),
            semantic: "year",
            year: true,
            compatibility: { readAs: "preserve-raw", comparison: "numeric-year" }
          }),
          sourced("release_date", "\u53D1\u884C\u65E5\u671F", "text", "\u4F5C\u54C1\u9996\u6B21\u53D1\u884C\u65E5\u671F\uFF0C\u4FDD\u7559\u5DF2\u77E5\u7CBE\u5EA6\u3002", {
            wireType: wire.partialDate,
            semantic: "partial-date",
            compatibility: { readAs: "preserve-raw", v1: "historical-display-text" }
          }),
          sourced("latest_chapter_updated_at", "\u6700\u8FD1\u7AE0\u8282\u66F4\u65B0\u65F6\u95F4", "text", "\u6765\u6E90\u5DF2\u77E5\u7684\u6700\u8FD1\u7AE0\u8282\u66F4\u65B0\u65F6\u95F4\u3002", {
            entities: WORK,
            wireType: wire.displayTime,
            semantic: "source-display-time",
            compatibility: { readAs: "preserve-raw", v1: "historical-display-text" }
          }),
          sourced("region", "\u5730\u533A", "text", "\u4F5C\u54C1\u7684\u6765\u6E90\u5730\u533A\u3002"),
          sourced("language", "\u8BED\u8A00", "text", "\u4F5C\u54C1\u7684\u8BED\u8A00\u3002"),
          sourced("original_status", "\u539F\u4F5C\u72B6\u6001", "text", "\u539F\u4F5C\u8FDE\u8F7D\u6216\u53D1\u5E03\u72B6\u6001\u3002", {
            wireType: ORIGINAL_STATUS,
            semantic: "original-status",
            enumeration: "open-with-unknown"
          }),
          sourced("cover", "\u5C01\u9762", "text", "\u4F5C\u54C1\u53EF\u4F7F\u7528\u8FDC\u7AEF\u56FE\u7247 URL \u6216\u672C\u5730\u9644\u4EF6\uFF0C\u6765\u6E90\u5019\u9009\u987B\u4E3A\u56FE\u7247 URL\u3002", {
            wireType: wire.httpUrl,
            semantic: "image-url-or-attachment",
            localService: true
          }),
          local("cover_source_work", "\u5C01\u9762\u53D6\u81EA\u4F5C\u54C1", "text", { entities: ["series"], semantic: "entity-reference" }),
          sourced("format", "\u5F62\u5F0F", "text", "\u4F5C\u54C1\u7684\u5A92\u4ECB\u5185\u5F62\u5F0F\uFF0C\u72EC\u7ACB\u4E8E\u8D44\u6E90\u6587\u4EF6\u683C\u5F0F\u3002"),
          sourced("tags", "\u9898\u6750\u6807\u7B7E", "list", "\u4F5C\u54C1\u7684\u9898\u6750\u6216\u7C7B\u522B\u6807\u7B7E\uFF0C\u72EC\u7ACB\u4E8E\u4E2A\u4EBA\u6807\u7B7E\u3002", list2("combine")),
          local("media", "\u5A92\u4ECB", "text", { entities: WORK, options: MEDIA_LABELS, enumeration: "local-config", semantic: "media-type" }),
          relation("series", "\u6240\u5C5E\u7CFB\u5217", WORK),
          relation("included_in", "\u6536\u5F55\u4E8E\u5408\u96C6", WORK),
          sourced("publication_channel", "\u53D1\u5E03\u6E20\u9053", "text", "\u6587\u7AE0\u3001\u77ED\u7BC7\u6216\u7F51\u6587\u5B9E\u9645\u53D1\u5E03\u7684\u5E73\u53F0\u6216\u6E20\u9053\u3002", {
            entities: WORK,
            media: ["article", "short_story", "webnovel"],
            v1: false
          }),
          relation("parent_series", "\u7236\u7CFB\u5217", ["series"]),
          local("series_kind", "\u96C6\u5408\u7C7B\u578B", "text", { entities: ["series"], options: SERIES_KINDS, enumeration: "closed" }),
          local("creator_ids", "\u805A\u5408\u8EAB\u4EFD\u53CA\u522B\u540D ID", "list", { entities: ["series"], semantic: "creator-id-list", compatibility: { readAs: "list-default" } }),
          local("creator_roles", "\u5339\u914D\u521B\u4F5C\u89D2\u8272", "list", { entities: ["series"], semantic: "creator-role-list", compatibility: { readAs: "list-default" } }),
          local("creator_credits", "\u521B\u4F5C\u8EAB\u4EFD\uFF08\u89D2\u8272|ID\uFF09", "list", { entities: WORK, semantic: "creator-credit-list", compatibility: { readAs: "list-default" } }),
          relation("about", "\u5173\u8054\u5BF9\u8C61", ["note"]),
          personal("status", "\u72B6\u6001", "text", { options: STATUS_LABELS, enumeration: "closed", semantic: "personal-status" }),
          OVERALL_RATING,
          personal("progress", "\u5F53\u524D\u8FDB\u5EA6", "number", { min: 0, step: 1, semantic: "nonnegative-number" }),
          sourced("total", "\u603B\u8FDB\u5EA6", "number", "\u4F5C\u54C1\u603B\u91CF\uFF0C\u660E\u786E\u586B\u5199\u7684 0 \u662F\u672C\u5730\u503C\u3002", {
            entities: WORK,
            min: 0,
            step: 1,
            nullable: true,
            wireType: NON_NEGATIVE,
            v1: "nonnegative-number",
            semantic: "nonnegative-number"
          }),
          sourced("unit", "\u8FDB\u5EA6\u5355\u4F4D", "text", "\u8FDB\u5EA6\u7684\u8BA1\u91CF\u5355\u4F4D\uFF0C\u4F8B\u5982\u96C6\u3001\u5377\u6216\u7AE0\u3002", { entities: WORK }),
          personal("personal_tags", "\u4E2A\u4EBA\u6807\u7B7E", "list", { entities: WORK_AND_SERIES, compatibility: { readAs: "list-default" } }),
          personal("comment", "\u77ED\u8BC4", "text", { multiline: true, entities: WORK_AND_SERIES, semantic: "markdown" }),
          personal("started_at", "\u5F00\u59CB\u65E5\u671F", "text", { semantic: "personal-date", meaning: "\u7528\u6237\u5F00\u59CB\u9605\u8BFB\u3001\u89C2\u770B\u6216\u6E38\u73A9\u7684\u65E5\u671F\u3002" }),
          personal("finished_at", "\u7ED3\u675F\u65E5\u671F", "text", { semantic: "personal-date", meaning: "\u7528\u6237\u5B8C\u6210\u9605\u8BFB\u3001\u89C2\u770B\u6216\u6E38\u73A9\u7684\u65E5\u671F\u3002" })
        ]);
        var SYSTEM_FIELDS = Object.freeze([
          system("uid", "\u672C\u5730\u7A33\u5B9A\u6807\u8BC6", "text", ENTITIES, "local-id"),
          system("type", "\u5B9E\u4F53\u7C7B\u578B", "text", ENTITIES, "entity-type"),
          system("schema_version", "\u5B9E\u4F53\u5B58\u50A8\u7248\u672C", "number", ENTITIES, "version"),
          system("note_kind", "\u7B14\u8BB0\u7C7B\u578B", "text", ["note"], "note-kind"),
          system("rating_scheme", "\u6240\u9009\u8BC4\u5206\u65B9\u6848", "text", WORK_AND_SERIES, "rating-scheme-reference"),
          system("creator_auto_credits", "\u81EA\u52A8\u8BC6\u522B\u7684\u521B\u4F5C\u8EAB\u4EFD", "list", WORK, "creator-credit-list"),
          system("series_display", "\u7CFB\u5217\u5C55\u793A\u63A8\u5BFC\u72B6\u6001", "object", ["series"], "series-display-state"),
          system("cssclasses", "Obsidian \u9875\u9762\u7C7B\u540D", "list", ENTITIES, "text-list")
        ].map((field) => field.key === "creator_auto_credits" ? { ...field, compatibility: { readAs: "list-default" } } : field));
        var byKey = new Map(FRONTMATTER_FIELDS.map((field) => [field.key, field]));
        var SOURCE_V1_FIELDS = Object.freeze(FRONTMATTER_FIELDS.filter((field) => field.source?.v1).map((field) => field.key));
        var SOURCE_V2_FIELDS = Object.freeze([...SOURCE_V1_FIELDS, ...FRONTMATTER_FIELDS.filter((field) => field.source && !field.source.v1).map((field) => field.key)]);
        var SOURCE_FIELDS = SOURCE_V2_FIELDS;
        var SOURCE_LIST_FIELDS = new Set(SOURCE_FIELDS.filter((key) => byKey.get(key).type === "list"));
        var COMBINED_SOURCE_FIELDS = new Set(SOURCE_FIELDS.filter((key) => byKey.get(key).source.merge === "combine"));
        var sourceV1Type = (key) => byKey.get(key)?.source?.v1;
        var sourceV2Codec = (key) => byKey.get(key)?.source?.v2;
        function sourceAppliesTo(key, media) {
          const field = byKey.get(key);
          return Boolean(field?.source && (!field.media || field.media.includes(media)));
        }
        function comparableFieldValue(key, value) {
          if (byKey.get(key)?.year && typeof value === "string" && /^\d{1,4}$/.test(value.trim())) return Number(value.trim());
          if (SOURCE_LIST_FIELDS.has(key)) {
            if (typeof value === "string") return normalizeTextList([value]);
            if (Array.isArray(value) && value.every((item) => typeof item === "string")) return normalizeTextList(value);
          }
          return value;
        }
        function jsonField(domain, key, label, type, semantic, codec, details = {}) {
          return {
            id: `${domain}.${key}`,
            domain,
            key,
            label,
            meaning: label,
            type,
            semantic,
            codec,
            group: domain,
            storage: { kind: "json", key, read: "preserve-raw", write: "validated-append" },
            missing: { absent: "unknown", null: "invalid", empty: "preserve-confirmed", zero: "value" },
            permissions: { user: false, localService: true, sourceCandidate: true },
            ...type === "list" && { memberType: "text" },
            ...details
          };
        }
        var edition = (key, label, type, semantic, codec) => jsonField("edition", key, label, type, semantic, codec);
        var EDITION_FIELDS = Object.freeze([
          edition("isbn", "\u8BE5\u51FA\u7248\u7248\u672C\u7684 ISBN", "text", "id", wire.id),
          edition("binding", "\u8BE5\u51FA\u7248\u7248\u672C\u7684\u88C5\u5E27", "text", "text", wire.nonEmptyText),
          edition("translators", "\u8BE5\u51FA\u7248\u7248\u672C\u7684\u8BD1\u8005", "list", "translator-list", TEXT_LIST),
          edition("publishers", "\u8BE5\u51FA\u7248\u7248\u672C\u7684\u51FA\u7248\u793E", "list", "publisher-list", TEXT_LIST),
          edition("pages", "\u8BE5\u51FA\u7248\u7248\u672C\u7684\u9875\u6570", "number", "count", COUNT),
          edition("publication_date", "\u8BE5\u51FA\u7248\u7248\u672C\u7684\u51FA\u7248\u65E5\u671F", "text", "partial-date", wire.partialDate)
        ]);
        var PLATFORM_RATING = jsonField("source", "rating", "\u6765\u6E90\u5E73\u53F0\u6C47\u603B\u8BC4\u5206", "object", "platform-rating", ratingCodec({ platform: true }));
        var collection = (key, label, type, semantic, codec) => jsonField(
          "collection",
          key,
          label,
          type,
          semantic,
          codec,
          { permissions: { user: true, localService: true, sourceCandidate: true } }
        );
        var COLLECTION_FIELDS = Object.freeze([
          collection("status", "\u4E2A\u4EBA\u6536\u85CF\u72B6\u6001", "text", "personal-status", wire.enumOf(Object.keys(STATUS_LABELS))),
          collection("rating", "\u4E2A\u4EBA\u6536\u85CF\u8BC4\u5206\u53CA\u91CF\u5C3A", "object", "personal-rating", ratingCodec()),
          collection("progress", "\u4E2A\u4EBA\u6536\u85CF\u8FDB\u5EA6", "number", "nonnegative-number", NON_NEGATIVE),
          collection("unit", "\u4E2A\u4EBA\u6536\u85CF\u8FDB\u5EA6\u5355\u4F4D", "text", "text", wire.nonEmptyText),
          collection("comment", "\u4E2A\u4EBA\u6536\u85CF\u77ED\u8BC4", "text", "markdown", wire.markdown),
          collection("tags", "\u4E2A\u4EBA\u6536\u85CF\u6807\u7B7E", "list", "text-list", wire.textList()),
          collection("marked_at", "\u5E73\u53F0\u6536\u85CF\u6807\u8BB0\u65F6\u523B", "text", "source-display-time", wire.displayTime)
        ]);
        var CONTENT_FIELDS = Object.freeze([
          jsonField("content", "title", "\u6765\u6E90\u6B63\u6587\u6807\u9898", "text", "text", wire.nonEmptyText),
          jsonField("content", "authors", "\u6765\u6E90\u6B63\u6587\u7F72\u540D", "list", "author-list", TEXT_LIST),
          jsonField("content", "publisher", "\u6765\u6E90\u6B63\u6587\u7684\u53D1\u5E03\u8005", "text", "text", wire.nonEmptyText),
          jsonField("content", "published_at", "\u6765\u6E90\u6B63\u6587\u53D1\u5E03\u65E5\u671F", "text", "source-display-time", wire.displayTime)
        ]);
        var BODY_TEXT = jsonField(
          "content",
          "value",
          "\u6765\u6E90\u6B63\u6587 Markdown",
          "text",
          "markdown",
          wire.markdown,
          { storage: { kind: "markdown", key: "source-body", read: "managed-block", write: "reconcile-observed" } }
        );
        var ANNOTATION_FIELDS = Object.freeze([
          jsonField("annotation", "quote", "\u6765\u6E90\u9AD8\u4EAE\u5F15\u6587", "text", "markdown", wire.markdown),
          jsonField("annotation", "comment", "\u6765\u6E90\u5E73\u53F0\u4E0A\u7684\u4E2A\u4EBA\u6279\u6CE8", "text", "markdown", wire.markdown),
          jsonField("annotation", "location", "\u5F15\u7528\u4F4D\u7F6E\uFF08\u9875\u7801\u53EF\u5173\u8054\u7248\u6B21\uFF09", "object", "position-reference", position),
          jsonField("annotation", "created_at", "\u6765\u6E90\u6279\u6CE8\u521B\u5EFA\u65F6\u523B", "text", "source-display-time", wire.displayTime),
          jsonField("annotation", "updated_at", "\u6765\u6E90\u6279\u6CE8\u66F4\u65B0\u65F6\u523B", "text", "source-display-time", wire.displayTime),
          jsonField("annotation", "image_url", "\u6765\u6E90\u9AD8\u4EAE\u56FE\u7247 URL", "text", "image-url", wire.httpUrl),
          jsonField("annotation", "color", "\u6765\u6E90\u9AD8\u4EAE\u989C\u8272", "text", "text", wire.nonEmptyText)
        ]);
        var resource = (key, label, semantic, details) => jsonField(
          "resource",
          key,
          label,
          "text",
          semantic,
          null,
          { permissions: { user: true, localService: true, sourceCandidate: false }, ...details }
        );
        var RESOURCE_FIELDS = Object.freeze([
          resource("uid", "\u672C\u5730\u8D44\u6E90\u7A33\u5B9A\u6807\u8BC6", "local-id", { editable: false }),
          resource("version", "\u8D44\u6E90\u7248\u672C\u540D\u79F0", "text", { defaultValue: "" }),
          resource("provider", "\u8D44\u6E90\u63D0\u4F9B\u65B9", "text", { defaultValue: "\u672C\u5730" }),
          resource("format", "\u8D44\u6E90\u6587\u4EF6\u683C\u5F0F", "text", { defaultValue: "" }),
          resource("location", "\u8D44\u6E90\u5B58\u50A8\u4F4D\u7F6E", "local-attachment-reference", { defaultValue: "" }),
          resource("url", "\u8D44\u6E90\u5916\u94FE", "resource-url", { defaultValue: "" }),
          resource("channel", "\u8D44\u6E90\u83B7\u53D6\u6E20\u9053", "text"),
          resource("edition_source_key", "\u5173\u8054\u51FA\u7248\u7248\u672C\u6765\u6E90", "source-key"),
          jsonField("resource", "mock", "\u6A21\u62DF\u8D44\u6E90\u6807\u8BB0", "boolean", "boolean", wire.boolean, { permissions: { user: false, localService: true, sourceCandidate: false } }),
          resource("cubox_key", "Cubox \u6863\u6848\u7684\u590D\u5408\u8EAB\u4EFD", "id", { editable: false })
        ]);
        function normalizeResourceInput(input) {
          if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("\u8D44\u6E90\u8D44\u6599\u65E0\u6548\u3002");
          const values = {};
          for (const field of RESOURCE_FIELDS.filter((field2) => field2.permissions.user && field2.editable !== false)) {
            const value = input[field.key];
            if (value !== void 0 && typeof value !== "string") throw Error(`${field.key} \u5FC5\u987B\u662F\u6587\u672C\u3002`);
            if (value?.trim() || field.defaultValue !== void 0) values[field.key] = value?.trim() || field.defaultValue;
          }
          if (!values.version) throw Error("\u8BF7\u586B\u5199\u8D44\u6E90\u7248\u672C\u3002");
          if (!values.location && !values.url) throw Error("\u8BF7\u586B\u5199\u5B58\u50A8\u4F4D\u7F6E\u6216\u94FE\u63A5\u3002");
          if (input.url && !/^(https?:|file:|obsidian:|calibre:)/i.test(input.url)) throw Error("\u8D44\u6E90\u94FE\u63A5\u987B\u4F7F\u7528 http\u3001https\u3001file\u3001obsidian \u6216 calibre \u534F\u8BAE\u3002");
          return { ...values, mock: input.mock === true };
        }
        module22.exports = {
          MEDIA_LABELS,
          SERIES_KINDS,
          STATUS_LABELS,
          FRONTMATTER_FIELDS,
          SYSTEM_FIELDS,
          EDITION_FIELDS,
          COLLECTION_FIELDS,
          CONTENT_FIELDS,
          BODY_TEXT,
          ANNOTATION_FIELDS,
          RESOURCE_FIELDS,
          PLATFORM_RATING,
          SOURCE_FIELDS,
          SOURCE_V1_FIELDS,
          SOURCE_V2_FIELDS,
          SOURCE_LIST_FIELDS,
          COMBINED_SOURCE_FIELDS,
          sourceV1Type,
          sourceV2Codec,
          sourceAppliesTo,
          comparableFieldValue,
          normalizeResourceInput
        };
      }
    });
    var require_series_relations = __commonJS2({
      "src/series-relations.js"(exports2, module22) {
        "use strict";
        var { OVERALL_RATING } = require_rating_schemes();
        var ENTITY_TYPES = /* @__PURE__ */ new Set(["series", "work", "note"]);
        var list2 = (value) => Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
        var order = (left, right) => left < right ? -1 : left > right ? 1 : 0;
        var validCreatorRole = (value) => typeof value === "string" && /^[a-z][a-z0-9_-]*$/.test(value);
        var validCreatorId = (value) => typeof value === "string" && /^[^\s|]+$/.test(value);
        function parseCreatorCredit(value) {
          if (typeof value !== "string") return null;
          const [role, creatorId, extra] = value.split("|").map((item) => item.trim());
          return extra === void 0 && validCreatorRole(role) && validCreatorId(creatorId) ? { role, creatorId } : null;
        }
        function add(index, key, value) {
          if (!index.has(key)) index.set(key, /* @__PURE__ */ new Set());
          index.get(key).add(value);
        }
        function connected(roots, index) {
          const paths = new Set(roots);
          for (const path of paths) for (const target of index.get(path) || []) paths.add(target);
          return paths;
        }
        function workStats(works, notes) {
          const media = /* @__PURE__ */ new Map();
          const rated = [];
          for (const work of works) {
            const key = work.media || "unknown";
            media.set(key, (media.get(key) || 0) + 1);
            if (Number.isFinite(work.rating) && work.rating >= OVERALL_RATING.min && work.rating <= OVERALL_RATING.max) rated.push(work.rating);
          }
          return {
            count: works.length,
            noteCount: notes.length,
            byMedia: Object.fromEntries(media),
            ratedCount: rated.length,
            meanRating: rated.length ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length : null
          };
        }
        function buildSeriesRelations(entities, resolveLink) {
          const owners = /* @__PURE__ */ new Map();
          const candidates = [];
          for (const entity of entities) {
            if (!ENTITY_TYPES.has(entity?.type) || typeof entity.file?.path !== "string") continue;
            if (typeof entity.uid !== "string" || !/^[A-Za-z0-9_-]+$/.test(entity.uid)) continue;
            add(owners, entity.uid, entity.file.path);
            candidates.push(entity);
          }
          const byPath = new Map(candidates.filter((entity) => owners.get(entity.uid).size === 1).map((entity) => [entity.file.path, entity]));
          const parentsByPath = /* @__PURE__ */ new Map();
          const childrenByPath = /* @__PURE__ */ new Map();
          const creatorRules = /* @__PURE__ */ new Map();
          const memberships = /* @__PURE__ */ new Map();
          const workSeries = /* @__PURE__ */ new Map();
          const noteTargets = /* @__PURE__ */ new Map();
          const targetNotes = /* @__PURE__ */ new Map();
          function targets(entity, field, types) {
            const paths = /* @__PURE__ */ new Set();
            for (const raw of list2(entity[field])) {
              if (typeof raw !== "string") continue;
              const result = resolveLink(raw, entity.file);
              const path = typeof result === "string" ? result : result?.path;
              if (types.includes(byPath.get(path)?.type)) paths.add(path);
            }
            return paths;
          }
          for (const [path, entity] of byPath) {
            if (entity.type !== "series") continue;
            const parents2 = targets(entity, "parent_series", ["series"]);
            parentsByPath.set(path, parents2);
            for (const parent of parents2) add(childrenByPath, parent, path);
            if (entity.series_kind !== "creator") continue;
            const roles = list2(entity.creator_roles).filter(validCreatorRole);
            const ids = list2(entity.creator_ids).filter(validCreatorId);
            for (const role of roles) for (const id of ids) add(creatorRules, `${role}|${id}`, path);
          }
          function addWork(seriesPath, workPath, reason) {
            if (!memberships.has(seriesPath)) memberships.set(seriesPath, /* @__PURE__ */ new Map());
            const works = memberships.get(seriesPath);
            if (!works.has(workPath)) works.set(workPath, []);
            works.get(workPath).push({ seriesUid: byPath.get(seriesPath).uid, ...reason });
            add(workSeries, workPath, seriesPath);
          }
          for (const [path, entity] of byPath) {
            if (entity.type === "work") {
              for (const seriesPath of targets(entity, "series", ["series"])) addWork(seriesPath, path, { kind: "manual" });
              const credits = /* @__PURE__ */ new Map();
              for (const value of list2(entity.creator_credits)) {
                const credit = parseCreatorCredit(value);
                if (credit) credits.set(`${credit.role}|${credit.creatorId}`, credit);
              }
              for (const value of list2(entity.creator_auto_credits)) {
                const credit = parseCreatorCredit(value);
                if (credit && !credits.has(value)) credits.set(value, { ...credit, mode: "automatic" });
              }
              for (const [key, credit] of credits) {
                for (const seriesPath of creatorRules.get(key) || []) addWork(seriesPath, path, { kind: "creator", ...credit });
              }
            } else if (entity.type === "note") {
              const about = targets(entity, "about", ["work", "series"]);
              noteTargets.set(path, about);
              for (const target of about) add(targetNotes, target, path);
            }
          }
          function sorted(paths = []) {
            return [...paths].sort(order).map((path) => byPath.get(path));
          }
          function parents(path) {
            return sorted(parentsByPath.get(path));
          }
          function hasCycle(path) {
            return connected(parentsByPath.get(path), parentsByPath).has(path);
          }
          function assertAcyclic(path) {
            if (hasCycle(path)) throw Error("\u7236\u7CFB\u5217\u5173\u7CFB\u4F1A\u5F62\u6210\u5FAA\u73AF\uFF0C\u8BF7\u79FB\u9664\u5FAA\u73AF\u4E2D\u7684\u7236\u7EA7\u94FE\u63A5\u3002");
          }
          function seriesFor(path) {
            const entity = byPath.get(path);
            if (entity?.type === "series") return connected([path], parentsByPath);
            if (entity?.type === "work") return connected(workSeries.get(path), parentsByPath);
            const roots = /* @__PURE__ */ new Set();
            for (const target of noteTargets.get(path) || []) {
              if (byPath.get(target).type === "series") roots.add(target);
              else for (const parent of workSeries.get(target) || []) roots.add(parent);
            }
            return connected(roots, parentsByPath);
          }
          function workMemberships(path) {
            if (byPath.get(path)?.type !== "work") return [];
            return sorted(seriesFor(path)).map((series) => ({ series, reasons: memberships.get(series.file.path)?.get(path) || [{ kind: "descendant" }] }));
          }
          function query(path) {
            const series = byPath.get(path);
            if (series?.type !== "series") return null;
            const descendantPaths = connected(childrenByPath.get(path), childrenByPath);
            descendantPaths.delete(path);
            const direct = memberships.get(path) || /* @__PURE__ */ new Map();
            const directWorks = sorted(direct.keys());
            const workReasons = /* @__PURE__ */ new Map();
            const workPaths = /* @__PURE__ */ new Set();
            for (const anchor of [path, ...[...descendantPaths].sort(order)]) {
              for (const [workPath, reasons] of memberships.get(anchor) || []) {
                const uid = byPath.get(workPath).uid;
                if (!workReasons.has(uid)) workReasons.set(uid, []);
                workReasons.get(uid).push(...reasons.map((reason) => ({ ...reason, via: anchor === path ? "direct" : "descendant" })));
                workPaths.add(workPath);
              }
            }
            const works = sorted(workPaths);
            const noteReasons = /* @__PURE__ */ new Map();
            const directNotePaths = /* @__PURE__ */ new Set();
            const notePaths = /* @__PURE__ */ new Set();
            const directTargets = /* @__PURE__ */ new Set([path, ...direct.keys()]);
            for (const target of [path, ...[...descendantPaths].sort(order), ...works.map((work) => work.file.path)]) {
              const entity = byPath.get(target);
              const isDirect = directTargets.has(target);
              for (const notePath of targetNotes.get(target) || []) {
                const uid = byPath.get(notePath).uid;
                if (!noteReasons.has(uid)) noteReasons.set(uid, []);
                noteReasons.get(uid).push({ kind: `about-${entity.type}`, targetUid: entity.uid, via: isDirect ? "direct" : "descendant" });
                notePaths.add(notePath);
                if (isDirect) directNotePaths.add(notePath);
              }
            }
            const directNotes = sorted(directNotePaths);
            const notes = sorted(notePaths);
            return {
              series,
              parents: parents(path),
              childSeries: sorted([...childrenByPath.get(path) || []].filter((child) => child !== path)),
              descendants: sorted(descendantPaths),
              directWorks,
              manualWorks: directWorks.filter((work) => direct.get(work.file.path).some((reason) => reason.kind === "manual")),
              ruleWorks: directWorks.filter((work) => direct.get(work.file.path).some((reason) => reason.kind === "creator")),
              works,
              workReasons,
              directNotes,
              relatedNotes: sorted(targetNotes.get(path)),
              notes,
              noteReasons,
              stats: { direct: workStats(directWorks, directNotes), recursive: workStats(works, notes) }
            };
          }
          return { parents, seriesFor, workMemberships, query, hasCycle, assertAcyclic };
        }
        function dedupeSeriesResources(resources, workReasons = /* @__PURE__ */ new Map()) {
          const byUid = /* @__PURE__ */ new Map();
          const deduped = [];
          for (const resource of resources) {
            const uid = typeof resource.uid === "string" && resource.uid ? resource.uid : null;
            let member = uid && byUid.get(uid);
            if (!member) {
              member = { ...resource, membership: [] };
              deduped.push(member);
              if (uid) byUid.set(uid, member);
            }
            if (resource.workUid && !member.membership.some((context) => context.workUid === resource.workUid)) {
              member.membership.push({ workUid: resource.workUid, reasons: workReasons.get(resource.workUid) || [] });
            }
          }
          return deduped;
        }
        module22.exports = { buildSeriesRelations, dedupeSeriesResources, parseCreatorCredit, validCreatorRole, validCreatorId };
      }
    });
    var require_observation = __commonJS2({
      "src/contracts/observation.js"(exports2, module22) {
        "use strict";
        var { invalid, pointer, isRecord: isRecord2, ContractError } = require_semantics();
        var wire = require_structure();
        var METHODS = ["remote", "html", "browser", "manual", "archive"];
        var STATES = ["observed", "retained", "unverified"];
        var BASES = ["source-observation", "manual-entry", "local-document-read"];
        var sourceRef = wire.shape({ provider: wire.provider, id: wire.id, url: wire.httpsUrl }, { required: ["provider", "id"] });
        var observation = wire.shape({ acquired_at: wire.dateTime, method: wire.enumOf(METHODS) }, { required: ["acquired_at", "method"] });
        var evidenceShape = wire.shape({
          state: wire.enumOf(STATES),
          basis: wire.enumOf(BASES),
          observed_at: wire.dateTime,
          locator: wire.nonEmptyText
        }, { required: ["state", "basis"] });
        var evidence = wire.define({
          ...evidenceShape.schema,
          allOf: [
            {
              if: { properties: { state: { const: "observed" } } },
              then: { properties: { basis: { enum: BASES.slice(0, 2) } }, required: ["observed_at"] }
            },
            { if: { properties: { state: { const: "unverified" } } }, then: { properties: { basis: { const: "local-document-read" } } } },
            { if: { properties: { basis: { const: "local-document-read" } } }, then: { not: { required: ["observed_at"] } } }
          ]
        }, (value, path) => {
          const result = evidenceShape.parse(value, path);
          if (result.state === "observed" && result.basis === "local-document-read")
            invalid(pointer(path, "basis"), "\u5B9E\u9645\u53D6\u5F97\u987B\u6709\u6765\u6E90\u89C2\u5BDF\u6216\u4EBA\u5DE5\u5F55\u5165\u4F9D\u636E\u3002");
          if (result.state === "observed" && !Object.hasOwn(result, "observed_at"))
            invalid(pointer(path, "observed_at"), "\u5B9E\u9645\u53D6\u5F97\u987B\u63D0\u4F9B\u771F\u5B9E\u89C2\u5BDF\u65F6\u95F4\u3002");
          if (result.state === "unverified" && result.basis !== "local-document-read")
            invalid(pointer(path, "basis"), "\u672A\u6838\u5B9E\u8D44\u6599\u987B\u6807\u660E\u672C\u5730\u8BFB\u6863\u4F9D\u636E\u3002");
          if (result.basis === "local-document-read" && Object.hasOwn(result, "observed_at"))
            invalid(pointer(path, "observed_at"), "\u672C\u5730\u8BFB\u6863\u65F6\u523B\u4E0D\u80FD\u4F5C\u4E3A\u771F\u5B9E\u89C2\u5BDF\u65F6\u95F4\u3002");
          return result;
        });
        function fieldEvidence(paths) {
          const keys = paths.map((parts) => parts.reduce(pointer, ""));
          const allowed = new Set(keys);
          const schema = { type: "object", propertyNames: { enum: keys }, additionalProperties: evidence.schema };
          return wire.define(schema, (value, path) => {
            if (!isRecord2(value)) invalid(path, "\u987B\u4E3A\u8BC1\u636E\u5BF9\u8C61\u3002");
            for (const key of Object.keys(value)) if (!allowed.has(key)) invalid(pointer(path, key), "\u8BC1\u636E\u8DEF\u5F84\u4E0D\u53D7\u652F\u6301\u3002");
            return Object.fromEntries(keys.filter((key) => Object.hasOwn(value, key)).map((key) => [key, evidence.parse(value[key], pointer(path, key))]));
          });
        }
        function requireEvidence(record, paths, path = "") {
          for (const parts of paths) {
            const hasValue2 = parts.reduce((value, key2) => isRecord2(value) && Object.hasOwn(value, key2) ? value[key2] : void 0, record) !== void 0;
            const key = parts.reduce(pointer, "");
            if (hasValue2 !== Object.hasOwn(record.field_evidence, key)) {
              invalid(pointer(pointer(path, "field_evidence"), key), hasValue2 ? "\u5B57\u6BB5\u7F3A\u5C11\u5BF9\u5E94\u8BC1\u636E\u3002" : "\u8BC1\u636E\u6307\u5411\u4E0D\u5B58\u5728\u7684\u503C\u3002");
            }
          }
          return record;
        }
        function evidenceRules(paths) {
          return paths.map((parts) => {
            const key = parts.reduce(pointer, "");
            const pathPresent = parts.reduceRight((inner, part) => ({ required: [part], ...inner && { properties: { [part]: inner } } }), null);
            const keyPresent = { properties: { field_evidence: { required: [key] } } };
            return { if: pathPresent, then: keyPresent, else: { properties: { field_evidence: { not: { required: [key] } } } } };
          });
        }
        function protocolValue(protocol, input) {
          if (isRecord2(input) && Object.hasOwn(input, "protocol") && input.protocol !== protocol) {
            throw new ContractError("unsupported_protocol", `\u9700\u8981 ${protocol}\u3002`, { path: "/protocol" });
          }
        }
        function codecs(fields) {
          return Object.fromEntries(fields.map((field) => [field.key, field.codec]));
        }
        function publishSchema(protocol, schema) {
          return {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $id: `urn:media-core:${protocol.replace("/", ":")}`,
            title: protocol,
            ...schema
          };
        }
        module22.exports = { sourceRef, observation, evidence, fieldEvidence, requireEvidence, evidenceRules, protocolValue, codecs, publishSchema };
      }
    });
    var require_source = __commonJS2({
      "src/contracts/source.js"(exports2, module22) {
        "use strict";
        var { SOURCE_V2_FIELDS, sourceV2Codec, EDITION_FIELDS, PLATFORM_RATING } = require_field_catalog();
        var { validCreatorRole } = require_series_relations();
        var { invalid, isRecord: isRecord2 } = require_semantics();
        var wire = require_structure();
        var shared = require_observation();
        var SOURCE_V2_PROTOCOL22 = "media-source/v2";
        var basic = Object.fromEntries(SOURCE_V2_FIELDS.map((key) => [key, sourceV2Codec(key)]));
        var edition = shared.codecs(EDITION_FIELDS);
        var paths = [...SOURCE_V2_FIELDS.map((key) => ["fields", key]), ...Object.keys(edition).map((key) => ["edition", key]), ["rating"]];
        var part = wire.shape({
          kind: wire.literal("volume"),
          label: wire.nonEmptyText,
          number: wire.numeric({ positive: true }),
          parent_source_id: wire.id
        }, { required: ["kind", "label"] });
        var creator = wire.shape({
          role: wire.string({ pattern: "^[a-z][a-z0-9_-]*$" }, validCreatorRole, "\u521B\u4F5C\u89D2\u8272\u65E0\u6548\u3002"),
          name: wire.nonEmptyText,
          aliases: wire.textList(),
          externalId: wire.id
        }, { required: ["role", "name"] });
        var creatorEvidence = wire.shape({
          items: wire.arrayOf(creator, { nonEmpty: true }),
          evidence: shared.evidence
        }, { required: ["items", "evidence"] });
        var extensions = wire.define({
          type: "object",
          properties: { media_core: {
            if: { type: "object", required: ["version"], properties: { version: { const: 1 } } },
            then: { properties: { creator_evidence: creatorEvidence.schema } }
          } }
        }, (value, path) => {
          const result = wire.jsonRecord.parse(value, path);
          const core = result.media_core;
          if (isRecord2(core) && core.version === 1 && Object.hasOwn(core, "creator_evidence")) {
            core.creator_evidence = creatorEvidence.parse(core.creator_evidence, `${path}/media_core/creator_evidence`);
          }
          return result;
        });
        var envelope = wire.shape({
          protocol: wire.literal(SOURCE_V2_PROTOCOL22),
          provider: wire.provider,
          id: wire.id,
          url: wire.httpsUrl,
          scope: wire.enumOf(["work", "part"]),
          scope_label: wire.nonEmptyText,
          part,
          edition: wire.shape(edition, { nonEmpty: true }),
          fields: wire.shape(basic),
          rating: PLATFORM_RATING.codec,
          mock: wire.boolean,
          observation: shared.observation,
          field_evidence: shared.fieldEvidence(paths),
          extensions
        }, { required: ["protocol", "provider", "id", "url", "scope", "observation", "fields", "field_evidence"] });
        function normalizeSourceV222(input) {
          shared.protocolValue(SOURCE_V2_PROTOCOL22, input);
          const result = envelope.parse(input, "");
          if (result.part && result.scope !== "part") invalid("/part", "\u5377\u8D44\u6599\u987B\u4F7F\u7528 part \u8303\u56F4\u3002");
          if (result.part?.parent_source_id === result.id) invalid("/part/parent_source_id", "\u7236\u6765\u6E90\u4E0D\u80FD\u6307\u5411\u5F53\u524D\u6761\u76EE\u3002");
          return shared.requireEvidence(result, paths);
        }
        function sourceCreatorEvidence(source) {
          const core = source?.extensions?.media_core;
          if (source?.protocol !== SOURCE_V2_PROTOCOL22 || core?.version !== 1 || !core.creator_evidence) return [];
          try {
            const { items, evidence } = creatorEvidence.parse(core.creator_evidence, "/extensions/media_core/creator_evidence");
            return evidence.basis === "source-observation" && evidence.observed_at ? items : [];
          } catch {
            return [];
          }
        }
        var schema = shared.publishSchema(SOURCE_V2_PROTOCOL22, {
          ...envelope.schema,
          allOf: [...shared.evidenceRules(paths), { if: { required: ["part"] }, then: { properties: { scope: { const: "part" } } } }]
        });
        module22.exports = { SOURCE_V2_PROTOCOL: SOURCE_V2_PROTOCOL22, normalizeSourceV2: normalizeSourceV222, sourceCreatorEvidence, schema };
      }
    });
    var { normalizeSourceV2: normalizeSourceV22, SOURCE_V2_PROTOCOL: SOURCE_V2_PROTOCOL3 } = require_source();
    var { normalizeTimestamp: normalizeTimestamp2, normalizePartialDate: normalizePartialDate2, normalizeDisplayTime: normalizeDisplayTime2, normalizeExternalUrl: normalizeExternalUrl2 } = require_semantics();
    module2.exports = { normalizeSourceV2: normalizeSourceV22, SOURCE_V2_PROTOCOL: SOURCE_V2_PROTOCOL3, normalizeTimestamp: normalizeTimestamp2, normalizePartialDate: normalizePartialDate2, normalizeDisplayTime: normalizeDisplayTime2, normalizeExternalUrl: normalizeExternalUrl2 };
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WebnovelPlugin
});
module.exports = __toCommonJS(main_exports);

// src/adapters/shared.ts
var clean = (value) => value?.replace(/\u00a0/g, " ").replace(/[\t ]+/g, " ").trim() || void 0;
function text(root, selector) {
  return clean(root.querySelector(selector)?.textContent);
}
function textWithBreaks(root, selector) {
  const element = root.querySelector(selector);
  if (!element) return void 0;
  const copy = element.cloneNode(true);
  copy.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  copy.querySelectorAll("script, style").forEach((node) => node.remove());
  return clean(copy.textContent?.replace(/\r\n?/g, "\n").replace(/[\t ]*\n[\t ]*/g, "\n"));
}
function meta(doc, key) {
  return clean(doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute("content"));
}
function imageUrl(value, base) {
  if (!value?.trim()) return void 0;
  try {
    const url = new URL(value.trim(), base);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : void 0;
  } catch {
    return void 0;
  }
}
function status(value) {
  if (!value) return void 0;
  if (/完结|完本|已完成/.test(value)) return "completed";
  if (/暂停|停更|断更/.test(value)) return "paused";
  if (/连载/.test(value)) return "ongoing";
  return void 0;
}
function pageIdentities(doc, ref, resolveUrl) {
  const identities = [];
  const addUrl = (value, evidence) => {
    if (!value) return;
    try {
      identities.push({ book: resolveUrl(new URL(value, ref.url).href), evidence });
    } catch {
    }
  };
  addUrl(doc.querySelector('link[rel="canonical"]')?.getAttribute("href"), 'link[rel="canonical"]');
  for (const key of ["og:url", "og:novel:book_url", "og:novel:read_url"]) addUrl(meta(doc, key), `meta ${key}`);
  return { identities, addUrl };
}
function validateIdentities(identities, ref) {
  if (!identities.length) {
    throw new Error("\u672A\u8BC6\u522B\u5230\u53EF\u6838\u5BF9\u7684\u4F5C\u54C1\u6807\u8BC6\uFF0C\u4E0D\u80FD\u5C06\u9875\u9762\u8D44\u6599\u7ED1\u5B9A\u5230\u8F93\u5165\u94FE\u63A5\uFF1B\u8BF7\u63D0\u4F9B\u5B8C\u6574\u4F5C\u54C1\u8BE6\u60C5\u9875\u6216\u4F7F\u7528\u624B\u52A8\u5EFA\u6863\u3002");
  }
  for (const { book } of identities) {
    if (book.provider !== ref.provider || book.id !== ref.id) {
      throw new Error("\u9875\u9762\u6807\u8BC6\u4E0E\u8F93\u5165\u7684\u4F5C\u54C1\u94FE\u63A5\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u6838\u5BF9\u94FE\u63A5\u548C HTML \u6587\u4EF6\u3002");
    }
  }
  return identities.map((identity) => identity.evidence).join("\uFF1B");
}

// src/adapters/qidian.ts
var qidianAdapter = {
  provider: "qidian",
  name: "\u8D77\u70B9\u4E2D\u6587\u7F51",
  recoveryHint: "\u8BF7\u6B63\u5E38\u6253\u5F00\u4F5C\u54C1\u9875\uFF0C\u4F7F\u7528\u8BBE\u7F6E\u4E2D\u7684\u6D4F\u89C8\u5668\u91C7\u96C6\u4E66\u7B7E\uFF0C\u6216\u9009\u62E9\u53E6\u5B58\u7684 HTML \u6587\u4EF6\u3002",
  browserCapture: true,
  matchUrl(url) {
    const pattern = url.hostname === "book.qidian.com" ? /^\/info\/(\d+)\/?$/ : ["www.qidian.com", "m.qidian.com"].includes(url.hostname) ? /^\/book\/(\d+)\/?$/ : void 0;
    const id = pattern?.exec(url.pathname)?.[1];
    return id ? { provider: "qidian", id, url: `https://www.qidian.com/book/${id}/` } : void 0;
  },
  identities(doc, ref, resolveUrl) {
    const { identities } = pageIdentities(doc, ref, resolveUrl);
    const id = doc.querySelector("#book-detail #bookImg")?.getAttribute("data-bid");
    if (id && /^\d+$/.test(id)) {
      identities.push({ book: { ...ref, id }, evidence: "#book-detail #bookImg[data-bid]" });
    }
    return identities;
  },
  parse(doc, ref) {
    const result = { title: "", authors: [], evidence: {}, warnings: [] };
    const header = doc.querySelector("#book-detail .book-info-top");
    const visibleTitle = header ? text(header, "#bookName") : void 0;
    const visibleAuthor = header ? clean(text(header, ".book-meta .author")?.replace(/^作者\s*[：:]\s*/, "")) : void 0;
    result.title = visibleTitle || meta(doc, "og:novel:book_name") || "";
    const author = visibleAuthor || meta(doc, "og:novel:author");
    if (author) result.authors = [author];
    const visibleDescription = textWithBreaks(doc, "#book-intro-detail");
    result.description = visibleDescription || meta(doc, "og:novel:description") || meta(doc, "og:description");
    const cover = doc.querySelector("#book-detail #bookImg");
    const visibleCover = cover?.getAttribute("data-bid") === ref.id ? imageUrl(cover.querySelector("img")?.getAttribute("src"), ref.url) : void 0;
    result.cover_url = visibleCover || imageUrl(meta(doc, "og:image"), ref.url);
    const visibleTags = header ? Array.from(header.querySelectorAll(".book-attribute a")).map((link) => clean(link.textContent)).filter((tag) => Boolean(tag)) : [];
    const category = meta(doc, "og:novel:category");
    if (visibleTags.length) result.tags = [...new Set(visibleTags)];
    else if (category) result.tags = [category];
    const visibleStatus = header ? Array.from(header.querySelectorAll(".book-attribute span")).map((span) => status(clean(span.textContent))).find((value) => value !== void 0) : void 0;
    result.serialization_status = visibleStatus || status(meta(doc, "og:novel:status"));
    const wordLabel = header ? Array.from(header.querySelectorAll(".count cite")).find((label) => clean(label.textContent) === "\u5B57") : void 0;
    const wordValue = wordLabel?.previousElementSibling;
    const visibleWords = wordValue?.tagName.toLowerCase() === "em" && clean(wordValue.textContent) ? `${clean(wordValue.textContent)}\u5B57` : void 0;
    result.word_count_text = visibleWords || meta(doc, "og:novel:word_count");
    const visibleUpdated = header ? clean(text(header, ".book-meta .update-time")?.replace(/^更新时间\s*[：:]\s*/, "")) : void 0;
    const visibleChapter = header ? clean(text(header, ".book-latest-chapter")?.replace(/^最新章节\s*[：:]\s*/, "")) : void 0;
    result.last_updated_at = visibleUpdated || meta(doc, "og:novel:update_time");
    result.latest_chapter = visibleChapter || meta(doc, "og:novel:latest_chapter_name");
    result.evidence.title = visibleTitle ? "#book-detail .book-info-top #bookName" : "meta og:novel:book_name";
    result.evidence.authors = visibleAuthor ? "#book-detail .book-info-top .book-meta .author" : "meta og:novel:author";
    if (result.description) result.evidence.description = visibleDescription ? "#book-intro-detail\uFF1B\u4FDD\u7559br\u6362\u884C" : "meta og:novel:description / og:description";
    if (result.cover_url) result.evidence.cover_url = visibleCover ? "#book-detail #bookImg[data-bid\u4E0E\u4F5C\u54C1ID\u4E00\u81F4] img[src]" : "meta og:image";
    if (result.tags) result.evidence.tags = visibleTags.length ? "#book-detail .book-info-top .book-attribute a" : "meta og:novel:category";
    if (result.serialization_status) result.evidence.serialization_status = visibleStatus ? "#book-detail .book-info-top .book-attribute span" : "meta og:novel:status";
    if (result.word_count_text) result.evidence.word_count_text = visibleWords ? "#book-detail .book-info-top .count\uFF1B\u4EC5\u53D6\u5B57\u6570\uFF0C\u4FDD\u7559\u663E\u793A\u7CBE\u5EA6" : "meta og:novel:word_count";
    if (result.last_updated_at) result.evidence.last_updated_at = visibleUpdated ? "#book-detail .book-info-top .update-time\uFF1B\u975E\u9996\u53D1\u65E5\u671F" : "meta og:novel:update_time\uFF1B\u975E\u9996\u53D1\u65E5\u671F";
    if (result.latest_chapter) result.evidence.latest_chapter = visibleChapter ? "#book-detail .book-info-top .book-latest-chapter" : "meta og:novel:latest_chapter_name";
    return result;
  }
};

// src/adapters/fanqie.ts
function fanqieCover(doc, ref, resolveUrl) {
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    let data;
    try {
      const parsed = JSON.parse(script.textContent || "");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      data = parsed;
    } catch {
      continue;
    }
    if (typeof data["@id"] !== "string") continue;
    let identity;
    try {
      identity = resolveUrl(data["@id"]);
    } catch {
      continue;
    }
    if (identity.provider !== ref.provider || identity.id !== ref.id) continue;
    const value = data.images ?? data.image;
    const images = Array.isArray(value) ? value : [value];
    for (const candidate of images) {
      if (typeof candidate !== "string") continue;
      const url2 = imageUrl(candidate, ref.url);
      if (url2) return { url: url2, evidence: "\u4F5C\u54C1\u9875 JSON-LD images/image\uFF0C@id \u4E0E\u4F5C\u54C1\u94FE\u63A5\u4E00\u81F4" };
    }
  }
  const url = imageUrl(doc.querySelector(".page-header-info .book-cover-img")?.getAttribute("src"), ref.url);
  if (!url || new URL(url).pathname.includes("/novel-static/5cb03bd354145bc7815a5e09d4b15cfc")) return void 0;
  return { url, evidence: "\u4F5C\u54C1\u9875 .page-header-info .book-cover-img[src]\uFF0C\u5DF2\u6392\u9664\u5DF2\u77E5\u52A0\u8F7D\u5360\u4F4D\u56FE" };
}
var fanqieAdapter = {
  provider: "fanqie",
  name: "\u756A\u8304\u5C0F\u8BF4",
  recoveryHint: "\u53EF\u5728\u6D4F\u89C8\u5668\u6B63\u5E38\u6253\u5F00\u540E\u9009\u62E9\u53E6\u5B58\u7684 HTML \u6587\u4EF6\uFF0C\u6216\u624B\u52A8\u8865\u586B\u3002",
  matchUrl(url) {
    const id = url.hostname === "fanqienovel.com" ? /^\/page\/(\d+)\/?$/.exec(url.pathname)?.[1] : void 0;
    return id ? { provider: "fanqie", id, url: `https://fanqienovel.com/page/${id}` } : void 0;
  },
  identities(doc, ref, resolveUrl) {
    const { identities, addUrl } = pageIdentities(doc, ref, resolveUrl);
    if (!identities.length) {
      for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
        let data;
        try {
          data = JSON.parse(script.textContent || "");
        } catch {
          continue;
        }
        const roots = Array.isArray(data) ? data : [data];
        for (const root of roots) {
          if (root && typeof root === "object" && typeof root["@id"] === "string") {
            addUrl(root["@id"], "\u4F5C\u54C1\u9875 JSON-LD \u9876\u5C42 @id");
          }
        }
      }
    }
    return identities;
  },
  parse(doc, ref, resolveUrl) {
    const result = { title: "", authors: [], evidence: {}, warnings: [] };
    const header = doc.querySelector(".page-header-info");
    result.title = header ? text(header, ".info-name h1") || "" : "";
    const author = header && text(header, ".author-name-text");
    if (author) result.authors = [author];
    const cover = fanqieCover(doc, ref, resolveUrl);
    if (cover) {
      result.cover_url = cover.url;
      result.evidence.cover_url = cover.evidence;
    }
    if (header) {
      result.tags = Array.from(header.querySelectorAll(".info-label-grey")).map((el) => clean(el.textContent)).filter((tag) => Boolean(tag));
      result.serialization_status = status(text(header, ".info-label-yellow"));
      result.word_count_text = text(header, ".info-count-word")?.replace(/\s/g, "");
      result.last_updated_at = text(header, ".info-last-time");
      result.latest_chapter = text(header, ".info-last-title")?.replace(/^最近更新\s*[：:]\s*/, "");
    }
    result.description = text(doc, ".page-body .page-abstract-content");
    result.evidence.title = "\u4F5C\u54C1\u9875 .page-header-info .info-name h1";
    result.evidence.authors = "\u4F5C\u54C1\u9875 .page-header-info .author-name-text";
    if (result.description) result.evidence.description = "\u4F5C\u54C1\u9875 .page-body .page-abstract-content";
    if (result.tags?.length) result.evidence.tags = "\u4F5C\u54C1\u9875 .page-header-info .info-label-grey";
    if (result.serialization_status) result.evidence.serialization_status = "\u4F5C\u54C1\u9875 .info-label-yellow";
    if (result.word_count_text) result.evidence.word_count_text = "\u4F5C\u54C1\u9875 .info-count-word\uFF1B\u4FDD\u7559\u7F51\u7AD9\u663E\u793A\u7CBE\u5EA6";
    if (result.last_updated_at) result.evidence.last_updated_at = "\u4F5C\u54C1\u9875 .info-last-time\uFF1B\u5E73\u53F0\u539F\u59CB\u663E\u793A\u65F6\u95F4\uFF0C\u975E\u9996\u53D1\u65E5\u671F";
    if (result.latest_chapter) result.evidence.latest_chapter = "\u4F5C\u54C1\u9875 .info-last-title";
    return result;
  }
};

// src/adapters/qimao.ts
var headerSelector = ".book-information";
var titleSelector = ".wrap-txt > .title > .txt";
var authorSelector = ".sub-title .txt";
var chapterSelector = ".update-info .update-chapter-title a";
var updateSelector = ".update-info .update-time";
var descriptionSelector = ".book-introduction .intro";
var qimaoAdapter = {
  provider: "qimao",
  name: "\u4E03\u732B\u4E2D\u6587\u7F51",
  recoveryHint: "\u8BF7\u6B63\u5E38\u6253\u5F00\u4F5C\u54C1\u9875\uFF0C\u4F7F\u7528\u6D4F\u89C8\u5668\u91C7\u96C6\u4E66\u7B7E\uFF0C\u6216\u9009\u62E9\u53E6\u5B58\u7684 HTML \u6587\u4EF6\u3002",
  browserCapture: true,
  matchUrl(url) {
    const id = url.hostname === "www.qimao.com" ? /^\/shuku\/(\d+)\/?$/.exec(url.pathname)?.[1] : void 0;
    return id ? { provider: "qimao", id, url: `https://www.qimao.com/shuku/${id}/` } : void 0;
  },
  identities(doc, ref, resolveUrl) {
    const { identities, addUrl } = pageIdentities(doc, ref, resolveUrl);
    const href = doc.querySelector(`${headerSelector} ${chapterSelector}`)?.getAttribute("href");
    if (href) {
      try {
        const chapter = new URL(href, ref.url);
        const match = /^\/shuku\/(\d+)-\d+\/?$/.exec(chapter.pathname);
        if (match) {
          chapter.pathname = `/shuku/${match[1]}/`;
          addUrl(chapter.href, `${headerSelector} ${chapterSelector}[href] \u7684\u4F5C\u54C1 ID`);
        }
      } catch {
      }
    }
    return identities;
  },
  parse(doc, ref) {
    const result = { title: "", authors: [], evidence: {}, warnings: [] };
    const header = doc.querySelector(headerSelector);
    if (!header) return result;
    result.title = text(header, titleSelector) || "";
    const author = Array.from(header.querySelectorAll(authorSelector)).find((el) => /^作者\s*[：:]/.test(clean(el.textContent) ?? ""));
    const name = author && text(author, "em a");
    if (name) result.authors = [name];
    result.description = textWithBreaks(doc, descriptionSelector);
    const cover = imageUrl(header.querySelector(".wrap-pic > img")?.getAttribute("src"), ref.url);
    if (cover && /^https?:\/\/cdn\.qimao\.com\/bookimg\/[^?#]*\/readerCover\//.test(cover)) {
      result.cover_url = cover;
    }
    const tags = Array.from(header.querySelectorAll('.tags-wrap a[href*="/shuku/a-"]')).map((link) => clean(link.textContent)).filter((tag) => Boolean(tag));
    if (tags.length) result.tags = [...new Set(tags)];
    result.serialization_status = Array.from(header.querySelectorAll(".tags-wrap > .qm-tag")).map((tag) => status(clean(tag.textContent))).find((value) => value !== void 0);
    result.word_count_text = Array.from(header.querySelectorAll(".statistics-wrap > .txt")).map((el) => clean(el.textContent)?.replace(/\s/g, "")).find((value) => value && /^\d[\d,.]*(?:万|亿)?字$/.test(value));
    result.last_updated_at = text(header, updateSelector);
    result.latest_chapter = text(header, chapterSelector);
    result.evidence.title = `${headerSelector} ${titleSelector}`;
    result.evidence.authors = `${headerSelector} ${authorSelector}\uFF08\u4F5C\u8005\u6807\u7B7E\uFF09 em a`;
    if (result.description) result.evidence.description = descriptionSelector;
    if (result.cover_url) result.evidence.cover_url = `${headerSelector} .wrap-pic > img[src]\uFF0C\u4F5C\u54C1\u5C01\u9762\u8DEF\u5F84`;
    if (result.tags) result.evidence.tags = `${headerSelector} .tags-wrap \u5185\u4E66\u5E93\u5206\u7C7B\u94FE\u63A5`;
    if (result.serialization_status) result.evidence.serialization_status = `${headerSelector} .tags-wrap > .qm-tag`;
    if (result.word_count_text) result.evidence.word_count_text = `${headerSelector} .statistics-wrap > .txt\uFF08\u5B57\u6570\uFF09`;
    if (result.last_updated_at) result.evidence.last_updated_at = `${headerSelector} ${updateSelector}\uFF08\u6700\u65B0\u7AE0\u8282\u65F6\u95F4\uFF09`;
    if (result.latest_chapter) result.evidence.latest_chapter = `${headerSelector} ${chapterSelector}`;
    return result;
  }
};

// src/adapters/jjwxc.ts
var wapIdentity = 'td.readtd a[href*="m.jjwxc.net/book2/"]';
var mobileTitle = "body > div.b.module > h2.big > span.uninterested-author[data-novelid]";
var mobileInfo = "#info #left";
var desktopTitle = 'td.sptd h1[itemprop="name"] [itemprop="articleSection"]';
var desktopAuthor = 'td.sptd h2 [itemprop="author"]';
var newestRow = 'tr[itemprop~="newestChapter"]';
var newestChapter = `${newestRow} [itemprop="headline"] a[itemprop="url"]`;
var newestUpdate = `${newestRow} td[title*="\u7AE0\u8282\u9996\u53D1\u65F6\u95F4"]`;
var coverSelector = 'img.noveldefaultimage[itemprop="image"]';
function displayDate(value) {
  return value && /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/.test(value) ? value : void 0;
}
function customCover(doc, ref) {
  const img = doc.querySelector(coverSelector);
  const cover = imageUrl(img?.getAttribute("src"), ref.url);
  const defaultCover = imageUrl(img?.getAttribute("_src"), ref.url);
  if (!cover || !defaultCover || cover === defaultCover) return void 0;
  const fallback = new URL(defaultCover);
  const actual = new URL(cover);
  if (!/^i\d+-static\.jjwxc\.net$/.test(fallback.hostname) || fallback.pathname !== "/novelimage.php" || fallback.searchParams.get("novelid") !== ref.id || !/^i\d+-static\.jjwxc\.net$/.test(actual.hostname)) return void 0;
  if (actual.pathname === "/authorimagespace.php" || actual.pathname.startsWith("/tmp/backend/authorspace/")) return cover;
  return void 0;
}
function addTags(result, genre, links, locator) {
  const tags = [genre, ...Array.from(links, (link) => clean(link.textContent))].filter((tag) => Boolean(tag));
  if (tags.length) {
    result.tags = [...new Set(tags)];
    result.evidence.tags = locator;
  }
}
function parseDesktop(doc, ref, result) {
  const description = '#novelintro[itemprop="description"]';
  const info = ".smallreadbody";
  const modified = 'body > meta[itemprop="dateModified"]';
  result.title = text(doc, desktopTitle) || "";
  const author = text(doc, desktopAuthor);
  if (author) result.authors = [author];
  result.cover_url = customCover(doc, ref);
  result.description = textWithBreaks(doc, description);
  result.serialization_status = status(text(doc, '[itemprop="updataStatus"]'));
  result.word_count_text = text(doc, '[itemprop="wordCount"]');
  result.latest_chapter = text(doc, newestChapter);
  const chapterUpdated = result.latest_chapter && displayDate(text(doc, newestUpdate)?.replace(/\s*\*最新更新$/, ""));
  result.last_updated_at = chapterUpdated || displayDate(clean(doc.querySelector(modified)?.getAttribute("content")));
  addTags(
    result,
    text(doc, '[itemprop="genre"]'),
    doc.querySelectorAll(`${info} a[href*="bookbase.php?bq="]`),
    "\u4F5C\u54C1\u9875 [itemprop=genre] \u53CA .smallreadbody \u5185\u5BB9\u6807\u7B7E\u94FE\u63A5"
  );
  result.evidence.title = desktopTitle;
  result.evidence.authors = desktopAuthor;
  if (result.cover_url) result.evidence.cover_url = `${coverSelector}[src]\uFF0C\u6709\u522B\u4E8E\u672C\u4E66\u9ED8\u8BA4\u5C01\u9762 _src`;
  if (result.description) result.evidence.description = description;
  if (result.serialization_status) result.evidence.serialization_status = "\u4F5C\u54C1\u9875 [itemprop=updataStatus]";
  if (result.word_count_text) result.evidence.word_count_text = "\u4F5C\u54C1\u9875 [itemprop=wordCount]";
  if (result.latest_chapter) result.evidence.latest_chapter = newestChapter;
  if (result.last_updated_at) result.evidence.last_updated_at = chapterUpdated ? `${newestUpdate} \u7684\u53EF\u89C1\u66F4\u65B0\u65F6\u95F4` : `${modified}[content]\uFF08\u4F5C\u54C1\u66F4\u65B0\u65F6\u95F4\uFF09`;
}
function parseMobile(doc, heading, result) {
  const authorSelector2 = `${mobileInfo} .authorname-content > a[href^="/wapauthor/"]`;
  const intro = "li#novelintro";
  const description = `${intro} #novelintro_whole`;
  const details = Array.from(doc.querySelectorAll(`${mobileInfo} > li`));
  const detail = (label) => details.map((el) => clean(el.textContent)).find((value) => value?.startsWith(`${label}\uFF1A`))?.slice(label.length + 1).trim();
  result.title = clean(heading.getAttribute("data-novelname")) || "";
  const visibleAuthor = text(doc, authorSelector2);
  const author = visibleAuthor || clean(heading.getAttribute("data-authorname"));
  if (author) result.authors = [author];
  result.description = textWithBreaks(doc, description);
  if (result.description) result.evidence.description = description;
  else if (!doc.querySelector(description)) {
    const nodes = doc.querySelector(intro)?.childNodes;
    const short = Array.from(nodes ?? [], (node) => node.nodeType === 3 ? node.textContent?.replace(/\s+/g, " ") : node.nodeName === "BR" ? "\n" : "").join("");
    result.description = clean(short.replace(/^\s*简介\s*[：:]\s*/, "").replace(/ *\n */g, "\n"));
    if (result.description) result.evidence.description = `${intro} \u7684\u76F4\u63A5\u6587\u672C\u4E0E br`;
  }
  const state = detail("\u72B6\u6001");
  result.serialization_status = status(state);
  result.word_count_text = state?.split("/").map((value) => value.trim()).find((value) => /^\d+字$/.test(value));
  const summary = doc.querySelector('meta[name="description"]')?.getAttribute("content");
  result.last_updated_at = displayDate(summary?.match(/\|最新更新\s*[：:]\s*([^|]+)\|/)?.[1].trim());
  addTags(
    result,
    detail("\u7C7B\u578B"),
    doc.querySelectorAll(`${mobileInfo} > li a[href^="/assort/"]`),
    "\u79FB\u52A8\u4F5C\u54C1\u9875\u7C7B\u578B\u53CA\u5185\u5BB9\u6807\u7B7E\u94FE\u63A5"
  );
  result.evidence.title = `${mobileTitle}[data-novelname]`;
  result.evidence.authors = visibleAuthor ? authorSelector2 : `${mobileTitle}[data-authorname]`;
  if (result.serialization_status) result.evidence.serialization_status = `${mobileInfo} \u72B6\u6001`;
  if (result.word_count_text) result.evidence.word_count_text = `${mobileInfo} \u72B6\u6001\u4E2D\u7684\u5B57\u6570`;
  if (result.last_updated_at) result.evidence.last_updated_at = 'meta[name="description"] \u7684\u6700\u65B0\u66F4\u65B0\uFF08\u4F5C\u54C1\u66F4\u65B0\u65F6\u95F4\uFF09';
}
var jjwxcAdapter = {
  provider: "jjwxc",
  name: "\u664B\u6C5F\u6587\u5B66\u57CE",
  recoveryHint: "\u8BF7\u6B63\u5E38\u6253\u5F00\u684C\u9762\u6216\u79FB\u52A8\u4F5C\u54C1\u9875\uFF0C\u4F7F\u7528\u6D4F\u89C8\u5668\u91C7\u96C6\u4E66\u7B7E\uFF0C\u6216\u9009\u62E9\u53E6\u5B58\u7684 HTML \u6587\u4EF6\u3002",
  browserCapture: true,
  matchUrl(url) {
    let id;
    if (url.hostname === "www.jjwxc.net" && url.pathname === "/onebook.php" && !url.searchParams.has("chapterid")) {
      const ids = url.searchParams.getAll("novelid");
      if (ids.length === 1 && /^\d+$/.test(ids[0])) id = ids[0];
    }
    if (url.hostname === "m.jjwxc.net") id = /^\/book2\/(\d+)\/?$/.exec(url.pathname)?.[1];
    return id ? { provider: "jjwxc", id, url: `https://www.jjwxc.net/onebook.php?novelid=${id}` } : void 0;
  },
  identities(doc, ref, resolveUrl) {
    const { identities, addUrl } = pageIdentities(doc, ref, resolveUrl);
    addUrl(doc.querySelector(wapIdentity)?.getAttribute("href"), `${wapIdentity}[href]`);
    const id = doc.querySelector(mobileTitle)?.getAttribute("data-novelid");
    if (id && /^\d+$/.test(id)) {
      identities.push({ book: { ...ref, id }, evidence: `${mobileTitle}[data-novelid]` });
    }
    return identities;
  },
  parse(doc, ref) {
    const result = { title: "", authors: [], evidence: {}, warnings: [] };
    const heading = doc.querySelector(mobileTitle);
    if (heading) parseMobile(doc, heading, result);
    else parseDesktop(doc, ref, result);
    return result;
  }
};

// src/sources.ts
var sourceAdapters = [qidianAdapter, fanqieAdapter, qimaoAdapter, jjwxcAdapter];
function getSourceAdapter(provider) {
  const adapter = sourceAdapters.find((adapter2) => adapter2.provider === provider);
  if (!adapter) throw new Error(`\u4E0D\u652F\u6301\u7684\u4F5C\u54C1\u6765\u6E90\uFF1A${provider}`);
  return adapter;
}
var providerName = (provider) => getSourceAdapter(provider).name;
function parseBookUrl(input) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("\u8BF7\u8F93\u5165\u5B8C\u6574\u7684\u4F5C\u54C1\u8BE6\u60C5\u9875\u94FE\u63A5\u3002");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error("\u4F5C\u54C1\u94FE\u63A5\u5FC5\u987B\u662F\u666E\u901A\u7684 HTTP \u6216 HTTPS \u5B98\u7F51\u94FE\u63A5\u3002");
  }
  for (const adapter of sourceAdapters) {
    const ref = adapter.matchUrl(url);
    if (ref) return ref;
  }
  throw new Error(`\u4EC5\u652F\u6301${sourceAdapters.map((a) => a.name).join("\u3001")}\u4F5C\u54C1\u8BE6\u60C5\u9875\uFF1B\u8BF7\u52FF\u4F7F\u7528\u7AE0\u8282\u6216\u641C\u7D22\u9875\u94FE\u63A5\u3002`);
}
function decodeHtmlBytes(bytes, contentType) {
  const legacyCharset = /^(?:gb18030|gbk|gb2312)$/i;
  const httpCharset = /\bcharset\s*=\s*["']?([\w-]+)/i.exec(contentType ?? "")?.[1];
  if (httpCharset && legacyCharset.test(httpCharset)) return new TextDecoder("gb18030").decode(bytes);
  if (httpCharset) return new TextDecoder().decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    const head = new TextDecoder().decode(bytes.slice(0, 4096));
    const charset = /<meta\b[^>]*?\bcharset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1];
    return new TextDecoder(charset && legacyCharset.test(charset) ? "gb18030" : "utf-8").decode(bytes);
  }
}
function parseSourceHtml(html, ref, acquisition = "remote") {
  return parseSourceDocument(new DOMParser().parseFromString(html, "text/html"), ref, acquisition);
}
function parseSourceDocument(doc, ref, acquisition) {
  const adapter = getSourceAdapter(ref.provider);
  const identity = validateIdentities(adapter.identities(doc, ref, parseBookUrl), ref);
  const fields = adapter.parse(doc, ref, parseBookUrl);
  const result = {
    ...fields,
    ...ref,
    fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
    acquisition,
    evidence: { identity, ...fields.evidence }
  };
  if (!result.title || result.authors.length === 0) {
    throw new Error("\u672A\u8BC6\u522B\u5230\u53EF\u9760\u7684\u4E66\u540D\u548C\u4F5C\u8005\u3002\u9875\u9762\u53EF\u80FD\u662F\u9A8C\u8BC1\u9875\u3001\u767B\u5F55\u9875\u6216\u7ED3\u6784\u5DF2\u53D8\u5316\uFF1B\u8BF7\u5728\u6D4F\u89C8\u5668\u786E\u8BA4\u4F5C\u54C1\u8BE6\u60C5\u9875\uFF0C\u6216\u4F7F\u7528\u624B\u52A8\u5EFA\u6863\u3002");
  }
  if (!result.cover_url) result.warnings.push("\u672A\u63D0\u53D6\u5230\u53EF\u7528\u5C01\u9762\u5730\u5740\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  if (!result.description) result.warnings.push("\u672A\u63D0\u53D6\u5230\u4F5C\u54C1\u7B80\u4ECB\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  if (!result.first_published_year && !result.first_published_at) {
    result.warnings.push("\u672A\u83B7\u5F97\u660E\u786E\u7684\u9996\u53D1\u65E5\u671F\uFF0C\u9996\u53D1\u5E74\u4EFD\u7559\u7A7A\uFF1B\u4E0D\u4F1A\u7528\u6700\u8FD1\u66F4\u65B0\u65F6\u95F4\u63A8\u65AD\u5E74\u4EFD\u3002");
  }
  return result;
}

// src/main.ts
var import_obsidian6 = require("obsidian");

// src/matching.ts
var normalize = (value) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
function matchesTitle(local, incoming) {
  const title = normalize(incoming);
  return !!title && typeof local === "string" && normalize(local) === title;
}
function hasNoAuthors(authors) {
  return authors == null || typeof authors === "string" && !authors.trim() || Array.isArray(authors) && authors.length === 0;
}
function authorNames(value) {
  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values) || !values.length || values.some((v) => typeof v !== "string" || !normalize(v))) return [];
  return [...new Set(values.map((v) => normalize(v)))].sort();
}
function matchesWork(local, incoming) {
  if (!matchesTitle(local.title, incoming.title)) return false;
  const left = authorNames(local.authors);
  const right = authorNames(incoming.authors);
  return left.length > 0 && left.length === right.length && left.every((name, index) => name === right[index]);
}

// src/importer.ts
var import_obsidian = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  importMode: "auto",
  outputFolder: "\u7F51\u6587",
  coverFolder: "_assets/webnovel-import",
  downloadCovers: true,
  summaryLength: 260
};
var sourceKey = (ref) => `${ref.provider}:${ref.id}`;

// src/merge.ts
function isCoreManaged(state) {
  return isRecord(state) && state.schema_version === 2 && state.managed_by === "media-core";
}
var metadataFields = [
  "title",
  "authors",
  "description",
  "cover_url",
  "tags",
  "serialization_status",
  "word_count_text",
  "first_published_at",
  "first_published_year",
  "last_updated_at",
  "latest_chapter"
];
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readState(frontmatter) {
  const state = frontmatter.webnovel_import;
  if (state === void 0) return { schema_version: 1, sources: [], adopted: {} };
  if (isCoreManaged(state)) throw new Error("\u6B64\u4F5C\u54C1\u7684\u6765\u6E90\u7531 Media Core \u6258\u7BA1\uFF0C\u8BF7\u628A\u91C7\u96C6\u7ED3\u679C\u5BFC\u51FA\u5230 Media Core\u3002");
  if (!isRecord(state) || state.schema_version !== 1) {
    throw new Error("\u65E0\u6CD5\u66F4\u65B0\uFF1Awebnovel_import.schema_version \u5FC5\u987B\u4E3A 1\uFF1B\u73B0\u6709\u63D2\u4EF6\u6570\u636E\u672A\u88AB\u8986\u76D6\u3002");
  }
  if (!Array.isArray(state.sources) || !isRecord(state.adopted)) {
    throw new Error("\u65E0\u6CD5\u66F4\u65B0\uFF1Awebnovel_import \u7684 sources \u6216 adopted \u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
  }
  for (const source of state.sources) {
    if (!isRecord(source) || typeof source.provider !== "string" || typeof source.id !== "string" || !source.id) {
      throw new Error("\u65E0\u6CD5\u66F4\u65B0\uFF1A\u6765\u6E90\u4F5C\u54C1 ID \u5FC5\u987B\u4FDD\u5B58\u4E3A\u5B57\u7B26\u4E32\uFF0C\u8BF7\u5148\u68C0\u67E5 webnovel_import.sources\u3002");
    }
  }
  for (const adoption of Object.values(state.adopted)) {
    if (!isRecord(adoption) || typeof adoption.source_key !== "string" || !Object.prototype.hasOwnProperty.call(adoption, "value")) {
      throw new Error("\u65E0\u6CD5\u66F4\u65B0\uFF1Awebnovel_import.adopted \u4E2D\u5B58\u5728\u65E0\u6548\u7684\u91C7\u7EB3\u8BB0\u5F55\u3002");
    }
  }
  return state;
}
function getSources(frontmatter) {
  return [...readState(frontmatter).sources];
}
function isEmpty(value) {
  return value === void 0 || value === null || typeof value === "string" && value.trim() === "" || Array.isArray(value) && value.length === 0;
}
function isManualField(source, field) {
  return source.acquisition === "manual" || source.evidence[field]?.startsWith("manual:") === true;
}
function isMissingSourceField(source, field) {
  return isEmpty(source[field]) || field === "serialization_status" && source[field] === "unknown";
}
function sameValue(left, right) {
  if (Object.is(left, right)) return true;
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
}
function shorten(text2, limit) {
  const characters = Array.from(text2);
  if (characters.length <= limit) return text2;
  return limit === 0 ? "" : `${characters.slice(0, limit - 1).join("")}\u2026`;
}
function mergeSnapshot(previous, incoming) {
  const snapshot = {
    ...previous,
    ...incoming,
    authors: [...incoming.authors],
    evidence: { ...previous?.evidence, ...incoming.evidence },
    warnings: [...incoming.warnings]
  };
  const retainedFields = { ...previous?.retained_fields };
  const retainedAcquisitions = { ...previous?.retained_field_acquisitions };
  if (incoming.tags) snapshot.tags = [...incoming.tags];
  if (isMissingSourceField(incoming, "serialization_status")) {
    delete snapshot.serialization_status;
    delete snapshot.evidence.serialization_status;
  }
  for (const field of metadataFields) {
    if (isMissingSourceField(incoming, field) && previous && !isMissingSourceField(previous, field)) {
      snapshot[field] = previous[field];
      retainedFields[field] = previous.retained_fields?.[field] ?? previous.fetched_at;
      let acquisition = previous.retained_field_acquisitions?.[field];
      if (previous.retained_fields?.[field] === void 0) {
        acquisition = previous.acquisition === "manual" || !isManualField(previous, field) ? previous.acquisition : void 0;
      }
      if (acquisition) retainedAcquisitions[field] = acquisition;
      else delete retainedAcquisitions[field];
      if (previous.evidence[field] !== void 0) snapshot.evidence[field] = previous.evidence[field];
      else if (previous.acquisition === "manual") snapshot.evidence[field] = "manual:\u7528\u6237\u624B\u5DE5\u5F55\u5165";
    } else {
      delete retainedFields[field];
      delete retainedAcquisitions[field];
      if (!isMissingSourceField(incoming, field) && incoming.evidence[field] === void 0) {
        delete snapshot.evidence[field];
      }
    }
  }
  if (Object.keys(retainedFields).length) snapshot.retained_fields = retainedFields;
  else delete snapshot.retained_fields;
  if (Object.keys(retainedAcquisitions).length) snapshot.retained_field_acquisitions = retainedAcquisitions;
  else delete snapshot.retained_field_acquisitions;
  return snapshot;
}
function upsertFrontmatter(current, incoming, options) {
  if (typeof incoming.id !== "string" || incoming.id.length === 0) {
    throw new Error("\u6765\u6E90\u4F5C\u54C1 ID \u5FC5\u987B\u4E3A\u975E\u7A7A\u5B57\u7B26\u4E32\u3002");
  }
  if (!Number.isInteger(options.summaryLength) || options.summaryLength < 0) {
    throw new Error("\u7B80\u4ECB\u5B57\u6570\u4E0A\u9650\u5FC5\u987B\u4E3A\u975E\u8D1F\u6574\u6570\u3002");
  }
  const previousState = readState(current);
  const key = sourceKey(incoming);
  const sources = [...previousState.sources];
  const sourceIndex = sources.findIndex((source) => sourceKey(source) === key);
  const snapshot = mergeSnapshot(sources[sourceIndex], incoming);
  if (sourceIndex < 0) sources.push(snapshot);
  else sources[sourceIndex] = snapshot;
  const frontmatter = { ...current };
  for (const [field, value] of Object.entries({ uid: options.uid, type: "work", media: "webnovel" })) {
    if (!Object.prototype.hasOwnProperty.call(frontmatter, field)) frontmatter[field] = value;
  }
  const adoptionRecords = { ...previousState.adopted };
  const adopted = [];
  const preserved = [];
  const candidates = [
    { field: "title", sourceField: "title", value: incoming.title },
    { field: "authors", sourceField: "authors", value: incoming.authors },
    { field: "summary", sourceField: "description", value: incoming.description === void 0 ? void 0 : shorten(incoming.description, options.summaryLength) },
    { field: "cover", sourceField: "cover_url", value: options.cover || incoming.cover_url },
    // A recent update or chapter date is never a publication year.
    { field: "first_published_year", sourceField: "first_published_year", value: incoming.first_published_year },
    { field: "serialization_status", sourceField: "serialization_status", value: incoming.serialization_status }
  ];
  for (const { field, sourceField, value } of candidates) {
    if (isEmpty(value) || field === "serialization_status" && value === "unknown") continue;
    const evidence = incoming.evidence[sourceField];
    const manual = isManualField(incoming, sourceField);
    const previous = adoptionRecords[field];
    const unchangedUnknown = field === "serialization_status" && frontmatter[field] === "unknown" && previous?.value === "unknown" && previous.source_key.startsWith("manual:");
    const mayUpdate = unchangedUnknown || (previous ? (previous.source_key === key || manual && previous.source_key === `manual:${key}`) && sameValue(frontmatter[field], previous.value) : isEmpty(frontmatter[field]));
    if (!mayUpdate) {
      preserved.push(field);
      continue;
    }
    const newValue = Array.isArray(value) ? [...value] : value;
    frontmatter[field] = newValue;
    adoptionRecords[field] = {
      source_key: manual ? `manual:${key}` : key,
      // Keep the baseline independent from the value exposed in frontmatter.
      value: Array.isArray(value) ? [...value] : value,
      ...manual ? { evidence: evidence || "manual:\u7528\u6237\u624B\u5DE5\u5F55\u5165" } : {}
    };
    adopted.push(field);
  }
  frontmatter.webnovel_import = {
    ...previousState,
    schema_version: 1,
    sources,
    adopted: adoptionRecords
  };
  return { frontmatter, adopted, preserved };
}

// src/manual-work.ts
var trimmed = (value) => value?.trim() || void 0;
function list(values) {
  const result = [...new Set(values?.map((value) => value.trim()).filter(Boolean))];
  return result.length ? result : void 0;
}
function isHttpUrl(value) {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
function normalizeManualWork(draft) {
  const title = draft.title.trim();
  if (!title) throw new Error("\u8BF7\u586B\u5199\u4F5C\u54C1\u4E66\u540D\u3002");
  const authors = list(draft.authors);
  const cover = trimmed(draft.cover);
  const summary = trimmed(draft.summary);
  const wordCount = trimmed(draft.word_count_text);
  const tags = list(draft.tags);
  const date = trimmed(draft.first_published_at);
  let year = draft.first_published_year;
  if (date) {
    const day = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
      throw new Error("\u9996\u53D1\u65E5\u671F\u8BF7\u586B\u5199\u6709\u6548\u7684 YYYY-MM-DD\u3002");
    }
    if (year !== void 0 && year !== day.getUTCFullYear()) throw new Error("\u9996\u53D1\u5E74\u4EFD\u4E0E\u65E5\u671F\u4E0D\u4E00\u81F4\u3002");
    year = day.getUTCFullYear();
  }
  if (year !== void 0 && (!Number.isInteger(year) || year < 1 || year > 9999)) throw new Error("\u9996\u53D1\u5E74\u4EFD\u8BF7\u586B\u56DB\u4F4D\u6570\u5B57\u3002");
  const status2 = draft.serialization_status;
  if (status2 && !["ongoing", "completed", "paused", "unknown"].includes(status2)) throw new Error("\u8BF7\u9009\u62E9\u4F5C\u54C1\u72B6\u6001\u3002");
  const platform = trimmed(draft.reference?.platform);
  const url = trimmed(draft.reference?.url);
  const note = trimmed(draft.reference?.note);
  if (url && !isHttpUrl(url)) throw new Error("\u5386\u53F2\u94FE\u63A5\u8BF7\u586B\u5199\u5B8C\u6574\u7684 HTTP \u6216 HTTPS \u5730\u5740\u3002");
  return {
    title,
    ...authors && { authors },
    ...cover && { cover: isHttpUrl(cover) ? new URL(cover).href : cover },
    ...summary && { summary },
    ...date && { first_published_at: date },
    ...year !== void 0 && { first_published_year: year },
    ...status2 && status2 !== "unknown" && { serialization_status: status2 },
    ...wordCount && { word_count_text: wordCount },
    ...tags && { tags },
    ...(platform || url || note) && { reference: { ...platform && { platform }, ...url && { url }, ...note && { note } } }
  };
}
function manualFrontmatter(draft, uid) {
  const { reference, ...fields } = draft;
  const adopted = Object.fromEntries(Object.entries(fields).map(([field, value]) => [
    field,
    { source_key: "manual:local", value: structuredClone(value), evidence: "manual:\u7528\u6237\u624B\u5DE5\u5EFA\u6863" }
  ]));
  return {
    uid,
    type: "work",
    media: "webnovel",
    ...fields,
    webnovel_import: {
      schema_version: 1,
      sources: [],
      adopted,
      ...reference && { manual_reference: reference }
    }
  };
}

// src/importer.ts
function folderPath(value) {
  const path = value.trim().replace(/\\/g, "/");
  if (path.startsWith("/") || /[:*?"<>|\u0000-\u001f]/.test(path) || path.split("/").some((p) => p === ".." || p === ".")) {
    throw new Error("\u8BF7\u586B\u5199 Vault \u5185\u7684\u76F8\u5BF9\u76EE\u5F55\uFF0C\u4F8B\u5982 \u7F51\u6587 \u6216 _assets/webnovel-import\u3002");
  }
  return path ? (0, import_obsidian.normalizePath)(path) : "";
}
function fileStem(value) {
  const stem = Array.from(value.replace(/[\\/:*?"<>|\u0000-\u001f#^[\]]/g, " ").trim()).slice(0, 100).join("").replace(/[. ]+$/, "");
  return stem || "\u672A\u547D\u540D\u4F5C\u54C1";
}
function hash(value) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return (result >>> 0).toString(16);
}
function markdownText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\\`*_[\]#]/g, "\\$&");
}
var Importer = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
    this.queue = Promise.resolve();
    this.recent = /* @__PURE__ */ new Map();
    this.recentManual = /* @__PURE__ */ new WeakMap();
  }
  async fetch(input) {
    const ref = parseBookUrl(input);
    const name = providerName(ref.provider);
    const recovery = getSourceAdapter(ref.provider).recoveryHint;
    const response = await (0, import_obsidian.requestUrl)({ url: ref.url, headers: { Accept: "text/html" }, throw: false }).catch((error) => {
      throw new Error(`\u672A\u80FD\u8FDE\u63A5${name}\uFF1A${error instanceof Error ? error.message : String(error)}\u3002${recovery}`);
    });
    if (response.status !== 200) {
      let reason = "\u672A\u83B7\u5F97\u53EF\u89E3\u6790\u7684\u4F5C\u54C1\u9875";
      if ([404, 410].includes(response.status)) reason = "\u6B64\u94FE\u63A5\u7684\u516C\u5F00\u9875\u9762\u672A\u627E\u5230\u6216\u5DF2\u79FB\u9664\uFF0C\u8BF7\u6838\u5BF9\u94FE\u63A5";
      if ([202, 401, 403, 429].includes(response.status)) reason = "\u666E\u901A\u8BF7\u6C42\u53EF\u80FD\u53D7\u8BBF\u95EE\u9650\u5236";
      throw new Error(`${name}\u8FD4\u56DE HTTP ${response.status}\uFF0C${reason}\u3002${recovery}`);
    }
    const contentType = Object.entries(response.headers).find(([key]) => key.toLowerCase() === "content-type")?.[1];
    const html = ref.provider === "jjwxc" ? decodeHtmlBytes(response.arrayBuffer, contentType) : response.text;
    return parseSourceHtml(html, ref, "remote");
  }
  import(metadata, target, options = {}) {
    return this.enqueue(() => this.write(metadata, target, options.createSeparate));
  }
  enqueue(write) {
    const next = this.queue.then(write);
    this.queue = next.catch(() => void 0);
    return next;
  }
  cachedFrontmatter(file) {
    const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (cached) this.recentManual.delete(file);
    return cached ?? this.recentManual.get(file);
  }
  prepareManual(draft) {
    const result = normalizeManualWork(draft);
    if (!result.cover || isHttpUrl(result.cover)) return result;
    const path = folderPath(result.cover);
    if (!/\.(?:jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(path) || !(this.app.vault.getAbstractFileByPath(path) instanceof import_obsidian.TFile)) {
      throw new Error("\u5C01\u9762\u8BF7\u586B\u5199 Vault \u5185\u5DF2\u5B58\u5728\u7684\u56FE\u7247\u8DEF\u5F84\uFF0C\u6216\u5B8C\u6574\u7684 HTTP \u6216 HTTPS \u56FE\u7247\u5730\u5740\u3002");
    }
    return { ...result, cover: path };
  }
  previewManualMatches(draft) {
    const authors = draft.authors ?? [];
    return this.app.vault.getMarkdownFiles().filter((file) => {
      const local = this.cachedFrontmatter(file);
      return local?.type === "work" && local.media === "webnovel" && (matchesWork(local, { title: draft.title, authors }) || (hasNoAuthors(local.authors) || !authors.length) && matchesTitle(local.title, draft.title));
    }).sort((a, b) => a.path.localeCompare(b.path));
  }
  async createManual(draft, options = {}) {
    const prepared = this.prepareManual(draft);
    const { createSeparate } = options;
    return this.enqueue(async () => {
      if (this.previewManualMatches(prepared).length && !createSeparate) {
        throw new Error("\u53D1\u73B0\u53EF\u80FD\u5DF2\u5B58\u5728\u7684\u4F5C\u54C1\uFF0C\u8BF7\u9009\u62E9\u6253\u5F00\u5DF2\u6709\u4F5C\u54C1\u6216\u786E\u8BA4\u72EC\u7ACB\u521B\u5EFA\u3002");
      }
      const folder = folderPath(this.settings().outputFolder);
      await this.ensureFolder(folder);
      const base = `${folder ? `${folder}/` : ""}${fileStem(prepared.title)}`;
      let path = `${base}.md`;
      for (let suffix = 2; this.app.vault.getAbstractFileByPath(path); suffix++) path = `${base} (${suffix}).md`;
      path = (0, import_obsidian.normalizePath)(path);
      const fm = manualFrontmatter(this.prepareManual(prepared), `work-${crypto.randomUUID()}`);
      const cover = typeof fm.cover === "string" && !isHttpUrl(fm.cover) ? this.app.vault.getAbstractFileByPath(fm.cover) : void 0;
      const coverLink = cover instanceof import_obsidian.TFile ? `!${this.app.fileManager.generateMarkdownLink(cover, path, void 0, "\u5C01\u9762")}` : void 0;
      const file = await this.app.vault.create(path, `---
${(0, import_obsidian.stringifyYaml)(fm)}---

${this.initialBody(fm, void 0, coverLink)}`);
      this.recentManual.set(file, fm);
      return file;
    });
  }
  sources(file) {
    return getSources(this.cachedFrontmatter(file) ?? {});
  }
  /** Exact source ownership takes precedence over title/author candidates. */
  previewMatches(metadata) {
    const warnings = [];
    const exact = this.findMatches(metadata, warnings);
    if (exact.length > 1) throw new Error(`\u540C\u4E00\u6765\u6E90\u5DF2\u5173\u8054\u591A\u4E2A\u6587\u4EF6\uFF0C\u8BF7\u5148\u6574\u7406\uFF1A${exact.map((f) => f.path).join("\uFF1B")}`);
    if (exact[0]) return { exact: exact[0], candidates: [], warnings };
    const candidates = this.app.vault.getMarkdownFiles().filter((file) => {
      const local = this.cachedFrontmatter(file);
      if (!local || !matchesTitle(local.title, metadata.title)) return false;
      try {
        const sources = getSources(local);
        return matchesWork(local, metadata) || local.type === "work" && local.media === "webnovel" && !sources.length && hasNoAuthors(local.authors);
      } catch {
        return false;
      }
    }).sort((a, b) => a.path.localeCompare(b.path));
    return { candidates, warnings };
  }
  findMatches(ref, warnings) {
    const key = sourceKey(ref);
    const matches = /* @__PURE__ */ new Set();
    const recent = this.recent.get(key);
    if (recent && this.app.vault.getAbstractFileByPath(recent.path) === recent) matches.add(recent);
    for (const file of this.app.vault.getMarkdownFiles()) {
      try {
        if (this.sources(file).some((s) => sourceKey(s) === key)) matches.add(file);
      } catch {
        const state = this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        const rawSources = state && typeof state === "object" ? state.sources : void 0;
        if (Array.isArray(rawSources) && rawSources.some((s) => s?.provider === ref.provider && s?.id === ref.id)) {
          if (isCoreManaged(state)) throw new Error(`${file.path} \u5DF2\u7531 Media Core \u6258\u7BA1\u3002\u8BF7\u628A\u91C7\u96C6\u7ED3\u679C\u5BFC\u51FA\u5230 Media Core\u3002`);
          throw new Error(`${file.path} \u5DF2\u8BB0\u5F55\u6B64\u6765\u6E90\uFF0C\u4F46\u63D2\u4EF6\u6570\u636E\u683C\u5F0F\u4E0D\u517C\u5BB9\u6216\u6709\u8BEF\uFF1B\u8BF7\u5148\u68C0\u67E5\u8BE5\u6587\u4EF6\u3002`);
        }
        if (!isCoreManaged(state)) warnings.push(`${file.path} \u7684\u6765\u6E90\u533A\u683C\u5F0F\u4E0D\u517C\u5BB9\uFF0C\u672A\u53C2\u4E0E\u672C\u6B21\u81EA\u52A8\u53BB\u91CD\u68C0\u67E5\u3002`);
      }
    }
    return [...matches];
  }
  async ensureFolder(path) {
    if (!path) return;
    let partial = "";
    for (const segment of path.split("/")) {
      partial = partial ? `${partial}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(partial);
      if (existing instanceof import_obsidian.TFile) throw new Error(`\u76EE\u5F55\u4F4D\u7F6E\u5DF2\u6709\u540C\u540D\u6587\u4EF6\uFF1A${partial}`);
      if (!existing) await this.app.vault.createFolder(partial);
    }
  }
  async cover(metadata, warnings) {
    if (!metadata.cover_url || !this.settings().downloadCovers) return metadata.cover_url;
    try {
      const response = await (0, import_obsidian.requestUrl)({ url: metadata.cover_url, throw: false });
      const mime = Object.entries(response.headers).find(([key]) => key.toLowerCase() === "content-type")?.[1].split(";")[0].trim().toLowerCase();
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[mime ?? ""];
      if (response.status !== 200 || !ext) throw new Error("\u5C01\u9762\u54CD\u5E94\u4E0D\u662F\u652F\u6301\u7684\u56FE\u7247");
      const folder = folderPath(this.settings().coverFolder);
      await this.ensureFolder(folder);
      const path = (0, import_obsidian.normalizePath)(`${folder ? `${folder}/` : ""}${metadata.provider}-${metadata.id}-${hash(metadata.cover_url)}.${ext}`);
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (!existing) await this.app.vault.createBinary(path, response.arrayBuffer);
      else if (!(existing instanceof import_obsidian.TFile)) throw new Error("\u5C01\u9762\u4F4D\u7F6E\u88AB\u540C\u540D\u76EE\u5F55\u5360\u7528");
      return path;
    } catch (error) {
      warnings.push(`\u5C01\u9762\u672A\u4E0B\u8F7D\uFF0C\u4FDD\u7559\u539F\u59CB\u56FE\u7247\u94FE\u63A5\uFF1A${error instanceof Error ? error.message : String(error)}`);
      return void 0;
    }
  }
  async write(metadata, explicitTarget, createSeparate = false) {
    if (!metadata.title.trim()) throw new Error("\u8BF7\u586B\u5199\u4F5C\u54C1\u6807\u9898\u3002");
    if (explicitTarget && this.app.vault.getAbstractFileByPath(explicitTarget.path) !== explicitTarget) {
      throw new Error("\u76EE\u6807\u7B14\u8BB0\u5DF2\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002");
    }
    const plan = this.previewMatches(metadata);
    const warnings = [...metadata.warnings, ...plan.warnings];
    if (explicitTarget && plan.exact && plan.exact !== explicitTarget) {
      throw new Error(`\u6B64\u6765\u6E90\u5DF2\u7ECF\u5173\u8054 ${plan.exact.path}\uFF0C\u672C\u6B21\u672A\u6539\u52A8\u5176\u4ED6\u6587\u4EF6\u3002`);
    }
    const target = explicitTarget ?? plan.exact;
    if (!target && plan.candidates.length && !createSeparate) {
      throw new Error(`\u53D1\u73B0\u53EF\u80FD\u5DF2\u5B58\u5728\u7684\u4F5C\u54C1\uFF0C\u8BF7\u5355\u72EC\u9884\u89C8\u5E76\u9009\u62E9\u5173\u8054\u6216\u72EC\u7ACB\u521B\u5EFA\uFF1A${plan.candidates.map((f) => f.path).join("\uFF1B")}`);
    }
    if (target) {
      if (typeof import_obsidian.getFrontMatterInfo === "function") {
        const current = (0, import_obsidian.getFrontMatterInfo)(await this.app.vault.read(target));
        if (current.exists) getSources((0, import_obsidian.parseYaml)(current.frontmatter) ?? {});
      } else {
        this.sources(target);
      }
    }
    const cover = await this.cover(metadata, warnings);
    const options = { uid: `work-${crypto.randomUUID()}`, cover, summaryLength: this.settings().summaryLength };
    let adopted = [];
    let preserved = [];
    if (target) {
      await this.app.fileManager.processFrontMatter(target, (frontmatter) => {
        const localCover = typeof frontmatter.cover === "string" && !/^https?:\/\//i.test(frontmatter.cover) && this.app.vault.getAbstractFileByPath(frontmatter.cover) instanceof import_obsidian.TFile ? frontmatter.cover : void 0;
        const retainedCover = !cover && metadata.cover_url && localCover ? localCover : cover;
        const result2 = upsertFrontmatter(frontmatter, metadata, { ...options, cover: retainedCover });
        Object.assign(frontmatter, result2.frontmatter);
        adopted = result2.adopted;
        preserved = result2.preserved;
      });
      this.recent.set(sourceKey(metadata), target);
      return { file: target, created: false, adopted, preserved, warnings };
    }
    const result = upsertFrontmatter({}, metadata, options);
    const folder = folderPath(this.settings().outputFolder);
    await this.ensureFolder(folder);
    const base = `${folder ? `${folder}/` : ""}${fileStem(metadata.title)}`;
    let path = `${base}.md`;
    if (this.app.vault.getAbstractFileByPath(path)) path = `${base} (${metadata.provider}-${metadata.id}).md`;
    for (let suffix = 2; this.app.vault.getAbstractFileByPath(path); suffix++) path = `${base} (${metadata.provider}-${metadata.id}-${suffix}).md`;
    const body = this.initialBody(result.frontmatter, metadata);
    const file = await this.app.vault.create((0, import_obsidian.normalizePath)(path), `---
${(0, import_obsidian.stringifyYaml)(result.frontmatter)}---

${body}`);
    this.recent.set(sourceKey(metadata), file);
    return { file, created: true, adopted: result.adopted, preserved: result.preserved, warnings };
  }
  initialBody(frontmatter, metadata, coverLink) {
    const lines = [`# ${markdownText(String(frontmatter.title))}`, ""];
    const cover = frontmatter.cover;
    if (typeof cover === "string") {
      lines.push(coverLink ?? (/^https?:\/\//i.test(cover) ? `![\u5C01\u9762](<${cover.replace(/>/g, "%3E")}>)` : `![[${cover}]]`), "");
    }
    if (frontmatter.summary) lines.push(markdownText(String(frontmatter.summary)), "");
    if (metadata) lines.push(`[\u4F5C\u54C1\u8BE6\u60C5 \xB7 ${providerName(metadata.provider)}](${metadata.url})`, "");
    lines.push("<!-- \u6B63\u6587\u7531\u4F60\u7EF4\u62A4\uFF1B\u5237\u65B0\u4EC5\u66F4\u65B0\u5C5E\u6027\u4E2D\u7684\u6765\u6E90\u4FE1\u606F\u548C\u672A\u88AB\u4EBA\u5DE5\u4FEE\u6539\u7684\u91C7\u7528\u503C\u3002 -->", "");
    return lines.join("\n");
  }
};

// src/ui.ts
var import_obsidian2 = require("obsidian");

// src/media-core-export.ts
var import_media_source_v2 = __toESM(require_media_source_v2());
var mappedFields = {
  title: "title",
  authors: "authors",
  description: "summary",
  cover_url: "cover",
  tags: "tags",
  serialization_status: "original_status",
  first_published_year: "year",
  first_published_at: "release_date",
  last_updated_at: "latest_chapter_updated_at"
};
function optionalValue(value, normalize2) {
  try {
    return normalize2(value);
  } catch {
    return void 0;
  }
}
function hasValue(value) {
  return value !== void 0 && value !== null && (typeof value !== "string" || value.trim() !== "") && (!Array.isArray(value) || value.some((entry) => typeof entry === "string" && entry.trim()));
}
function chapterUpdate(source, locator) {
  if (!source.latest_chapter || !source.last_updated_at) return void 0;
  const chapterLocator = source.provider === "qidian" && (locator.includes(".update-time") || locator.includes("og:novel:update_time")) || source.provider === "fanqie" && locator.includes(".info-last-time") || source.provider === "qimao" && locator.includes(".book-information .update-info .update-time") || source.provider === "jjwxc" && locator.includes('tr[itemprop~="newestChapter"]') && locator.includes("\u53EF\u89C1\u66F4\u65B0\u65F6\u95F4");
  if (!chapterLocator) return void 0;
  return optionalValue(source.last_updated_at.replace(/^(\d{4}-\d\d-\d\d)\s+(?=\d\d:)/, "$1T"), import_media_source_v2.normalizeDisplayTime);
}
function toMediaCoreSource(source, { archive = false, now = () => (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const ref = parseBookUrl(source.url);
  if (ref.id !== source.id || ref.provider !== source.provider) {
    throw new Error("\u6765\u6E90\u7684\u4F5C\u54C1\u94FE\u63A5\u4E0E ID \u4E0D\u4E00\u81F4\uFF0C\u65E0\u6CD5\u5BFC\u51FA\u3002");
  }
  const locators = Object.fromEntries(Object.entries(source.evidence ?? {}).filter(([, value]) => typeof value === "string"));
  const acquisition = ["remote", "html", "browser", "manual"].includes(source.acquisition) ? source.acquisition : void 0;
  const currentTime = optionalValue(source.fetched_at, import_media_source_v2.normalizeTimestamp);
  const method = archive || !acquisition || !currentTime && acquisition !== "manual" ? "archive" : acquisition;
  let exportedAt = method === "archive" || method === "manual" ? (0, import_media_source_v2.normalizeTimestamp)(now()) : void 0;
  const acquired_at = exportedAt ?? currentTime;
  const warnings = Array.isArray(source.warnings) ? source.warnings.filter((value) => typeof value === "string") : [];
  const fields = {};
  const field_evidence = {};
  const original = {};
  const evidence = (key) => {
    const locator = locators[key];
    const isManual = acquisition === "manual" || locator?.startsWith("manual:");
    const retainedAt = source.retained_fields?.[key];
    const priorAcquisition = source.retained_field_acquisitions?.[key];
    if (retainedAt !== void 0 && (archive || !locator?.startsWith("manual:"))) {
      const basis = priorAcquisition === "remote" || priorAcquisition === "browser" ? "source-observation" : priorAcquisition === "manual" ? "manual-entry" : "local-document-read";
      const observed_at = basis !== "local-document-read" ? optionalValue(retainedAt, import_media_source_v2.normalizeTimestamp) : void 0;
      return { state: "retained", basis, ...observed_at ? { observed_at } : {}, ...locator ? { locator } : {} };
    }
    if (!archive && isManual) {
      exportedAt ?? (exportedAt = (0, import_media_source_v2.normalizeTimestamp)(now()));
      return { state: "observed", basis: "manual-entry", observed_at: exportedAt, ...locator ? { locator } : {} };
    }
    if (isManual && acquisition !== "manual") {
      return { state: "retained", basis: "manual-entry", ...locator ? { locator } : {} };
    }
    if (!currentTime || !acquisition || acquisition === "html") {
      return { state: "unverified", basis: "local-document-read", ...locator ? { locator } : {} };
    }
    return {
      state: archive ? "retained" : "observed",
      basis: isManual ? "manual-entry" : "source-observation",
      observed_at: currentTime,
      ...locator ? { locator } : {}
    };
  };
  for (const key of Object.keys(mappedFields)) {
    const value = source[key];
    if (!hasValue(value)) continue;
    let projected = value;
    if (key === "last_updated_at") projected = chapterUpdate(source, locators.last_updated_at ?? "");
    if (key === "cover_url") projected = optionalValue(value, import_media_source_v2.normalizeExternalUrl);
    if (key === "first_published_at") projected = optionalValue(value, import_media_source_v2.normalizePartialDate);
    if (key === "first_published_year" && (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 9999)) projected = void 0;
    if (key === "serialization_status" && !["ongoing", "completed", "paused"].includes(String(value))) projected = void 0;
    if (key !== "cover_url" && (projected === void 0 || projected !== value)) original[key] = value;
    if (projected === void 0) {
      warnings.push(key === "cover_url" ? "\u5C01\u9762\u6CA1\u6709\u53EF\u7528\u7684\u6765\u6E90\u56FE\u7247\u94FE\u63A5\u3002" : `${key} \u4FDD\u7559\u539F\u6587\uFF0C\u6682\u672A\u6620\u5C04\u4E3A\u4F5C\u54C1\u8D44\u6599\u3002`);
      continue;
    }
    const field = mappedFields[key];
    fields[field] = projected;
    field_evidence[`/fields/${field}`] = evidence(key);
  }
  return (0, import_media_source_v2.normalizeSourceV2)({
    protocol: import_media_source_v2.SOURCE_V2_PROTOCOL,
    ...ref,
    scope: "work",
    observation: { acquired_at, method },
    fields,
    field_evidence,
    extensions: { [ref.provider]: {
      version: 1,
      evidence: locators,
      ...acquisition ? { acquisition } : {},
      ...typeof source.fetched_at === "string" ? { fetched_at: source.fetched_at } : {},
      ...source.latest_chapter ? { latest_chapter: source.latest_chapter } : {},
      ...source.word_count_text ? { word_count_text: source.word_count_text } : {},
      ...source.retained_fields ? { retained_fields: source.retained_fields } : {},
      ...source.retained_field_acquisitions ? { retained_field_acquisitions: source.retained_field_acquisitions } : {},
      ...Object.keys(original).length ? { original } : {},
      ...warnings.length ? { warnings } : {}
    } }
  });
}

// src/media-core-integration.ts
var import_media_source_v22 = __toESM(require_media_source_v2());
var CORE_ID = "media-core";
function resolveManualWorkRoute(app, mode) {
  const route = resolveImportRoute(app, mode);
  if (route.kind === "independent") return route;
  if (route.kind === "core") {
    const intake = route.intake;
    const open = intake.openManualWork;
    if (intake.manualWorkApiVersion === 1 && typeof open === "function") {
      return { kind: "core", openPreview: (draft, options) => open.call(intake, draft, options) };
    }
    return { kind: "independent", message: "\u5F53\u524D Media Core \u7248\u672C\u5C1A\u4E0D\u652F\u6301\u63D2\u4EF6\u95F4\u624B\u52A8\u5EFA\u6863\u3002\u53EF\u5347\u7EA7 Media Core\uFF0C\u6216\u660E\u786E\u786E\u8BA4\u72EC\u7ACB\u4FDD\u5B58\u3002" };
  }
  return { kind: "independent", message: "Media Core \u5F53\u524D\u4E0D\u53EF\u7528\u3002\u53EF\u542F\u7528\u517C\u5BB9\u7248\u672C\uFF0C\u6216\u660E\u786E\u786E\u8BA4\u72EC\u7ACB\u4FDD\u5B58\u3002" };
}
function resolveImportRoute(app, mode) {
  if (mode === "independent") return { kind: "independent" };
  const registry = app.plugins;
  const plugin = registry?.getPlugin?.(CORE_ID);
  const enabled = registry?.enabledPlugins?.has(CORE_ID);
  if (plugin && enabled !== false) {
    const intake = plugin.sourceIntake;
    if (intake?.apiVersion === 1 && intake.sourceSchema === import_media_source_v22.SOURCE_V2_PROTOCOL && typeof intake.openSourcePreview === "function") {
      return { kind: "core", intake };
    }
    return { kind: "unavailable", message: "Media Core \u5C1A\u672A\u5C31\u7EEA\uFF0C\u6216\u5F53\u524D\u7248\u672C\u4E0D\u652F\u6301\u4E00\u952E\u5BFC\u5165\u3002\u53EF\u4EE5\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON\uFF0C\u5728 Media Core \u4E2D\u624B\u52A8\u9884\u89C8\u3002" };
  }
  if (plugin || registry?.manifests?.[CORE_ID] || enabled) {
    return { kind: "unavailable", message: enabled === false ? "Media Core \u5DF2\u505C\u7528\u3002\u542F\u7528\u540E\u91CD\u8BD5\uFF0C\u6216\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON\u3002" : "Media Core \u5C1A\u672A\u52A0\u8F7D\u3002\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF0C\u6216\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON\u3002" };
  }
  if (!registry?.manifests || !registry.getPlugin) {
    return { kind: "unavailable", message: "\u65E0\u6CD5\u786E\u8BA4 Media Core \u5B89\u88C5\u72B6\u6001\u3002\u53EF\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON\uFF0C\u6216\u5728\u8BBE\u7F6E\u4E2D\u660E\u786E\u9009\u62E9\u72EC\u7ACB\u6A21\u5F0F\u3002" };
  }
  return mode === "auto" ? { kind: "independent" } : { kind: "unavailable", message: "\u5F53\u524D Vault \u5C1A\u672A\u5B89\u88C5 Media Core\u3002\u53EF\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON\u3002" };
}
async function openMediaCorePreview(app, mode, source, targetUid) {
  const route = resolveImportRoute(app, mode);
  if (route.kind === "unavailable") throw new Error(route.message);
  if (route.kind !== "core") throw new Error("\u5F53\u524D\u8BBE\u7F6E\u4F7F\u7528\u72EC\u7ACB\u6A21\u5F0F\u3002");
  if (source.protocol !== route.intake.sourceSchema) throw new Error("Media Core \u4E0D\u652F\u6301\u6B64\u6765\u6E90\u534F\u8BAE\u3002");
  await route.intake.openSourcePreview(source, targetUid ? { targetUid } : void 0);
}

// src/ui.ts
async function copyMediaCoreSource(metadata, archive = false) {
  await navigator.clipboard.writeText(JSON.stringify(toMediaCoreSource(metadata, { archive }), null, 2));
}
var copiedMessage = "\u5DF2\u590D\u5236\u4F5C\u54C1\u8D44\u6599\u3002\u8BF7\u5728 Media Core \u7684\u201C\u5BFC\u5165\u6765\u6E90\u8D44\u6599\u201D\u5165\u53E3\u7C98\u8D34\u5E76\u9884\u89C8\u3002";
var errorText = (error) => error instanceof Error ? error.message : String(error);
var SingleImportModal = class extends import_obsidian2.Modal {
  constructor(plugin, target, initial) {
    super(plugin.app);
    this.plugin = plugin;
    this.target = target;
    this.initial = initial;
    this.url = "";
    this.html = "";
    this.generation = 0;
    this.submitting = false;
  }
  onOpen() {
    this.url = this.initial?.url ?? this.initial?.metadata?.url ?? "";
    this.metadata = this.initial?.metadata;
    this.contentEl.addClass("webnovel-import-modal");
    this.contentEl.createEl("h2", { text: this.target ? "\u5173\u8054\u7F51\u6587\u6765\u6E90" : "\u5BFC\u5165\u7F51\u6587\u4F5C\u54C1" });
    this.contentEl.createEl("p", { text: this.target ? `\u5C06\u6765\u6E90\u5173\u8054\u5230\u300C${this.target.basename}\u300D\u3002\u5DF2\u6709\u4EBA\u5DE5\u5185\u5BB9\u4F1A\u4FDD\u7559\u3002` : "\u7C98\u8D34\u8D77\u70B9\u3001\u756A\u8304\u3001\u4E03\u732B\u6216\u664B\u6C5F\u7684\u4F5C\u54C1\u8BE6\u60C5\u9875\u94FE\u63A5\u3002\u83B7\u53D6\u540E\u53EF\u8865\u586B\u7F3A\u5931\u8D44\u6599\u3002" });
    new import_obsidian2.Setting(this.contentEl).setName("\u4F5C\u54C1\u94FE\u63A5").addText((text2) => {
      text2.setValue(this.url).setPlaceholder("https://fanqienovel.com/page/\u2026").onChange((value) => {
        this.url = value;
        this.generation++;
        this.metadata = void 0;
        this.form?.empty();
        this.status?.setText("");
      });
      text2.inputEl.addClass("webnovel-url-input");
    });
    const actions = new import_obsidian2.Setting(this.contentEl);
    actions.addButton((button) => button.setButtonText("\u83B7\u53D6\u8D44\u6599").setCta().onClick(() => void this.acquire(button, false)));
    actions.addButton((button) => button.setButtonText("\u624B\u52A8\u8865\u586B").onClick(() => {
      this.generation++;
      try {
        const ref = parseBookUrl(this.url);
        this.metadata = { ...ref, title: "", authors: [], fetched_at: (/* @__PURE__ */ new Date()).toISOString(), acquisition: "manual", evidence: {}, warnings: ["\u6B64\u6761\u6765\u6E90\u8D44\u6599\u7531\u7528\u6237\u8865\u586B\uFF0C\u5C1A\u672A\u901A\u8FC7\u9875\u9762\u83B7\u53D6\u9A8C\u8BC1\u3002"] };
        this.status.setText("\u624B\u52A8\u8865\u586B\u7684\u503C\u4F1A\u4F5C\u4E3A\u4EBA\u5DE5\u5185\u5BB9\u4FDD\u62A4\u3002");
        this.renderForm();
      } catch (error) {
        this.status.setText(errorText(error));
      }
    }));
    actions.addButton((button) => button.setButtonText("\u6253\u5F00\u4F5C\u54C1\u9875").onClick(() => {
      try {
        this.plugin.openSourcePage(this.url, this.target);
      } catch (error) {
        this.status.setText(errorText(error));
      }
    }));
    const details = this.contentEl.createEl("details");
    this.fallback = details;
    details.createEl("summary", { text: "\u4ECE\u6B63\u5E38\u6253\u5F00\u7684\u4F5C\u54C1\u9875\u9762 HTML \u89E3\u6790" });
    details.createEl("p", { text: "\u5148\u586B\u5199\u4F5C\u54C1\u94FE\u63A5\uFF0C\u5728\u6D4F\u89C8\u5668\u6B63\u5E38\u6253\u5F00\u8BE5\u4F5C\u54C1\u5E76\u53E6\u5B58\u4E3A HTML\uFF0C\u518D\u9009\u62E9\u6587\u4EF6\u6216\u7C98\u8D34\u9875\u9762\u5185\u5BB9\u3002\u63D2\u4EF6\u53EA\u89E3\u6790\uFF0C\u4E0D\u6267\u884C\u9875\u9762\u811A\u672C\u3002\u6587\u4EF6\u4E2D\u7684\u4F5C\u54C1\u6807\u8BC6\u987B\u4E0E\u94FE\u63A5\u4E00\u81F4\u3002" });
    details.createEl("p", { text: "\u4E5F\u53EF\u5728\u8BBE\u7F6E\u4E2D\u590D\u5236\u6D4F\u89C8\u5668\u91C7\u96C6\u4E66\u7B7E\u3002\u6B63\u5E38\u6253\u5F00\u4F5C\u54C1\u540E\u70B9\u51FB\u4E66\u7B7E\uFF0C\u8D44\u6599\u4F1A\u590D\u5236\u5230\u526A\u8D34\u677F\u5E76\u8FD4\u56DE\u9884\u89C8\uFF1B\u672A\u81EA\u52A8\u8FD4\u56DE\u65F6\uFF0C\u8FD0\u884C\u201C\u4ECE\u6D4F\u89C8\u5668\u91C7\u96C6\u7ED3\u679C\u5BFC\u5165\u201D\u3002\u6838\u5BF9\u540E\u518D\u786E\u8BA4\u4FDD\u5B58\u3002" });
    const fileInput = details.createEl("input", { type: "file", attr: { accept: ".html,.htm,text/html" } });
    fileInput.hidden = true;
    new import_obsidian2.Setting(details).addButton((button) => button.setButtonText("\u9009\u62E9 HTML \u6587\u4EF6").onClick(() => fileInput.click()));
    const htmlArea = details.createEl("textarea", { cls: "webnovel-html-input", attr: { placeholder: "<!doctype html>\u2026", "aria-label": "\u4F5C\u54C1\u9875 HTML" } });
    htmlArea.addEventListener("input", () => {
      this.html = htmlArea.value;
      this.generation++;
      this.metadata = void 0;
      this.form?.empty();
      this.status?.setText("\u5DF2\u586B\u5199 HTML\uFF0C\u70B9\u51FB\u201C\u89E3\u6790 HTML\u201D\u9884\u89C8\u4F5C\u54C1\u8D44\u6599\u3002");
    });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      const generation = ++this.generation;
      this.form.empty();
      this.metadata = void 0;
      details.open = true;
      this.status.setText("\u6B63\u5728\u8BFB\u53D6\u5E76\u89E3\u6790 HTML \u6587\u4EF6\u2026");
      try {
        const ref = parseBookUrl(this.url);
        const html = decodeHtmlBytes(await file.arrayBuffer());
        if (generation !== this.generation) return;
        this.html = html;
        htmlArea.value = html;
        this.metadata = parseSourceHtml(html, ref, "html");
        this.status.setText(this.metadata.warnings.length ? this.metadata.warnings.join("\uFF1B") : "\u5DF2\u89E3\u6790\u4F5C\u54C1\u8D44\u6599\uFF0C\u8BF7\u6838\u5BF9\u540E\u5BFC\u5165\u3002");
        this.renderForm();
      } catch (error) {
        if (generation === this.generation) this.status.setText(errorText(error));
      }
    });
    new import_obsidian2.Setting(details).addButton((button) => button.setButtonText("\u89E3\u6790 HTML").onClick(() => void this.acquire(button, true)));
    this.status = this.contentEl.createEl("p", { cls: "webnovel-status", attr: { role: "status" } });
    this.form = this.contentEl.createDiv();
    if (this.metadata) {
      this.status.setText(this.metadata.warnings.length ? this.metadata.warnings.join("\uFF1B") : "\u5DF2\u53D6\u5F97\u4F5C\u54C1\u8D44\u6599\uFF0C\u8BF7\u6838\u5BF9\u540E\u5BFC\u5165\u3002");
      this.renderForm();
    }
  }
  async acquire(button, fromHtml) {
    const generation = ++this.generation;
    button.setDisabled(true);
    this.form.empty();
    this.metadata = void 0;
    this.status.setText(fromHtml ? "\u6B63\u5728\u89E3\u6790\u9875\u9762\u2026" : "\u6B63\u5728\u83B7\u53D6\u4F5C\u54C1\u8D44\u6599\u2026");
    try {
      const metadata = fromHtml ? parseSourceHtml(this.html, parseBookUrl(this.url), "html") : await this.plugin.importer.fetch(this.url);
      if (generation !== this.generation) return;
      this.metadata = metadata;
      this.status.setText(this.metadata.warnings.length ? this.metadata.warnings.join("\uFF1B") : "\u5DF2\u53D6\u5F97\u4F5C\u54C1\u8D44\u6599\u3002");
      this.renderForm();
    } catch (error) {
      if (generation === this.generation) {
        this.status.setText(errorText(error));
        if (this.fallback) this.fallback.open = true;
      }
    } finally {
      button.setDisabled(false);
    }
  }
  renderForm() {
    this.form.empty();
    const original = this.metadata;
    if (!original) return;
    const edited = structuredClone(original);
    this.form.createEl("h3", { text: `${providerName(original.provider)} \xB7 ${original.id}` });
    this.form.createEl("p", { text: "\u8868\u5355\u7559\u7A7A\u8868\u793A\u672C\u6B21\u4E0D\u91C7\u7EB3\u8BE5\u5B57\u6BB5\uFF1B\u6E05\u9664\u5DF2\u6709\u503C\u8BF7\u76F4\u63A5\u7F16\u8F91\u4F5C\u54C1\u5C5E\u6027\u3002", cls: "setting-item-description" });
    let updateMatches;
    const set = (key, value) => {
      edited[key] = value;
      if (JSON.stringify(value) !== JSON.stringify(original[key])) edited.evidence[key] = "manual:\u7528\u6237\u8865\u586B\u6216\u4FEE\u6539";
      else if (original.evidence[key]) edited.evidence[key] = original.evidence[key];
      else delete edited.evidence[key];
      if (key === "title" || key === "authors") updateMatches?.();
    };
    new import_obsidian2.Setting(this.form).setName("\u4E66\u540D").addText((text2) => text2.setValue(edited.title).onChange((value) => set("title", value.trim())));
    new import_obsidian2.Setting(this.form).setName("\u4F5C\u8005").setDesc("\u591A\u4F4D\u4F5C\u8005\u7528\u9017\u53F7\u5206\u9694\u3002").addText((text2) => text2.setValue(edited.authors.join("\uFF0C")).onChange((value) => set("authors", value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))));
    new import_obsidian2.Setting(this.form).setName("\u6765\u6E90\u7B80\u4ECB").addTextArea((text2) => {
      text2.setValue(edited.description ?? "").onChange((value) => set("description", value.trim()));
      text2.inputEl.rows = 5;
    });
    new import_obsidian2.Setting(this.form).setName("\u5C01\u9762\u94FE\u63A5").addText((text2) => text2.setValue(edited.cover_url ?? "").onChange((value) => set("cover_url", value.trim() || void 0)));
    let yearText = edited.first_published_year?.toString().padStart(4, "0") ?? "";
    new import_obsidian2.Setting(this.form).setName("\u7F51\u6587\u9996\u53D1\u5E74\u4EFD").setDesc("\u672A\u77E5\u65F6\u7559\u7A7A\uFF1B\u4E0D\u4EE5\u6700\u8FD1\u66F4\u65B0\u6216\u7EB8\u4E66\u51FA\u7248\u5E74\u4EFD\u4EE3\u66FF\u3002").addText((text2) => text2.setValue(yearText).setPlaceholder("\u672A\u77E5").onChange((value) => {
      yearText = value.trim();
    }));
    new import_obsidian2.Setting(this.form).setName("\u8FDE\u8F7D\u72B6\u6001").addDropdown((dropdown) => dropdown.addOptions({ "": "\u672A\u77E5\uFF08\u7559\u7A7A\uFF09", ongoing: "\u8FDE\u8F7D\u4E2D", completed: "\u5DF2\u5B8C\u7ED3", paused: "\u6682\u505C" }).setValue(edited.serialization_status === "unknown" ? "" : edited.serialization_status ?? "").onChange((value) => set("serialization_status", value || void 0)));
    if (edited.last_updated_at) this.form.createEl("p", { text: `\u6765\u6E90\u6700\u8FD1\u66F4\u65B0\uFF1A${edited.last_updated_at}`, cls: "setting-item-description" });
    if (edited.word_count_text) this.form.createEl("p", { text: `\u6765\u6E90\u663E\u793A\u5B57\u6570\uFF1A${edited.word_count_text}`, cls: "setting-item-description" });
    const readForm = () => {
      if (yearText && (!/^\d{4}$/.test(yearText) || Number(yearText) === 0)) throw new Error("\u5E74\u4EFD\u8BF7\u586B\u56DB\u4F4D\u6570\u5B57\uFF0C\u672A\u77E5\u65F6\u7559\u7A7A\u3002");
      set("first_published_year", yearText ? Number(yearText) : void 0);
      if (edited.cover_url && !/^https?:\/\//i.test(edited.cover_url)) throw new Error("\u5C01\u9762\u94FE\u63A5\u987B\u4E3A http \u6216 https \u5730\u5740\u3002");
      if (!edited.title.trim()) throw new Error("\u8BF7\u586B\u5199\u4F5C\u54C1\u6807\u9898\u3002");
    };
    const route = this.plugin.importRoute();
    const exports = new import_obsidian2.Setting(this.form).setName("\u4EA4\u7ED9 Media Core");
    if (route.kind === "core") {
      exports.setDesc("\u5728 Media Core \u4E2D\u67E5\u770B\u5339\u914D\u548C\u5B57\u6BB5\u5DEE\u5F02\uFF0C\u518D\u786E\u8BA4\u4FDD\u5B58\u3002");
      exports.addButton((button) => button.setButtonText("\u5BFC\u5165 Media Core").setCta().onClick(async () => {
        if (this.submitting) return;
        this.submitting = true;
        button.setDisabled(true);
        try {
          readForm();
          await this.plugin.openCorePreview(toMediaCoreSource(edited), this.target);
          this.initial?.onAccepted?.();
          this.close();
        } catch (error) {
          this.status.setText(errorText(error));
        } finally {
          this.submitting = false;
          button.setDisabled(false);
        }
      }));
    } else if (route.kind === "unavailable") {
      exports.setDesc(route.message);
    }
    exports.addButton((button) => button.setButtonText("\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON").onClick(async () => {
      try {
        readForm();
        await copyMediaCoreSource(edited);
        this.status.setText(copiedMessage);
      } catch (error) {
        this.status.setText(errorText(error));
      }
    }));
    if (route.kind !== "independent") return;
    if (this.target && isCoreManaged(this.app.metadataCache.getFileCache(this.target)?.frontmatter?.webnovel_import)) {
      this.form.createEl("p", { text: "\u6B64\u4F5C\u54C1\u7531 Media Core \u6258\u7BA1\u3002\u8BF7\u5207\u6362\u5BFC\u5165\u6A21\u5F0F\u6216\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON \u540E\u5728 Media Core \u4E2D\u66F4\u65B0\u3002" });
      return;
    }
    const matchArea = this.form.createDiv({ cls: "webnovel-matches" });
    let selected;
    let createSeparate = false;
    let unresolved = false;
    let matchError;
    updateMatches = () => {
      matchArea.empty();
      selected = void 0;
      createSeparate = false;
      unresolved = false;
      matchError = void 0;
      if (this.target) return;
      try {
        const plan = this.plugin.importer.previewMatches(edited);
        for (const warning of plan.warnings) matchArea.createEl("p", { text: warning });
        if (plan.exact) {
          matchArea.createEl("p", { text: `\u5DF2\u6709\u76F8\u540C\u6765\u6E90\uFF0C\u5C06\u66F4\u65B0\uFF1A${plan.exact.path}` });
          return;
        }
        if (!plan.candidates.length) return;
        unresolved = true;
        matchArea.createEl("h3", { text: "\u53D1\u73B0\u53EF\u80FD\u5DF2\u5B58\u5728\u7684\u4F5C\u54C1" });
        matchArea.createEl("p", { text: "\u8BF7\u6838\u5BF9\u4E66\u540D\u3001\u4F5C\u8005\u4E0E\u7B14\u8BB0\u8DEF\u5F84\u3002\u9009\u62E9\u5DF2\u6709\u7B14\u8BB0\u53EF\u8FFD\u52A0\u6765\u6E90\u5E76\u4FDD\u7559\u4E2A\u4EBA\u5185\u5BB9\uFF0C\u6216\u9009\u62E9\u72EC\u7ACB\u521B\u5EFA\u3002" });
        new import_obsidian2.Setting(matchArea).setName("\u5BFC\u5165\u5230").addDropdown((dropdown) => {
          dropdown.addOption("", "\u8BF7\u9009\u62E9\u5173\u8054\u76EE\u6807\u6216\u72EC\u7ACB\u521B\u5EFA");
          dropdown.addOption("new", "\u72EC\u7ACB\u521B\u5EFA\u4F5C\u54C1");
          plan.candidates.forEach((file, index) => dropdown.addOption(String(index), file.path));
          dropdown.setValue("").onChange((value) => {
            unresolved = !value;
            createSeparate = value === "new";
            selected = value && !createSeparate ? plan.candidates[Number(value)] : void 0;
          });
        });
      } catch (error) {
        matchError = errorText(error);
        matchArea.createEl("p", { text: matchError, cls: "webnovel-error" });
      }
    };
    updateMatches();
    new import_obsidian2.Setting(this.form).addButton((button) => button.setButtonText(this.target ? "\u4FDD\u5B58\u6765\u6E90\u5173\u8054" : "\u5BFC\u5165\u4F5C\u54C1").setCta().onClick(async () => {
      if (this.submitting) return;
      this.submitting = true;
      button.setDisabled(true);
      try {
        const current = this.plugin.importRoute();
        if (current.kind === "unavailable") throw new Error(current.message);
        if (current.kind !== "independent") throw new Error("\u5BFC\u5165\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u5BFC\u5165\u9884\u89C8\u3002");
        readForm();
        if (matchError) throw new Error(matchError);
        if (unresolved) throw new Error("\u8BF7\u5148\u9009\u62E9\u5173\u8054\u5DF2\u6709\u4F5C\u54C1\u6216\u72EC\u7ACB\u521B\u5EFA\u3002");
        this.status.setText("\u6B63\u5728\u4FDD\u5B58\u4F5C\u54C1\u8D44\u6599\u2026");
        const result = await this.plugin.importer.import(edited, this.target ?? selected, { createSeparate });
        this.initial?.onAccepted?.();
        new import_obsidian2.Notice(`${result.created ? "\u5DF2\u521B\u5EFA" : "\u5DF2\u66F4\u65B0"}\uFF1A${result.file.basename}${result.warnings.length ? `
${result.warnings.join("\n")}` : ""}`, 8e3);
        await this.app.workspace.getLeaf(false).openFile(result.file);
        this.close();
      } catch (error) {
        this.status.setText(errorText(error));
      } finally {
        this.submitting = false;
        button.setDisabled(false);
      }
    }));
  }
  onClose() {
    this.generation++;
    this.contentEl.empty();
  }
};
var ArchiveExportModal = class extends import_obsidian2.Modal {
  constructor(plugin, file) {
    super(plugin.app);
    this.plugin = plugin;
    this.file = file;
  }
  onOpen() {
    this.contentEl.createEl("h2", { text: "\u5C06\u5F53\u524D\u7F51\u6587\u4EA4\u7ED9 Media Core" });
    this.contentEl.createEl("p", { text: "\u9009\u62E9\u5DF2\u4FDD\u5B58\u7684\u6765\u6E90\u3002\u53EF\u9760\u7684\u539F\u89C2\u5BDF\u65F6\u95F4\u4F1A\u6CBF\u7528\uFF0C\u65E0\u6CD5\u6838\u5BF9\u65F6\u95F4\u7684\u8D44\u6599\u4F9B\u9884\u89C8\u786E\u8BA4\u3002" });
    const status2 = this.contentEl.createEl("p", { attr: { role: "status" } });
    let sources;
    try {
      sources = this.plugin.importer.sources(this.file);
    } catch (error) {
      status2.setText(errorText(error));
      return;
    }
    if (!sources.length) {
      status2.setText("\u5F53\u524D\u7B14\u8BB0\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u7F51\u6587\u6765\u6E90\u3002");
      return;
    }
    let selected = 0;
    const actions = new import_obsidian2.Setting(this.contentEl).setName("\u6765\u6E90");
    actions.addDropdown((dropdown) => {
      sources.forEach((source, index) => dropdown.addOption(String(index), `${source.provider} \xB7 ${source.id}`));
      dropdown.setValue("0").onChange((value) => {
        selected = Number(value);
      });
    });
    const route = resolveImportRoute(this.app, "media-core");
    if (route.kind === "core") {
      actions.addButton((button) => {
        let opening = false;
        button.setButtonText("\u5BFC\u5165 Media Core").setCta().onClick(async () => {
          if (opening) return;
          opening = true;
          button.setDisabled(true);
          try {
            await this.plugin.openCorePreview(toMediaCoreSource(sources[selected], { archive: true }), this.file, "media-core");
            this.close();
          } catch (error) {
            status2.setText(errorText(error));
          } finally {
            opening = false;
            button.setDisabled(false);
          }
        });
      });
    } else if (route.kind === "unavailable") status2.setText(route.message);
    actions.addButton((button) => button.setButtonText("\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON").onClick(async () => {
      try {
        await copyMediaCoreSource(sources[selected], true);
        status2.setText(copiedMessage);
      } catch (error) {
        status2.setText(errorText(error));
      }
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var BatchImportModal = class extends import_obsidian2.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.cancelled = false;
    this.running = false;
  }
  onOpen() {
    this.contentEl.addClass("webnovel-import-modal");
    this.contentEl.createEl("h2", { text: "\u6279\u91CF\u5BFC\u5165\u4F5C\u54C1\u94FE\u63A5" });
    const route = this.plugin.importRoute();
    const independent = route.kind === "independent";
    this.contentEl.createEl("p", { text: independent ? "\u6BCF\u884C\u4E00\u4E2A\u4F5C\u54C1\u8BE6\u60C5\u9875\u94FE\u63A5\u3002\u76F8\u540C\u6765\u6E90\u81EA\u52A8\u53BB\u91CD\uFF1B\u5DF2\u5BFC\u5165\u7684\u4F5C\u54C1\u6309\u5B57\u6BB5\u4FDD\u62A4\u89C4\u5219\u66F4\u65B0\u3002" : "\u6BCF\u884C\u4E00\u4E2A\u4F5C\u54C1\u8BE6\u60C5\u9875\u3002\u83B7\u53D6\u540E\u9010\u6761\u6253\u5F00\u9884\u89C8\uFF0C\u6838\u5BF9\u540E\u4EA4\u7ED9 Media Core \u6216\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON\u3002" });
    if (route.kind === "unavailable") this.contentEl.createEl("p", { text: route.message });
    const input = this.contentEl.createEl("textarea", { cls: "webnovel-links-input", attr: { "aria-label": "\u4F5C\u54C1\u94FE\u63A5\u5217\u8868" } });
    const status2 = this.contentEl.createEl("p", { attr: { role: "status" } });
    const results = this.contentEl.createEl("ul", { cls: "webnovel-results" });
    const actions = new import_obsidian2.Setting(this.contentEl);
    let start;
    actions.addButton((button) => {
      start = button;
      button.setButtonText(independent ? "\u5F00\u59CB\u5BFC\u5165" : "\u6279\u91CF\u83B7\u53D6\u8D44\u6599").setCta().onClick(async () => {
        if (this.running) return;
        results.empty();
        const urls = /* @__PURE__ */ new Map();
        let invalidCount = 0;
        for (const line of input.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
          try {
            const ref = parseBookUrl(line);
            urls.set(sourceKey(ref), ref.url);
          } catch (error) {
            invalidCount++;
            results.createEl("li", { text: `${line}\uFF1A${errorText(error)}`, cls: "webnovel-error" });
          }
        }
        if (!urls.size) {
          status2.setText(`\u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u4F5C\u54C1\u94FE\u63A5\uFF1B\u65E0\u6548\u94FE\u63A5 ${invalidCount} \u6761\u3002`);
          return;
        }
        this.running = true;
        this.cancelled = false;
        start.setDisabled(true);
        input.disabled = true;
        let done = 0;
        let failures = 0;
        for (const url of urls.values()) {
          if (this.cancelled) break;
          status2.setText(`\u6B63\u5728\u5904\u7406 ${done + failures + 1}/${urls.size}\u2026`);
          try {
            const metadata = await this.plugin.importer.fetch(url);
            if (this.cancelled) break;
            if (independent) {
              const current = this.plugin.importRoute();
              if (current.kind === "unavailable") throw new Error(current.message);
              if (current.kind !== "independent") throw new Error("\u5BFC\u5165\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u6279\u91CF\u5BFC\u5165\u3002");
              const result = await this.plugin.importer.import(metadata);
              results.createEl("li", { text: `${result.created ? "\u65B0\u5EFA" : "\u66F4\u65B0"}\uFF1A${result.file.path}${result.warnings.length ? `\uFF08${result.warnings.join("\uFF1B")}\uFF09` : ""}` });
            } else {
              const item = results.createEl("li", { text: `${metadata.title} \xB7 ${providerName(metadata.provider)} ` });
              new import_obsidian2.ButtonComponent(item).setButtonText("\u9884\u89C8\u8D44\u6599").onClick(() => {
                new SingleImportModal(this.plugin, void 0, { metadata }).open();
              });
            }
            done++;
          } catch (error) {
            const item = results.createEl("li", { cls: "webnovel-error" });
            item.createSpan({ text: `${url}\uFF1A${errorText(error)} ` });
            new import_obsidian2.ButtonComponent(item).setButtonText("\u5355\u72EC\u5904\u7406").onClick(() => {
              new SingleImportModal(this.plugin, void 0, { url }).open();
            });
            failures++;
          }
          if (done + failures < urls.size && !this.cancelled) await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }
        status2.setText(`${this.cancelled ? "\u5DF2\u505C\u6B62" : "\u5DF2\u5B8C\u6210"}\uFF1A\u6210\u529F ${done}\uFF0C\u5931\u8D25 ${failures}\uFF0C\u65E0\u6548\u94FE\u63A5 ${invalidCount}\uFF0C\u672A\u5904\u7406 ${urls.size - done - failures}\u3002`);
        this.running = false;
        start.setDisabled(false);
        input.disabled = false;
      });
    });
    actions.addButton((button) => button.setButtonText("\u505C\u6B62\u540E\u7EED\u5BFC\u5165").onClick(() => {
      this.cancelled = true;
      status2.setText("\u5DF2\u8BF7\u6C42\u505C\u6B62\uFF0C\u5C06\u4FDD\u7559\u5DF2\u5B8C\u6210\u7684\u5BFC\u5165\u3002");
    }));
  }
  onClose() {
    this.cancelled = true;
    this.contentEl.empty();
  }
};

// src/browser-capture.ts
function browserCaptureBundle() {
  return '"use strict";var WebnovelBrowser=(()=>{var C=Object.defineProperty;var ae=Object.getOwnPropertyDescriptor;var se=Object.getOwnPropertyNames;var ce=Object.prototype.hasOwnProperty;var de=(t,r)=>{for(var e in r)C(t,e,{get:r[e],enumerable:!0})},ue=(t,r,e,o)=>{if(r&&typeof r=="object"||typeof r=="function")for(let n of se(r))!ce.call(t,n)&&n!==e&&C(t,n,{get:()=>r[n],enumerable:!(o=ae(r,n))||o.enumerable});return t};var pe=t=>ue(C({},"__esModule",{value:!0}),t);var we={};de(we,{capture:()=>ge,prepareSearchPage:()=>ne,readSearchWork:()=>ie});var d=t=>t?.replace(/\\u00a0/g," ").replace(/[\\t ]+/g," ").trim()||void 0;function c(t,r){return d(t.querySelector(r)?.textContent)}function k(t,r){let e=t.querySelector(r);if(!e)return;let o=e.cloneNode(!0);return o.querySelectorAll("br").forEach(n=>n.replaceWith(`\n`)),o.querySelectorAll("script, style").forEach(n=>n.remove()),d(o.textContent?.replace(/\\r\\n?/g,`\n`).replace(/[\\t ]*\\n[\\t ]*/g,`\n`))}function l(t,r){return d(t.querySelector(`meta[property="${r}"], meta[name="${r}"]`)?.getAttribute("content"))}function m(t,r){if(t?.trim())try{let e=new URL(t.trim(),r);return["http:","https:"].includes(e.protocol)&&!e.username&&!e.password?e.href:void 0}catch{return}}function g(t){if(t){if(/\u5B8C\u7ED3|\u5B8C\u672C|\u5DF2\u5B8C\u6210/.test(t))return"completed";if(/\u6682\u505C|\u505C\u66F4|\u65AD\u66F4/.test(t))return"paused";if(/\u8FDE\u8F7D/.test(t))return"ongoing"}}function y(t,r,e){let o=[],n=(i,a)=>{if(i)try{o.push({book:e(new URL(i,r.url).href),evidence:a})}catch{}};n(t.querySelector(\'link[rel="canonical"]\')?.getAttribute("href"),\'link[rel="canonical"]\');for(let i of["og:url","og:novel:book_url","og:novel:read_url"])n(l(t,i),`meta ${i}`);return{identities:o,addUrl:n}}function M(t,r){if(!t.length)throw new Error("\\u672A\\u8BC6\\u522B\\u5230\\u53EF\\u6838\\u5BF9\\u7684\\u4F5C\\u54C1\\u6807\\u8BC6\\uFF0C\\u4E0D\\u80FD\\u5C06\\u9875\\u9762\\u8D44\\u6599\\u7ED1\\u5B9A\\u5230\\u8F93\\u5165\\u94FE\\u63A5\\uFF1B\\u8BF7\\u63D0\\u4F9B\\u5B8C\\u6574\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\u6216\\u4F7F\\u7528\\u624B\\u52A8\\u5EFA\\u6863\\u3002");for(let{book:e}of t)if(e.provider!==r.provider||e.id!==r.id)throw new Error("\\u9875\\u9762\\u6807\\u8BC6\\u4E0E\\u8F93\\u5165\\u7684\\u4F5C\\u54C1\\u94FE\\u63A5\\u4E0D\\u4E00\\u81F4\\uFF0C\\u8BF7\\u6838\\u5BF9\\u94FE\\u63A5\\u548C HTML \\u6587\\u4EF6\\u3002");return t.map(e=>e.evidence).join("\\uFF1B")}var I={provider:"qidian",name:"\\u8D77\\u70B9\\u4E2D\\u6587\\u7F51",recoveryHint:"\\u8BF7\\u6B63\\u5E38\\u6253\\u5F00\\u4F5C\\u54C1\\u9875\\uFF0C\\u4F7F\\u7528\\u8BBE\\u7F6E\\u4E2D\\u7684\\u6D4F\\u89C8\\u5668\\u91C7\\u96C6\\u4E66\\u7B7E\\uFF0C\\u6216\\u9009\\u62E9\\u53E6\\u5B58\\u7684 HTML \\u6587\\u4EF6\\u3002",browserCapture:!0,matchUrl(t){let e=(t.hostname==="book.qidian.com"?/^\\/info\\/(\\d+)\\/?$/:["www.qidian.com","m.qidian.com"].includes(t.hostname)?/^\\/book\\/(\\d+)\\/?$/:void 0)?.exec(t.pathname)?.[1];return e?{provider:"qidian",id:e,url:`https://www.qidian.com/book/${e}/`}:void 0},identities(t,r,e){let{identities:o}=y(t,r,e),n=t.querySelector("#book-detail #bookImg")?.getAttribute("data-bid");return n&&/^\\d+$/.test(n)&&o.push({book:{...r,id:n},evidence:"#book-detail #bookImg[data-bid]"}),o},parse(t,r){let e={title:"",authors:[],evidence:{},warnings:[]},o=t.querySelector("#book-detail .book-info-top"),n=o?c(o,"#bookName"):void 0,i=o?d(c(o,".book-meta .author")?.replace(/^\u4F5C\u8005\\s*[\uFF1A:]\\s*/,"")):void 0;e.title=n||l(t,"og:novel:book_name")||"";let a=i||l(t,"og:novel:author");a&&(e.authors=[a]);let u=k(t,"#book-intro-detail");e.description=u||l(t,"og:novel:description")||l(t,"og:description");let s=t.querySelector("#book-detail #bookImg"),p=s?.getAttribute("data-bid")===r.id?m(s.querySelector("img")?.getAttribute("src"),r.url):void 0;e.cover_url=p||m(l(t,"og:image"),r.url);let w=o?Array.from(o.querySelectorAll(".book-attribute a")).map(v=>d(v.textContent)).filter(v=>!!v):[],q=l(t,"og:novel:category");w.length?e.tags=[...new Set(w)]:q&&(e.tags=[q]);let f=o?Array.from(o.querySelectorAll(".book-attribute span")).map(v=>g(d(v.textContent))).find(v=>v!==void 0):void 0;e.serialization_status=f||g(l(t,"og:novel:status"));let b=(o?Array.from(o.querySelectorAll(".count cite")).find(v=>d(v.textContent)==="\\u5B57"):void 0)?.previousElementSibling,L=b?.tagName.toLowerCase()==="em"&&d(b.textContent)?`${d(b.textContent)}\\u5B57`:void 0;e.word_count_text=L||l(t,"og:novel:word_count");let T=o?d(c(o,".book-meta .update-time")?.replace(/^\u66F4\u65B0\u65F6\u95F4\\s*[\uFF1A:]\\s*/,"")):void 0,P=o?d(c(o,".book-latest-chapter")?.replace(/^\u6700\u65B0\u7AE0\u8282\\s*[\uFF1A:]\\s*/,"")):void 0;return e.last_updated_at=T||l(t,"og:novel:update_time"),e.latest_chapter=P||l(t,"og:novel:latest_chapter_name"),e.evidence.title=n?"#book-detail .book-info-top #bookName":"meta og:novel:book_name",e.evidence.authors=i?"#book-detail .book-info-top .book-meta .author":"meta og:novel:author",e.description&&(e.evidence.description=u?"#book-intro-detail\\uFF1B\\u4FDD\\u7559br\\u6362\\u884C":"meta og:novel:description / og:description"),e.cover_url&&(e.evidence.cover_url=p?"#book-detail #bookImg[data-bid\\u4E0E\\u4F5C\\u54C1ID\\u4E00\\u81F4] img[src]":"meta og:image"),e.tags&&(e.evidence.tags=w.length?"#book-detail .book-info-top .book-attribute a":"meta og:novel:category"),e.serialization_status&&(e.evidence.serialization_status=f?"#book-detail .book-info-top .book-attribute span":"meta og:novel:status"),e.word_count_text&&(e.evidence.word_count_text=L?"#book-detail .book-info-top .count\\uFF1B\\u4EC5\\u53D6\\u5B57\\u6570\\uFF0C\\u4FDD\\u7559\\u663E\\u793A\\u7CBE\\u5EA6":"meta og:novel:word_count"),e.last_updated_at&&(e.evidence.last_updated_at=T?"#book-detail .book-info-top .update-time\\uFF1B\\u975E\\u9996\\u53D1\\u65E5\\u671F":"meta og:novel:update_time\\uFF1B\\u975E\\u9996\\u53D1\\u65E5\\u671F"),e.latest_chapter&&(e.evidence.latest_chapter=P?"#book-detail .book-info-top .book-latest-chapter":"meta og:novel:latest_chapter_name"),e}};function le(t,r,e){for(let n of Array.from(t.querySelectorAll(\'script[type="application/ld+json"]\'))){let i;try{let p=JSON.parse(n.textContent||"");if(!p||typeof p!="object"||Array.isArray(p))continue;i=p}catch{continue}if(typeof i["@id"]!="string")continue;let a;try{a=e(i["@id"])}catch{continue}if(a.provider!==r.provider||a.id!==r.id)continue;let u=i.images??i.image,s=Array.isArray(u)?u:[u];for(let p of s){if(typeof p!="string")continue;let w=m(p,r.url);if(w)return{url:w,evidence:"\\u4F5C\\u54C1\\u9875 JSON-LD images/image\\uFF0C@id \\u4E0E\\u4F5C\\u54C1\\u94FE\\u63A5\\u4E00\\u81F4"}}}let o=m(t.querySelector(".page-header-info .book-cover-img")?.getAttribute("src"),r.url);if(!(!o||new URL(o).pathname.includes("/novel-static/5cb03bd354145bc7815a5e09d4b15cfc")))return{url:o,evidence:"\\u4F5C\\u54C1\\u9875 .page-header-info .book-cover-img[src]\\uFF0C\\u5DF2\\u6392\\u9664\\u5DF2\\u77E5\\u52A0\\u8F7D\\u5360\\u4F4D\\u56FE"}}var z={provider:"fanqie",name:"\\u756A\\u8304\\u5C0F\\u8BF4",recoveryHint:"\\u53EF\\u5728\\u6D4F\\u89C8\\u5668\\u6B63\\u5E38\\u6253\\u5F00\\u540E\\u9009\\u62E9\\u53E6\\u5B58\\u7684 HTML \\u6587\\u4EF6\\uFF0C\\u6216\\u624B\\u52A8\\u8865\\u586B\\u3002",matchUrl(t){let r=t.hostname==="fanqienovel.com"?/^\\/page\\/(\\d+)\\/?$/.exec(t.pathname)?.[1]:void 0;return r?{provider:"fanqie",id:r,url:`https://fanqienovel.com/page/${r}`}:void 0},identities(t,r,e){let{identities:o,addUrl:n}=y(t,r,e);if(!o.length)for(let i of Array.from(t.querySelectorAll(\'script[type="application/ld+json"]\'))){let a;try{a=JSON.parse(i.textContent||"")}catch{continue}let u=Array.isArray(a)?a:[a];for(let s of u)s&&typeof s=="object"&&typeof s["@id"]=="string"&&n(s["@id"],"\\u4F5C\\u54C1\\u9875 JSON-LD \\u9876\\u5C42 @id")}return o},parse(t,r,e){let o={title:"",authors:[],evidence:{},warnings:[]},n=t.querySelector(".page-header-info");o.title=n&&c(n,".info-name h1")||"";let i=n&&c(n,".author-name-text");i&&(o.authors=[i]);let a=le(t,r,e);return a&&(o.cover_url=a.url,o.evidence.cover_url=a.evidence),n&&(o.tags=Array.from(n.querySelectorAll(".info-label-grey")).map(u=>d(u.textContent)).filter(u=>!!u),o.serialization_status=g(c(n,".info-label-yellow")),o.word_count_text=c(n,".info-count-word")?.replace(/\\s/g,""),o.last_updated_at=c(n,".info-last-time"),o.latest_chapter=c(n,".info-last-title")?.replace(/^\u6700\u8FD1\u66F4\u65B0\\s*[\uFF1A:]\\s*/,"")),o.description=c(t,".page-body .page-abstract-content"),o.evidence.title="\\u4F5C\\u54C1\\u9875 .page-header-info .info-name h1",o.evidence.authors="\\u4F5C\\u54C1\\u9875 .page-header-info .author-name-text",o.description&&(o.evidence.description="\\u4F5C\\u54C1\\u9875 .page-body .page-abstract-content"),o.tags?.length&&(o.evidence.tags="\\u4F5C\\u54C1\\u9875 .page-header-info .info-label-grey"),o.serialization_status&&(o.evidence.serialization_status="\\u4F5C\\u54C1\\u9875 .info-label-yellow"),o.word_count_text&&(o.evidence.word_count_text="\\u4F5C\\u54C1\\u9875 .info-count-word\\uFF1B\\u4FDD\\u7559\\u7F51\\u7AD9\\u663E\\u793A\\u7CBE\\u5EA6"),o.last_updated_at&&(o.evidence.last_updated_at="\\u4F5C\\u54C1\\u9875 .info-last-time\\uFF1B\\u5E73\\u53F0\\u539F\\u59CB\\u663E\\u793A\\u65F6\\u95F4\\uFF0C\\u975E\\u9996\\u53D1\\u65E5\\u671F"),o.latest_chapter&&(o.evidence.latest_chapter="\\u4F5C\\u54C1\\u9875 .info-last-title"),o}};var h=".book-information",F=".wrap-txt > .title > .txt",H=".sub-title .txt",R=".update-info .update-chapter-title a",N=".update-info .update-time",O=".book-introduction .intro",W={provider:"qimao",name:"\\u4E03\\u732B\\u4E2D\\u6587\\u7F51",recoveryHint:"\\u8BF7\\u6B63\\u5E38\\u6253\\u5F00\\u4F5C\\u54C1\\u9875\\uFF0C\\u4F7F\\u7528\\u6D4F\\u89C8\\u5668\\u91C7\\u96C6\\u4E66\\u7B7E\\uFF0C\\u6216\\u9009\\u62E9\\u53E6\\u5B58\\u7684 HTML \\u6587\\u4EF6\\u3002",browserCapture:!0,matchUrl(t){let r=t.hostname==="www.qimao.com"?/^\\/shuku\\/(\\d+)\\/?$/.exec(t.pathname)?.[1]:void 0;return r?{provider:"qimao",id:r,url:`https://www.qimao.com/shuku/${r}/`}:void 0},identities(t,r,e){let{identities:o,addUrl:n}=y(t,r,e),i=t.querySelector(`${h} ${R}`)?.getAttribute("href");if(i)try{let a=new URL(i,r.url),u=/^\\/shuku\\/(\\d+)-\\d+\\/?$/.exec(a.pathname);u&&(a.pathname=`/shuku/${u[1]}/`,n(a.href,`${h} ${R}[href] \\u7684\\u4F5C\\u54C1 ID`))}catch{}return o},parse(t,r){let e={title:"",authors:[],evidence:{},warnings:[]},o=t.querySelector(h);if(!o)return e;e.title=c(o,F)||"";let n=Array.from(o.querySelectorAll(H)).find(s=>/^\u4F5C\u8005\\s*[\uFF1A:]/.test(d(s.textContent)??"")),i=n&&c(n,"em a");i&&(e.authors=[i]),e.description=k(t,O);let a=m(o.querySelector(".wrap-pic > img")?.getAttribute("src"),r.url);a&&/^https?:\\/\\/cdn\\.qimao\\.com\\/bookimg\\/[^?#]*\\/readerCover\\//.test(a)&&(e.cover_url=a);let u=Array.from(o.querySelectorAll(\'.tags-wrap a[href*="/shuku/a-"]\')).map(s=>d(s.textContent)).filter(s=>!!s);return u.length&&(e.tags=[...new Set(u)]),e.serialization_status=Array.from(o.querySelectorAll(".tags-wrap > .qm-tag")).map(s=>g(d(s.textContent))).find(s=>s!==void 0),e.word_count_text=Array.from(o.querySelectorAll(".statistics-wrap > .txt")).map(s=>d(s.textContent)?.replace(/\\s/g,"")).find(s=>s&&/^\\d[\\d,.]*(?:\u4E07|\u4EBF)?\u5B57$/.test(s)),e.last_updated_at=c(o,N),e.latest_chapter=c(o,R),e.evidence.title=`${h} ${F}`,e.evidence.authors=`${h} ${H}\\uFF08\\u4F5C\\u8005\\u6807\\u7B7E\\uFF09 em a`,e.description&&(e.evidence.description=O),e.cover_url&&(e.evidence.cover_url=`${h} .wrap-pic > img[src]\\uFF0C\\u4F5C\\u54C1\\u5C01\\u9762\\u8DEF\\u5F84`),e.tags&&(e.evidence.tags=`${h} .tags-wrap \\u5185\\u4E66\\u5E93\\u5206\\u7C7B\\u94FE\\u63A5`),e.serialization_status&&(e.evidence.serialization_status=`${h} .tags-wrap > .qm-tag`),e.word_count_text&&(e.evidence.word_count_text=`${h} .statistics-wrap > .txt\\uFF08\\u5B57\\u6570\\uFF09`),e.last_updated_at&&(e.evidence.last_updated_at=`${h} ${N}\\uFF08\\u6700\\u65B0\\u7AE0\\u8282\\u65F6\\u95F4\\uFF09`),e.latest_chapter&&(e.evidence.latest_chapter=`${h} ${R}`),e}};var J=\'td.readtd a[href*="m.jjwxc.net/book2/"]\',A="body > div.b.module > h2.big > span.uninterested-author[data-novelid]",x="#info #left",K=\'td.sptd h1[itemprop="name"] [itemprop="articleSection"]\',G=\'td.sptd h2 [itemprop="author"]\',X=\'tr[itemprop~="newestChapter"]\',V=`${X} [itemprop="headline"] a[itemprop="url"]`,Q=`${X} td[title*="\\u7AE0\\u8282\\u9996\\u53D1\\u65F6\\u95F4"]`,Y=\'img.noveldefaultimage[itemprop="image"]\';function j(t){return t&&/^\\d{4}-\\d{2}-\\d{2}(?: \\d{2}:\\d{2}:\\d{2})?$/.test(t)?t:void 0}function fe(t,r){let e=t.querySelector(Y),o=m(e?.getAttribute("src"),r.url),n=m(e?.getAttribute("_src"),r.url);if(!o||!n||o===n)return;let i=new URL(n),a=new URL(o);if(!(!/^i\\d+-static\\.jjwxc\\.net$/.test(i.hostname)||i.pathname!=="/novelimage.php"||i.searchParams.get("novelid")!==r.id||!/^i\\d+-static\\.jjwxc\\.net$/.test(a.hostname))&&(a.pathname==="/authorimagespace.php"||a.pathname.startsWith("/tmp/backend/authorspace/")))return o}function Z(t,r,e,o){let n=[r,...Array.from(e,i=>d(i.textContent))].filter(i=>!!i);n.length&&(t.tags=[...new Set(n)],t.evidence.tags=o)}function me(t,r,e){let o=\'#novelintro[itemprop="description"]\',n=".smallreadbody",i=\'body > meta[itemprop="dateModified"]\';e.title=c(t,K)||"";let a=c(t,G);a&&(e.authors=[a]),e.cover_url=fe(t,r),e.description=k(t,o),e.serialization_status=g(c(t,\'[itemprop="updataStatus"]\')),e.word_count_text=c(t,\'[itemprop="wordCount"]\'),e.latest_chapter=c(t,V);let u=e.latest_chapter&&j(c(t,Q)?.replace(/\\s*\\*\u6700\u65B0\u66F4\u65B0$/,""));e.last_updated_at=u||j(d(t.querySelector(i)?.getAttribute("content"))),Z(e,c(t,\'[itemprop="genre"]\'),t.querySelectorAll(`${n} a[href*="bookbase.php?bq="]`),"\\u4F5C\\u54C1\\u9875 [itemprop=genre] \\u53CA .smallreadbody \\u5185\\u5BB9\\u6807\\u7B7E\\u94FE\\u63A5"),e.evidence.title=K,e.evidence.authors=G,e.cover_url&&(e.evidence.cover_url=`${Y}[src]\\uFF0C\\u6709\\u522B\\u4E8E\\u672C\\u4E66\\u9ED8\\u8BA4\\u5C01\\u9762 _src`),e.description&&(e.evidence.description=o),e.serialization_status&&(e.evidence.serialization_status="\\u4F5C\\u54C1\\u9875 [itemprop=updataStatus]"),e.word_count_text&&(e.evidence.word_count_text="\\u4F5C\\u54C1\\u9875 [itemprop=wordCount]"),e.latest_chapter&&(e.evidence.latest_chapter=V),e.last_updated_at&&(e.evidence.last_updated_at=u?`${Q} \\u7684\\u53EF\\u89C1\\u66F4\\u65B0\\u65F6\\u95F4`:`${i}[content]\\uFF08\\u4F5C\\u54C1\\u66F4\\u65B0\\u65F6\\u95F4\\uFF09`)}function he(t,r,e){let o=`${x} .authorname-content > a[href^="/wapauthor/"]`,n="li#novelintro",i=`${n} #novelintro_whole`,a=Array.from(t.querySelectorAll(`${x} > li`)),u=f=>a.map(S=>d(S.textContent)).find(S=>S?.startsWith(`${f}\\uFF1A`))?.slice(f.length+1).trim();e.title=d(r.getAttribute("data-novelname"))||"";let s=c(t,o),p=s||d(r.getAttribute("data-authorname"));if(p&&(e.authors=[p]),e.description=k(t,i),e.description)e.evidence.description=i;else if(!t.querySelector(i)){let f=t.querySelector(n)?.childNodes,S=Array.from(f??[],b=>b.nodeType===3?b.textContent?.replace(/\\s+/g," "):b.nodeName==="BR"?`\n`:"").join("");e.description=d(S.replace(/^\\s*\u7B80\u4ECB\\s*[\uFF1A:]\\s*/,"").replace(/ *\\n */g,`\n`)),e.description&&(e.evidence.description=`${n} \\u7684\\u76F4\\u63A5\\u6587\\u672C\\u4E0E br`)}let w=u("\\u72B6\\u6001");e.serialization_status=g(w),e.word_count_text=w?.split("/").map(f=>f.trim()).find(f=>/^\\d+\u5B57$/.test(f));let q=t.querySelector(\'meta[name="description"]\')?.getAttribute("content");e.last_updated_at=j(q?.match(/\\|\u6700\u65B0\u66F4\u65B0\\s*[\uFF1A:]\\s*([^|]+)\\|/)?.[1].trim()),Z(e,u("\\u7C7B\\u578B"),t.querySelectorAll(`${x} > li a[href^="/assort/"]`),"\\u79FB\\u52A8\\u4F5C\\u54C1\\u9875\\u7C7B\\u578B\\u53CA\\u5185\\u5BB9\\u6807\\u7B7E\\u94FE\\u63A5"),e.evidence.title=`${A}[data-novelname]`,e.evidence.authors=s?o:`${A}[data-authorname]`,e.serialization_status&&(e.evidence.serialization_status=`${x} \\u72B6\\u6001`),e.word_count_text&&(e.evidence.word_count_text=`${x} \\u72B6\\u6001\\u4E2D\\u7684\\u5B57\\u6570`),e.last_updated_at&&(e.evidence.last_updated_at=\'meta[name="description"] \\u7684\\u6700\\u65B0\\u66F4\\u65B0\\uFF08\\u4F5C\\u54C1\\u66F4\\u65B0\\u65F6\\u95F4\\uFF09\')}var ee={provider:"jjwxc",name:"\\u664B\\u6C5F\\u6587\\u5B66\\u57CE",recoveryHint:"\\u8BF7\\u6B63\\u5E38\\u6253\\u5F00\\u684C\\u9762\\u6216\\u79FB\\u52A8\\u4F5C\\u54C1\\u9875\\uFF0C\\u4F7F\\u7528\\u6D4F\\u89C8\\u5668\\u91C7\\u96C6\\u4E66\\u7B7E\\uFF0C\\u6216\\u9009\\u62E9\\u53E6\\u5B58\\u7684 HTML \\u6587\\u4EF6\\u3002",browserCapture:!0,matchUrl(t){let r;if(t.hostname==="www.jjwxc.net"&&t.pathname==="/onebook.php"&&!t.searchParams.has("chapterid")){let e=t.searchParams.getAll("novelid");e.length===1&&/^\\d+$/.test(e[0])&&(r=e[0])}return t.hostname==="m.jjwxc.net"&&(r=/^\\/book2\\/(\\d+)\\/?$/.exec(t.pathname)?.[1]),r?{provider:"jjwxc",id:r,url:`https://www.jjwxc.net/onebook.php?novelid=${r}`}:void 0},identities(t,r,e){let{identities:o,addUrl:n}=y(t,r,e);n(t.querySelector(J)?.getAttribute("href"),`${J}[href]`);let i=t.querySelector(A)?.getAttribute("data-novelid");return i&&/^\\d+$/.test(i)&&o.push({book:{...r,id:i},evidence:`${A}[data-novelid]`}),o},parse(t,r){let e={title:"",authors:[],evidence:{},warnings:[]},o=t.querySelector(A);return o?he(t,o,e):me(t,r,e),e}};var E=[I,z,W,ee];function $(t){let r=E.find(e=>e.provider===t);if(!r)throw new Error(`\\u4E0D\\u652F\\u6301\\u7684\\u4F5C\\u54C1\\u6765\\u6E90\\uFF1A${t}`);return r}function _(t){let r;try{r=new URL(t.trim())}catch{throw new Error("\\u8BF7\\u8F93\\u5165\\u5B8C\\u6574\\u7684\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\u94FE\\u63A5\\u3002")}if(!["https:","http:"].includes(r.protocol)||r.username||r.password||r.port)throw new Error("\\u4F5C\\u54C1\\u94FE\\u63A5\\u5FC5\\u987B\\u662F\\u666E\\u901A\\u7684 HTTP \\u6216 HTTPS \\u5B98\\u7F51\\u94FE\\u63A5\\u3002");for(let e of E){let o=e.matchUrl(r);if(o)return o}throw new Error(`\\u4EC5\\u652F\\u6301${E.map(e=>e.name).join("\\u3001")}\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\uFF1B\\u8BF7\\u52FF\\u4F7F\\u7528\\u7AE0\\u8282\\u6216\\u641C\\u7D22\\u9875\\u94FE\\u63A5\\u3002`)}function U(t,r,e){let o=$(r.provider),n=M(o.identities(t,r,_),r),i=o.parse(t,r,_),a={...i,...r,fetched_at:new Date().toISOString(),acquisition:e,evidence:{identity:n,...i.evidence}};if(!a.title||a.authors.length===0)throw new Error("\\u672A\\u8BC6\\u522B\\u5230\\u53EF\\u9760\\u7684\\u4E66\\u540D\\u548C\\u4F5C\\u8005\\u3002\\u9875\\u9762\\u53EF\\u80FD\\u662F\\u9A8C\\u8BC1\\u9875\\u3001\\u767B\\u5F55\\u9875\\u6216\\u7ED3\\u6784\\u5DF2\\u53D8\\u5316\\uFF1B\\u8BF7\\u5728\\u6D4F\\u89C8\\u5668\\u786E\\u8BA4\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\uFF0C\\u6216\\u4F7F\\u7528\\u624B\\u52A8\\u5EFA\\u6863\\u3002");return a.cover_url||a.warnings.push("\\u672A\\u63D0\\u53D6\\u5230\\u53EF\\u7528\\u5C01\\u9762\\u5730\\u5740\\uFF0C\\u53EF\\u7A0D\\u540E\\u624B\\u52A8\\u8865\\u5145\\u3002"),a.description||a.warnings.push("\\u672A\\u63D0\\u53D6\\u5230\\u4F5C\\u54C1\\u7B80\\u4ECB\\uFF0C\\u53EF\\u7A0D\\u540E\\u624B\\u52A8\\u8865\\u5145\\u3002"),!a.first_published_year&&!a.first_published_at&&a.warnings.push("\\u672A\\u83B7\\u5F97\\u660E\\u786E\\u7684\\u9996\\u53D1\\u65E5\\u671F\\uFF0C\\u9996\\u53D1\\u5E74\\u4EFD\\u7559\\u7A7A\\uFF1B\\u4E0D\\u4F1A\\u7528\\u6700\\u8FD1\\u66F4\\u65B0\\u65F6\\u95F4\\u63A8\\u65AD\\u5E74\\u4EFD\\u3002"),a}function te(t){return JSON.stringify({format:"webnovel-import-capture",version:1,metadata:t})}function B(t,r){let e;try{e=new URL(r)}catch{return!1}if(e.protocol!=="https:"||e.username||e.password||e.port)return!1;switch(t){case"qidian":return e.hostname==="www.qidian.com"&&e.pathname.startsWith("/so/");case"fanqie":return e.hostname==="fanqienovel.com"&&(e.pathname.startsWith("/search/")||e.pathname==="/");case"qimao":return e.hostname==="www.qimao.com"&&/^\\/search\\/index\\/?$/.test(e.pathname);case"jjwxc":return["my.jjwxc.net","www.jjwxc.net"].includes(e.hostname)&&e.pathname==="/search.php"}}var D=t=>`${t.provider}:${t.id}`;var re=Symbol.for("webnovel-import.search-result-handler");function oe(t,r){try{let e=_(new URL(r,location.href).href);if(e.provider===t)return e.url}catch{}}function ne(t,r){if(B(t,location.href)){if(t==="jjwxc"){let e=document.querySelector("form#formleft"),o=e?.querySelector(\'input#autoComplete[name="kw"]\');e&&o&&(e.target="_self",o.value||(o.value=r))}if(!Reflect.get(window,re)){if(Reflect.set(window,re,!0),t==="fanqie"){let e=window.open.bind(window);window.open=(o,n,i)=>{let a=o&&navigator.userActivation?.isActive&&B(t,location.href)?oe(t,o):void 0;return a?(location.assign(a),null):e(o,n,i)}}window.addEventListener("click",e=>{if(!e.isTrusted||e.button!==0||!B(t,location.href))return;let o=e.target instanceof Element?e.target.closest("a[href]"):null;if(!o)return;let n=oe(t,o.href);n&&(e.preventDefault(),e.stopImmediatePropagation(),location.assign(n))},{capture:!0})}}}function ie(t){try{let r=_(location.href);if(D(r)!==D(_(t)))throw new Error("\\u4F5C\\u54C1\\u9875\\u5DF2\\u5207\\u6362\\uFF0C\\u8BF7\\u91CD\\u65B0\\u9009\\u4E2D\\u4F5C\\u54C1\\u3002");return{metadata:U(document,r,"browser")}}catch(r){return{error:r instanceof Error?r.message:"\\u4F5C\\u54C1\\u8D44\\u6599\\u6682\\u65F6\\u65E0\\u6CD5\\u8BFB\\u53D6\\u3002"}}}async function ge(t){try{let r=_(location.href);if(!$(r.provider).browserCapture)throw new Error("\\u6B64\\u5E73\\u53F0\\u53EF\\u4ECE Obsidian \\u7684\\u94FE\\u63A5\\u6216 HTML \\u5165\\u53E3\\u5BFC\\u5165\\u3002");let o=U(document,r,"browser"),n=te(o);try{await navigator.clipboard.writeText(n)}catch{if(window.prompt("\\u6D4F\\u89C8\\u5668\\u672A\\u5141\\u8BB8\\u76F4\\u63A5\\u590D\\u5236\\u3002\\u8BF7\\u590D\\u5236\\u4E0B\\u65B9\\u5B8C\\u6574\\u8D44\\u6599\\uFF0C\\u518D\\u6309\\u786E\\u5B9A\\u8FD4\\u56DE Obsidian\\uFF1B\\u53D6\\u6D88\\u5219\\u505C\\u6B62\\u3002",n)===null)return}let i=new URLSearchParams({vault:t,clipboard:"1",provider:r.provider,id:r.id,capturedAt:o.fetched_at}).toString().replace(/\\+/g,"%20");location.assign(`obsidian://webnovel-import?${i}`)}catch(r){window.alert(`\\u7F51\\u6587\\u8D44\\u6599\\u5C1A\\u672A\\u91C7\\u96C6\\uFF1A${r instanceof Error?r.message:String(r)}`)}}return pe(we);})();\n';
}
function makeBookmarklet(vault) {
  const script = `void(function(){${browserCaptureBundle()};WebnovelBrowser.capture(${JSON.stringify(vault)});})()`;
  return `javascript:${encodeURIComponent(script)}`;
}
function parseCapturePayload(raw, expected) {
  let packet;
  try {
    packet = JSON.parse(raw);
  } catch {
    throw new Error("\u526A\u8D34\u677F\u4E0D\u662F\u7F51\u6587\u91C7\u96C6\u7ED3\u679C\u3002\u8BF7\u5728\u652F\u6301\u91C7\u96C6\u7684\u4F5C\u54C1\u8BE6\u60C5\u9875\u70B9\u51FB\u91C7\u96C6\u4E66\u7B7E\u3002");
  }
  if (packet?.format !== "webnovel-import-capture" || packet.version !== 1 || !packet.metadata) {
    throw new Error("\u672A\u8BC6\u522B\u7684\u6D4F\u89C8\u5668\u91C7\u96C6\u683C\u5F0F\uFF0C\u8BF7\u4F7F\u7528\u5F53\u524D\u7248\u672C\u63D0\u4F9B\u7684\u91C7\u96C6\u4E66\u7B7E\u3002");
  }
  const result = parseCapturedMetadata(packet.metadata);
  if (!getSourceAdapter(result.provider).browserCapture) {
    throw new Error("\u91C7\u96C6\u8D44\u6599\u7684\u4F5C\u54C1\u6807\u8BC6\u4E0D\u4E00\u81F4\uFF0C\u6216\u8BE5\u5E73\u53F0\u6682\u4E0D\u652F\u6301\u4E66\u7B7E\u91C7\u96C6\u3002\u8BF7\u6838\u5BF9\u4F5C\u54C1\u8BE6\u60C5\u9875\u3002");
  }
  if (expected && (result.provider !== expected.provider || result.id !== expected.id || expected.capturedAt !== void 0 && result.fetched_at !== expected.capturedAt)) {
    throw new Error("\u526A\u8D34\u677F\u5185\u5BB9\u4E0E\u521A\u91C7\u96C6\u7684\u8D44\u6599\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u8BE5\u4F5C\u54C1\u7684\u91C7\u96C6\u4E66\u7B7E\u3002");
  }
  result.evidence.acquisition = "\u7528\u6237\u5728\u6B63\u5E38\u663E\u793A\u7684\u4F5C\u54C1\u9875\u70B9\u51FB\u91C7\u96C6\u4E66\u7B7E\uFF0C\u7ECF\u672C\u673A\u526A\u8D34\u677F\u5BFC\u5165";
  return result;
}
function parseCapturedMetadata(data, expected) {
  if (!data || typeof data !== "object") throw new Error("\u6CA1\u6709\u6536\u5230\u53EF\u7528\u7684\u4F5C\u54C1\u8D44\u6599\u3002");
  const value = data;
  const ref = parseBookUrl(typeof value.url === "string" ? value.url : "");
  if (value.provider !== ref.provider || value.id !== ref.id || value.acquisition !== "browser" || expected && (ref.provider !== expected.provider || ref.id !== expected.id)) {
    throw new Error("\u91C7\u96C6\u8D44\u6599\u7684\u4F5C\u54C1\u6807\u8BC6\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u6838\u5BF9\u4F5C\u54C1\u8BE6\u60C5\u9875\u3002");
  }
  if (typeof value.title !== "string" || !value.title.trim() || !Array.isArray(value.authors) || !value.authors.length || !value.authors.every((s) => typeof s === "string" && s.trim())) {
    throw new Error("\u91C7\u96C6\u8D44\u6599\u7F3A\u5C11\u6709\u6548\u4E66\u540D\u6216\u4F5C\u8005\uFF0C\u8BF7\u7B49\u5F85\u4F5C\u54C1\u8BE6\u60C5\u9875\u6B63\u5E38\u663E\u793A\u540E\u91CD\u8BD5\u3002");
  }
  if (typeof value.fetched_at !== "string" || !Number.isFinite(Date.parse(value.fetched_at))) {
    throw new Error("\u91C7\u96C6\u8D44\u6599\u7F3A\u5C11\u6709\u6548\u83B7\u53D6\u65F6\u95F4\uFF0C\u8BF7\u91CD\u65B0\u91C7\u96C6\u3002");
  }
  const result = {
    ...ref,
    title: value.title.trim(),
    authors: value.authors.map((s) => s.trim()),
    acquisition: "browser",
    fetched_at: value.fetched_at,
    evidence: {},
    warnings: []
  };
  for (const key of ["description", "word_count_text", "last_updated_at", "latest_chapter"]) {
    if (typeof value[key] === "string" && value[key].trim()) result[key] = value[key].trim();
  }
  if (typeof value.cover_url === "string" && value.cover_url.trim()) {
    const url = new URL(value.cover_url, ref.url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("\u91C7\u96C6\u8D44\u6599\u4E2D\u7684\u5C01\u9762\u5730\u5740\u65E0\u6548\u3002");
    }
    result.cover_url = url.href;
  }
  if (Array.isArray(value.tags) && value.tags.every((s) => typeof s === "string")) result.tags = value.tags;
  if (value.serialization_status === "ongoing" || value.serialization_status === "completed" || value.serialization_status === "paused" || value.serialization_status === "unknown") {
    result.serialization_status = value.serialization_status;
  }
  for (const key of ["identity", "title", "authors", "description", "cover_url", "tags", "serialization_status", "word_count_text", "last_updated_at", "latest_chapter"]) {
    const evidence = value.evidence?.[key];
    if (typeof evidence === "string") result.evidence[key] = evidence;
  }
  result.warnings = [
    "\u6D4F\u89C8\u5668\u9875\u9762\u91C7\u96C6\uFF1B\u4E0D\u4EE3\u8868\u666E\u901A HTTP \u81EA\u52A8\u5237\u65B0\u5DF2\u53EF\u7528\u3002",
    "\u672A\u83B7\u5F97\u660E\u786E\u7684\u4F5C\u54C1\u9996\u53D1\u65E5\u671F\uFF0C\u9996\u53D1\u5E74\u4EFD\u7559\u7A7A\uFF1B\u4E0D\u4F1A\u7528\u6700\u8FD1\u66F4\u65B0\u65F6\u95F4\u6216\u7AE0\u8282\u65E5\u671F\u63A8\u65AD\u5E74\u4EFD\u3002"
  ];
  if (!result.cover_url) result.warnings.push("\u672A\u63D0\u53D6\u5230\u53EF\u7528\u5C01\u9762\u5730\u5740\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  if (!result.description) result.warnings.push("\u672A\u63D0\u53D6\u5230\u4F5C\u54C1\u7B80\u4ECB\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  return result;
}

// src/manual-ui.ts
var import_obsidian3 = require("obsidian");
var names = (value) => value.split(/[,，、]/).map((name) => name.trim()).filter(Boolean);
var ManualWorkModal = class extends import_obsidian3.Modal {
  constructor(plugin, title = "") {
    super(plugin.app);
    this.plugin = plugin;
    this.publication = "";
    this.submitting = false;
    this.draft = { title };
  }
  onOpen() {
    var _a;
    const form = this.contentEl;
    form.addClass("webnovel-import-modal");
    form.createEl("h2", { text: "\u624B\u52A8\u6DFB\u52A0\u7F51\u6587\u4F5C\u54C1" });
    form.createEl("p", { text: "\u53EA\u9700\u586B\u5199\u4E66\u540D\u3002\u65E5\u540E\u627E\u5230\u53EF\u4FE1\u7684\u4F5C\u54C1\u8D44\u6599\uFF0C\u53EF\u4EE5\u4E3A\u8FD9\u6761 Work \u8865\u5145\u6765\u6E90\u3002" });
    let updateMatches = () => {
    };
    new import_obsidian3.Setting(form).setName("\u4E66\u540D").addText((text2) => {
      text2.setValue(this.draft.title).onChange((value) => {
        this.draft.title = value;
        updateMatches();
      });
      text2.inputEl.required = true;
      text2.inputEl.setAttribute("aria-label", "\u4E66\u540D");
    });
    new import_obsidian3.Setting(form).setName("\u4F5C\u8005").setDesc("\u591A\u4F4D\u4F5C\u8005\u7528\u9017\u53F7\u5206\u9694\u3002").addText((text2) => text2.setValue(this.draft.authors?.join("\uFF0C") ?? "").onChange((value) => {
      this.draft.authors = names(value);
      updateMatches();
    }));
    new import_obsidian3.Setting(form).setName("\u7B80\u4ECB").addTextArea((text2) => {
      text2.setValue(this.draft.summary ?? "").onChange((value) => {
        this.draft.summary = value;
      });
      text2.inputEl.rows = 4;
    });
    new import_obsidian3.Setting(form).setName("\u5C01\u9762").setDesc("\u53EF\u586B Vault \u5185\u56FE\u7247\u8DEF\u5F84\u6216 HTTP(S) \u56FE\u7247\u94FE\u63A5\u3002").addText((text2) => text2.setValue(this.draft.cover ?? "").onChange((value) => {
      this.draft.cover = value;
    }));
    new import_obsidian3.Setting(form).setName("\u9996\u53D1\u5E74\u4EFD\u6216\u65E5\u671F").addText((text2) => text2.setValue(this.publication).setPlaceholder("YYYY \u6216 YYYY-MM-DD").onChange((value) => {
      this.publication = value.trim();
    }));
    new import_obsidian3.Setting(form).setName("\u539F\u4F5C\u72B6\u6001").addDropdown((dropdown) => dropdown.addOptions({ "": "\u672A\u77E5\uFF08\u7559\u7A7A\uFF09", ongoing: "\u8FDE\u8F7D\u4E2D", completed: "\u5DF2\u5B8C\u7ED3", paused: "\u6682\u505C" }).setValue(this.draft.serialization_status ?? "").onChange((value) => {
      this.draft.serialization_status = value || void 0;
    }));
    new import_obsidian3.Setting(form).setName("\u5B57\u6570").addText((text2) => text2.setValue(this.draft.word_count_text ?? "").setPlaceholder("\u4F8B\u5982 120 \u4E07\u5B57").onChange((value) => {
      this.draft.word_count_text = value;
    }));
    new import_obsidian3.Setting(form).setName("\u5206\u7C7B").setDesc("\u591A\u9879\u7528\u9017\u53F7\u5206\u9694\u3002").addText((text2) => text2.setValue(this.draft.tags?.join("\uFF0C") ?? "").onChange((value) => {
      this.draft.tags = names(value);
    }));
    const reference = (_a = this.draft).reference ?? (_a.reference = {});
    const details = form.createEl("details");
    details.createEl("summary", { text: "\u5386\u53F2\u5E73\u53F0\u3001\u94FE\u63A5\u548C\u8D44\u6599\u5907\u6CE8" });
    details.createEl("p", { text: "\u5386\u53F2\u8D44\u6599\u4EC5\u4F5C\u672C\u5730\u53C2\u8003\uFF0C\u53EF\u4EE5\u4FDD\u7559\u5DF2\u5931\u6548\u7684\u94FE\u63A5\u3002", cls: "setting-item-description" });
    new import_obsidian3.Setting(details).setName("\u5386\u53F2\u53D1\u5E03\u5E73\u53F0").addText((text2) => text2.setValue(reference.platform ?? "").onChange((value) => {
      reference.platform = value;
    }));
    new import_obsidian3.Setting(details).setName("\u5386\u53F2\u4F5C\u54C1\u94FE\u63A5").addText((text2) => text2.setValue(reference.url ?? "").onChange((value) => {
      reference.url = value;
    }));
    new import_obsidian3.Setting(details).setName("\u8D44\u6599\u51FA\u5904\u6216\u5907\u6CE8").addTextArea((text2) => text2.setValue(reference.note ?? "").onChange((value) => {
      reference.note = value;
    }));
    const actions = form.createDiv();
    const status2 = form.createEl("p", { cls: "webnovel-status", attr: { role: "status" } });
    const routeNow = () => resolveManualWorkRoute(this.app, this.plugin.settings.importMode);
    const renderActions = () => {
      actions.empty();
      const route = routeNow();
      const description = route.kind === "core" ? "\u5728 Media Core \u4E2D\u68C0\u67E5\u5DF2\u6709\u4F5C\u54C1\u548C\u5F85\u4FDD\u5B58\u5B57\u6BB5\uFF0C\u7136\u540E\u786E\u8BA4\u3002" : route.message ?? "\u5728\u5F53\u524D Vault \u4E2D\u521B\u5EFA\u72EC\u7ACB Markdown Work\u3002";
      actions.createEl("p", { text: description, cls: "setting-item-description" });
      const matches = actions.createDiv({ cls: "webnovel-matches" });
      let candidates = [];
      let selected = "";
      let submit;
      const updateSubmit = () => {
        submit.setDisabled(this.submitting || candidates.length > 0 && !selected);
        submit.setButtonText(route.kind === "core" ? "\u5728 Media Core \u9884\u89C8" : selected && selected !== "new" ? "\u6253\u5F00\u5DF2\u6709\u4F5C\u54C1" : "\u786E\u8BA4\u521B\u5EFA\u72EC\u7ACB\u4F5C\u54C1");
      };
      new import_obsidian3.Setting(actions).addButton((button) => {
        submit = button.setCta().onClick(async () => {
          if (this.submitting) return;
          const current = routeNow();
          if (current.kind !== route.kind || current.kind === "independent" && route.kind === "independent" && current.message !== route.message) {
            status2.setText("Media Core \u7684\u53EF\u7528\u72B6\u6001\u5DF2\u53D8\u5316\uFF0C\u8BF7\u6838\u5BF9\u4FDD\u5B58\u65B9\u5F0F\u3002");
            renderActions();
            return;
          }
          this.submitting = true;
          updateSubmit();
          try {
            if (current.kind === "independent" && selected && selected !== "new") {
              const existing = candidates[Number(selected)];
              if (this.app.vault.getAbstractFileByPath(existing.path) !== existing) throw new Error("\u9009\u4E2D\u7684\u4F5C\u54C1\u5DF2\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002");
              await this.app.workspace.getLeaf(false).openFile(existing);
            } else {
              const draft = this.readDraft();
              if (current.kind === "core") {
                await current.openPreview(draft, { onAccepted: () => this.close() });
                return;
              } else {
                const file = await this.plugin.importer.createManual(draft, { createSeparate: selected === "new" });
                new import_obsidian3.Notice(`\u5DF2\u521B\u5EFA\uFF1A${file.basename}`);
                await this.app.workspace.getLeaf(false).openFile(file);
              }
            }
            this.close();
          } catch (error) {
            status2.setText(error instanceof Error ? error.message : String(error));
            updateMatches();
          } finally {
            this.submitting = false;
            updateSubmit();
          }
        });
      });
      updateMatches = () => {
        matches.empty();
        selected = "";
        candidates = route.kind === "independent" ? this.plugin.importer.previewManualMatches(this.draft) : [];
        if (candidates.length) {
          new import_obsidian3.Setting(matches).setName("\u53D1\u73B0\u53EF\u80FD\u5DF2\u5B58\u5728\u7684\u4F5C\u54C1").setDesc("\u53EF\u6253\u5F00\u5DF2\u6709\u4F5C\u54C1\u6838\u5BF9\uFF0C\u6216\u786E\u8BA4\u53E6\u5EFA\u4E00\u6761\u8BB0\u5F55\u3002\u6253\u5F00\u5DF2\u6709\u4F5C\u54C1\u65F6\u4FDD\u7559\u539F\u5B57\u6BB5\u548C\u6B63\u6587\u3002").addDropdown((dropdown) => {
            dropdown.addOption("", "\u8BF7\u9009\u62E9");
            candidates.forEach((file, index) => dropdown.addOption(String(index), file.path));
            dropdown.addOption("new", "\u72EC\u7ACB\u521B\u5EFA\u4F5C\u54C1");
            dropdown.onChange((value) => {
              selected = value;
              updateSubmit();
            });
          });
        }
        updateSubmit();
      };
      updateMatches();
    };
    renderActions();
  }
  readDraft() {
    const year = /^\d{4}$/.test(this.publication);
    return this.plugin.importer.prepareManual({
      ...this.draft,
      first_published_year: year ? Number(this.publication) : void 0,
      first_published_at: this.publication && !year ? this.publication : void 0
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/search-ui.ts
var import_obsidian4 = require("obsidian");

// src/search.ts
var searchProviders = {
  qidian: { name: "\u8D77\u70B9\u4E2D\u6587\u7F51", hint: "\u6309\u4E66\u540D\u6216\u4F5C\u8005\u641C\u7D22\u3002" },
  fanqie: { name: "\u756A\u8304\u5C0F\u8BF4", hint: "\u6309\u4E66\u540D\u6216\u4F5C\u8005\u641C\u7D22\u3002" },
  qimao: { name: "\u4E03\u732B\u4E2D\u6587\u7F51", hint: "\u6309\u4E66\u540D\u3001\u4F5C\u8005\u6216\u4E3B\u89D2\u641C\u7D22\u3002" },
  jjwxc: { name: "\u664B\u6C5F\u6587\u5B66\u57CE", hint: "\u6253\u5F00\u5B98\u7F51\u8868\u5355\u540E\u9009\u62E9\u201C\u4F5C\u54C1\u201D\u6216\u201C\u4F5C\u8005\u201D\uFF0C\u518D\u70B9\u641C\u7D22\u3002" }
};
function isOfficialSearchPage(provider, input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  switch (provider) {
    case "qidian":
      return url.hostname === "www.qidian.com" && url.pathname.startsWith("/so/");
    case "fanqie":
      return url.hostname === "fanqienovel.com" && (url.pathname.startsWith("/search/") || url.pathname === "/");
    case "qimao":
      return url.hostname === "www.qimao.com" && /^\/search\/index\/?$/.test(url.pathname);
    case "jjwxc":
      return ["my.jjwxc.net", "www.jjwxc.net"].includes(url.hostname) && url.pathname === "/search.php";
  }
}
function officialSearch(provider, input) {
  const keyword = input.trim();
  if (!keyword) throw new Error("\u8BF7\u8F93\u5165\u4E66\u540D\u6216\u4F5C\u8005\u5173\u952E\u8BCD\u3002");
  const encoded = encodeURIComponent(keyword);
  switch (provider) {
    case "qidian":
      return { url: `https://www.qidian.com/so/${encoded}.html` };
    case "fanqie":
      return keyword === "." || keyword === ".." ? { url: "https://fanqienovel.com/" } : { url: `https://fanqienovel.com/search/${encoded}` };
    case "qimao":
      return { url: `https://www.qimao.com/search/index/?keyword=${encoded}` };
    case "jjwxc":
      return { url: "https://my.jjwxc.net/search.php" };
  }
}

// src/search-ui.ts
var SearchModal = class extends import_obsidian4.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onOpen() {
    this.contentEl.addClass("webnovel-import-modal");
    this.contentEl.createEl("h2", { text: "\u641C\u7D22\u7F51\u6587\u4F5C\u54C1" });
    this.contentEl.createEl("p", { text: "\u8F93\u5165\u4E66\u540D\u6216\u4F5C\u8005\uFF0C\u5728 Obsidian \u91CC\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u3002\u70B9\u8FDB\u4F5C\u54C1\u5373\u53EF\u9884\u89C8\u5BFC\u5165\u3002" });
    new import_obsidian4.Setting(this.contentEl).setName("\u5173\u952E\u8BCD").addText((text2) => {
      text2.setPlaceholder("\u8F93\u5165\u4E66\u540D\u6216\u4F5C\u8005").setValue(this.plugin.searchKeyword).onChange((value) => {
        this.plugin.searchKeyword = value;
      });
      text2.inputEl.setAttribute("aria-label", "\u641C\u7D22\u5173\u952E\u8BCD");
    });
    const platformFilter = new import_obsidian4.Setting(this.contentEl).setName("\u5E73\u53F0");
    const entries = this.contentEl.createDiv();
    const status2 = this.contentEl.createEl("p", { cls: "webnovel-status", attr: { role: "status" } });
    const render = (filter) => {
      entries.empty();
      for (const provider of Object.keys(searchProviders)) {
        if (filter && filter !== provider) continue;
        const site = searchProviders[provider];
        new import_obsidian4.Setting(entries).setName(site.name).setDesc(site.hint).addButton((button) => {
          button.setButtonText("\u5728 Obsidian \u641C\u7D22").onClick(() => {
            const keyword = this.plugin.searchKeyword.trim();
            if (!keyword) {
              status2.setText("\u8BF7\u8F93\u5165\u4E66\u540D\u6216\u4F5C\u8005\u5173\u952E\u8BCD\u3002");
              return;
            }
            this.close();
            this.plugin.openSearchBrowser(provider, keyword);
          });
        });
      }
    };
    platformFilter.addDropdown((dropdown) => {
      dropdown.addOption("", "\u5168\u90E8\u5E73\u53F0");
      for (const [provider, site] of Object.entries(searchProviders)) dropdown.addOption(provider, site.name);
      dropdown.selectEl.setAttribute("aria-label", "\u641C\u7D22\u5E73\u53F0");
      dropdown.onChange(render);
    });
    render("");
    new import_obsidian4.Setting(this.contentEl).setName("\u5DF2\u6709\u4F5C\u54C1\u94FE\u63A5\uFF1F").addButton((button) => button.setButtonText("\u4ECE\u94FE\u63A5\u5BFC\u5165").onClick(() => {
      this.close();
      new SingleImportModal(this.plugin).open();
    }));
    new import_obsidian4.Setting(this.contentEl).setName("\u627E\u4E0D\u5230\u4F5C\u54C1\uFF1F").setDesc("\u53EA\u6709\u4E66\u540D\u4E5F\u53EF\u4EE5\u5148\u5EFA\u6863\uFF0C\u4EE5\u540E\u627E\u5230\u6B63\u5F0F\u6765\u6E90\u65F6\u518D\u5173\u8054\u3002").addButton((button) => button.setButtonText("\u624B\u52A8\u6DFB\u52A0\u4F5C\u54C1").setCta().onClick(() => {
      this.close();
      new ManualWorkModal(this.plugin, this.plugin.searchKeyword.trim()).open();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/search-browser.ts
var import_obsidian5 = require("obsidian");

// src/search-guest.ts
function prepareSearchPageCode(provider, keyword) {
  return `(() => {${browserCaptureBundle()};WebnovelBrowser.prepareSearchPage(${JSON.stringify(provider)}, ${JSON.stringify(keyword)});})()`;
}
function readSearchWorkCode(ref) {
  return `(() => {${browserCaptureBundle()};return WebnovelBrowser.readSearchWork(${JSON.stringify(ref.url)});})()`;
}
function parseSearchWorkResult(result, ref) {
  if (!result || typeof result !== "object") throw new Error("\u7F51\u9875\u6CA1\u6709\u8FD4\u56DE\u4F5C\u54C1\u8D44\u6599\u3002");
  if ("error" in result && typeof result.error === "string" && result.error) throw new Error(result.error);
  const metadata = parseCapturedMetadata("metadata" in result ? result.metadata : void 0, ref);
  metadata.evidence.acquisition = "\u4ECE Obsidian \u5B98\u7F51\u641C\u7D22\u4E2D\u9009\u4E2D\u5DF2\u6253\u5F00\u7684\u4F5C\u54C1\u9875";
  return metadata;
}

// src/search-browser.ts
var searchPartition = "webnovel-import-search";
var SearchBrowserModal = class extends import_obsidian5.Modal {
  constructor(plugin, provider, keyword) {
    super(plugin.app);
    this.plugin = plugin;
    this.provider = provider;
    this.keyword = keyword;
    this.generation = 0;
    this.onSearchPage = false;
    this.reading = false;
  }
  onOpen() {
    const { url } = officialSearch(this.provider, this.keyword);
    this.modalEl.addClass("webnovel-search-browser");
    this.titleEl.setText(`\u641C\u7D22\u7F51\u6587\u4F5C\u54C1 \xB7 ${searchProviders[this.provider].name}`);
    const actions = this.contentEl.createDiv({ cls: "webnovel-search-browser-actions" });
    this.back = actions.createEl("button", { type: "button", text: "\u540E\u9000" });
    this.reload = actions.createEl("button", { type: "button", text: "\u91CD\u65B0\u52A0\u8F7D" });
    this.preview = actions.createEl("button", { type: "button", text: "\u9884\u89C8\u5F53\u524D\u4F5C\u54C1" });
    actions.createEl("button", { type: "button", text: "\u5728\u5916\u90E8\u6D4F\u89C8\u5668\u6253\u5F00\u5B98\u7F51\u641C\u7D22" }).addEventListener("click", async () => {
      try {
        const { shell } = require("electron");
        await shell.openExternal(url);
      } catch {
        this.status.setText("\u65E0\u6CD5\u6253\u5F00\u7CFB\u7EDF\u9ED8\u8BA4\u6D4F\u89C8\u5668\u3002");
      }
    });
    actions.createEl("button", { type: "button", text: "\u66F4\u6362\u641C\u7D22" }).addEventListener("click", () => {
      this.close();
      this.plugin.openSearch();
    });
    this.back.disabled = this.reload.disabled = this.preview.disabled = true;
    this.back.addEventListener("click", () => this.controlGuest((guest2) => guest2.goBack()));
    this.reload.addEventListener("click", () => this.controlGuest((guest2) => guest2.reload()));
    this.preview.addEventListener("click", () => {
      if (this.current) void this.previewWork(this.current);
    });
    this.status = this.contentEl.createEl("p", {
      cls: "webnovel-status",
      text: "\u6B63\u5728\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u2026",
      attr: { role: "status" }
    });
    if (!(0, import_obsidian5.requireApiVersion)("1.8.3")) {
      this.status.setText("\u5185\u5D4C\u641C\u7D22\u9700\u8981\u684C\u9762\u7248 Obsidian 1.8.3 \u6216\u66F4\u65B0\u7248\u672C\u3002\u8BF7\u5728\u5916\u90E8\u6D4F\u89C8\u5668\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u3002");
      return;
    }
    const guest = this.contentEl.ownerDocument.createElement("webview");
    guest.addClass("webnovel-search-guest");
    guest.setAttribute("aria-label", `${searchProviders[this.provider].name}\u5B98\u7F51`);
    guest.setAttribute("partition", searchPartition);
    guest.setAttribute("webpreferences", "sandbox=yes,contextIsolation=yes,nodeIntegration=no,webSecurity=yes");
    if (typeof guest.executeJavaScript !== "function" || typeof guest.getURL !== "function") {
      this.status.setText("\u5F53\u524D Obsidian \u65E0\u6CD5\u663E\u793A\u5185\u5D4C\u7F51\u9875\u3002\u8BF7\u5728\u5916\u90E8\u6D4F\u89C8\u5668\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u3002");
      return;
    }
    try {
      const { ipcRenderer } = require("electron");
      ipcRenderer.send("create-browser-session", searchPartition, false);
    } catch {
      this.status.setText("\u5F53\u524D Obsidian \u65E0\u6CD5\u521D\u59CB\u5316\u5185\u5D4C\u641C\u7D22\u3002\u8BF7\u5728\u5916\u90E8\u6D4F\u89C8\u5668\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u3002");
      return;
    }
    this.guest = guest;
    guest.addEventListener("did-start-navigation", (event) => {
      const navigation = event;
      if (!navigation.isMainFrame || this.guest !== guest) return;
      if (this.onSearchPage) {
        const book = this.bookAt(navigation.url);
        this.selectedFromSearch = book && sourceKey(book);
      }
      this.onSearchPage = false;
      this.resetPage("\u6B63\u5728\u6253\u5F00\u7F51\u9875\u2026");
    });
    guest.addEventListener("dom-ready", () => this.onPageReady(guest));
    guest.addEventListener("did-navigate-in-page", (event) => {
      if (event.isMainFrame) this.onPageReady(guest);
    });
    guest.addEventListener("did-fail-load", (event) => {
      const failure = event;
      if (!failure.isMainFrame || failure.errorCode === -3 || this.guest !== guest) return;
      this.selectedFromSearch = void 0;
      this.resetPage("\u7F51\u9875\u52A0\u8F7D\u5931\u8D25\u3002\u53EF\u4EE5\u91CD\u65B0\u52A0\u8F7D\u3001\u8FD4\u56DE\u641C\u7D22\u7ED3\u679C\u6216\u5728\u5916\u90E8\u6D4F\u89C8\u5668\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u3002");
      this.updateControls(guest);
    });
    guest.src = url;
    this.contentEl.appendChild(guest);
  }
  controlGuest(action) {
    if (!this.guest) return;
    try {
      action(this.guest);
    } catch {
      this.status.setText("\u7F51\u9875\u6682\u65F6\u65E0\u6CD5\u64CD\u4F5C\u3002\u8BF7\u91CD\u65B0\u6253\u5F00\u5B98\u7F51\u641C\u7D22\u3002");
    }
  }
  resetPage(message) {
    this.generation++;
    this.current = void 0;
    this.reading = false;
    this.preview.disabled = true;
    this.status.setText(message);
  }
  updateControls(guest) {
    try {
      this.back.disabled = !guest.canGoBack();
    } catch {
      this.back.disabled = true;
    }
    this.reload.disabled = false;
  }
  currentAddress(guest) {
    try {
      return guest.getURL();
    } catch {
      return "";
    }
  }
  bookAt(address) {
    if (!address.startsWith("https://")) return void 0;
    try {
      const book = parseBookUrl(address);
      return book.provider === this.provider ? book : void 0;
    } catch {
      return void 0;
    }
  }
  onPageReady(guest) {
    if (this.guest !== guest) return;
    this.updateControls(guest);
    const address = this.currentAddress(guest);
    const ref = this.bookAt(address);
    if (ref) {
      this.current = ref;
      this.preview.disabled = this.reading;
      const key = sourceKey(ref);
      if (this.selectedFromSearch === key && this.autoPreviewed !== key) {
        void this.previewWork(ref);
      } else if (!this.reading) {
        this.status.setText("\u53EF\u4EE5\u9884\u89C8\u5F53\u524D\u4F5C\u54C1\uFF0C\u4E5F\u53EF\u4EE5\u540E\u9000\u7EE7\u7EED\u9009\u62E9\u3002");
      }
      return;
    }
    this.autoPreviewed = void 0;
    this.selectedFromSearch = void 0;
    const isSearch = this.onSearchPage = isOfficialSearchPage(this.provider, address);
    this.resetPage(isSearch ? "\u5728\u5B98\u7F51\u641C\u7D22\u7ED3\u679C\u4E2D\u70B9\u5F00\u4F5C\u54C1\uFF0C\u63D2\u4EF6\u4F1A\u6253\u5F00\u5BFC\u5165\u9884\u89C8\u3002" : "\u8BF7\u4ECE\u5B98\u7F51\u641C\u7D22\u7ED3\u679C\u4E2D\u6253\u5F00\u4F5C\u54C1\u8BE6\u60C5\u9875\u3002");
    if (!isSearch) return;
    const generation = this.generation;
    void guest.executeJavaScript(prepareSearchPageCode(this.provider, this.keyword)).catch(() => {
      if (this.guest === guest && this.generation === generation) {
        this.status.setText("\u53EF\u4EE5\u5728\u5B98\u7F51\u641C\u7D22\u6846\u8F93\u5165\u5173\u952E\u8BCD\uFF0C\u518D\u4ECE\u7ED3\u679C\u4E2D\u6253\u5F00\u4F5C\u54C1\u3002");
      }
    });
  }
  async previewWork(ref) {
    const guest = this.guest;
    if (!guest || this.reading) return;
    const generation = this.generation;
    const isCurrent = () => {
      if (this.guest !== guest || this.generation !== generation) return false;
      const book = this.bookAt(this.currentAddress(guest));
      return book !== void 0 && sourceKey(book) === sourceKey(ref);
    };
    const code = readSearchWorkCode(ref);
    this.reading = this.preview.disabled = true;
    this.status.setText("\u6B63\u5728\u8BFB\u53D6\u4F5C\u54C1\u8D44\u6599\u2026");
    let failure;
    for (const delay of [0, 300, 900]) {
      if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
      if (!isCurrent()) return;
      try {
        const result = await guest.executeJavaScript(code);
        if (!isCurrent()) return;
        const metadata = parseSearchWorkResult(result, ref);
        this.reading = this.preview.disabled = false;
        this.autoPreviewed = sourceKey(ref);
        this.status.setText(`\u5DF2\u8BFB\u53D6\u300C${metadata.title}\u300D\u3002\u53EF\u4EE5\u91CD\u65B0\u9884\u89C8\uFF0C\u6216\u540E\u9000\u7EE7\u7EED\u9009\u62E9\u3002`);
        new SingleImportModal(this.plugin, void 0, { metadata, onAccepted: () => this.close() }).open();
        return;
      } catch (error) {
        failure = error;
      }
    }
    if (!isCurrent()) return;
    this.reading = this.preview.disabled = false;
    const message = failure instanceof Error ? failure.message : String(failure);
    this.status.setText(`\u672A\u80FD\u8BFB\u53D6\u4F5C\u54C1\u8D44\u6599\u3002\u8BF7\u786E\u8BA4\u7F51\u9875\u5DF2\u6B63\u5E38\u663E\u793A\u540E\uFF0C\u518D\u70B9\u300C\u9884\u89C8\u5F53\u524D\u4F5C\u54C1\u300D\u3002
${message}`);
  }
  onClose() {
    this.generation++;
    this.guest = void 0;
    this.current = void 0;
    this.autoPreviewed = void 0;
    this.selectedFromSearch = void 0;
    this.onSearchPage = false;
    this.reading = false;
    this.contentEl.empty();
  }
};

// src/main.ts
var WebnovelPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.searchKeyword = "";
  }
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    this.importer = new Importer(this.app, () => this.settings);
    this.addCommand({ id: "search-works", name: "\u641C\u7D22\u7F51\u6587\u4F5C\u54C1", callback: () => this.openSearch() });
    this.addCommand({ id: "import-book", name: "\u4ECE\u94FE\u63A5\u5BFC\u5165\u7F51\u6587\u4F5C\u54C1", callback: () => new SingleImportModal(this).open() });
    this.addCommand({ id: "manual-work", name: "\u624B\u52A8\u6DFB\u52A0\u7F51\u6587\u4F5C\u54C1", callback: () => new ManualWorkModal(this).open() });
    this.addCommand({ id: "import-links", name: "\u6279\u91CF\u5BFC\u5165\u7F51\u6587\u4F5C\u54C1\u94FE\u63A5", callback: () => new BatchImportModal(this).open() });
    this.addCommand({ id: "import-browser-capture", name: "\u4ECE\u6D4F\u89C8\u5668\u91C7\u96C6\u7ED3\u679C\u5BFC\u5165", callback: () => void this.receiveBrowserCapture() });
    this.registerObsidianProtocolHandler("webnovel-import", (params) => {
      if (params.vault && params.vault !== this.app.vault.getName()) {
        new import_obsidian6.Notice(`\u6B64\u91C7\u96C6\u4E66\u7B7E\u5BF9\u5E94 Vault\u300C${params.vault}\u300D\u3002\u8BF7\u5207\u6362\u5230\u5BF9\u5E94 Vault\uFF0C\u6216\u5728\u5F53\u524D Vault \u91CD\u65B0\u590D\u5236\u4E66\u7B7E\u3002`, 1e4);
        return;
      }
      if (params.clipboard === "1") void this.receiveBrowserCapture({
        provider: params.provider,
        id: params.id,
        capturedAt: params.capturedAt
      });
    });
    this.addCommand({
      id: "attach-source",
      name: "\u7ED9\u5F53\u524D\u4F5C\u54C1\u5173\u8054\u6B63\u5F0F\u7F51\u6587\u6765\u6E90",
      checkCallback: (checking) => {
        const file = this.activeMarkdown();
        if (!file) return false;
        if (!checking) new SingleImportModal(this, file).open();
        return true;
      }
    });
    this.addCommand({
      id: "refresh-current",
      name: "\u5237\u65B0\u5F53\u524D\u7F51\u6587\u7684\u6765\u6E90\u8D44\u6599",
      checkCallback: (checking) => {
        const file = this.activeMarkdown();
        if (!file || this.importRoute().kind !== "independent") return false;
        const state = this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        if (!state || isCoreManaged(state) || !Array.isArray(state.sources) || !state.sources.length) return false;
        if (!checking) void this.refresh(file);
        return true;
      }
    });
    this.addCommand({
      id: "export-current-to-media-core",
      name: "\u5C06\u5F53\u524D\u7F51\u6587\u4EA4\u7ED9 Media Core",
      checkCallback: (checking) => {
        const file = this.activeMarkdown();
        const state = file && this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        if (!file || state?.schema_version !== 1 || !Array.isArray(state.sources) || !state.sources.length) return false;
        if (!checking) new ArchiveExportModal(this, file).open();
        return true;
      }
    });
    this.addSettingTab(new WebnovelSettings(this));
  }
  openSearch() {
    new SearchModal(this).open();
  }
  openSearchBrowser(provider, keyword) {
    this.searchBrowser?.close();
    this.searchBrowser = new SearchBrowserModal(this, provider, keyword);
    this.searchBrowser.open();
  }
  onunload() {
    this.searchBrowser?.close();
    this.searchBrowser = void 0;
  }
  activeMarkdown() {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "md" ? file : null;
  }
  importRoute() {
    return resolveImportRoute(this.app, this.settings.importMode);
  }
  async openCorePreview(source, target, mode = this.settings.importMode) {
    let targetUid;
    if (target) {
      if (this.app.vault.getAbstractFileByPath(target.path) !== target) throw new Error("\u76EE\u6807\u7B14\u8BB0\u5DF2\u4E0D\u5B58\u5728\u3002");
      const uid = this.app.metadataCache.getFileCache(target)?.frontmatter?.uid;
      if (typeof uid !== "string" || !uid.trim()) throw new Error("\u5F53\u524D\u7B14\u8BB0\u7F3A\u5C11\u53EF\u7528\u7684\u4F5C\u54C1 UID\uFF0C\u65E0\u6CD5\u5728 Media Core \u4E2D\u6307\u5B9A\u8BE5\u7B14\u8BB0\u3002");
      targetUid = uid;
    }
    await openMediaCorePreview(this.app, mode, source, targetUid);
  }
  openSourcePage(input, target) {
    const ref = parseBookUrl(input);
    this.browserTarget = { key: sourceKey(ref), file: target };
    window.open(ref.url, "_blank", "noopener,noreferrer");
  }
  async copyCaptureBookmarklet() {
    try {
      await navigator.clipboard.writeText(makeBookmarklet(this.app.vault.getName()));
      new import_obsidian6.Notice("\u5DF2\u590D\u5236\u201C\u91C7\u96C6\u5F53\u524D\u7F51\u6587\u4F5C\u54C1\u201D\u3002\u8BF7\u7C98\u8D34\u5230\u6D4F\u89C8\u5668\u4E66\u7B7E\u7684\u7F51\u5740\u680F\uFF0C\u5E76\u4FDD\u7559\u5F00\u5934\u7684 javascript:\u3002", 1e4);
    } catch (error) {
      new import_obsidian6.Notice(`\u590D\u5236\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async receiveBrowserCapture(expected) {
    try {
      const metadata = parseCapturePayload(await navigator.clipboard.readText(), expected);
      const pending = this.browserTarget;
      const target = pending?.key === sourceKey(metadata) ? pending.file : void 0;
      if (target && this.app.vault.getAbstractFileByPath(target.path) !== target) {
        throw new Error("\u539F\u5148\u9009\u5B9A\u7684\u76EE\u6807\u7B14\u8BB0\u5DF2\u7ECF\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u5173\u8054\u6765\u6E90\u5165\u53E3\u3002");
      }
      new SingleImportModal(this, target, { metadata, onAccepted: () => {
        if (pending?.key === sourceKey(metadata) && this.browserTarget === pending) this.browserTarget = void 0;
      } }).open();
    } catch (error) {
      new import_obsidian6.Notice(`\u6D4F\u89C8\u5668\u91C7\u96C6\u5BFC\u5165\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}
\u53EF\u4ECE\u4F5C\u54C1\u94FE\u63A5\u5BFC\u5165\u5F39\u7A97\u9009\u62E9\u5DF2\u4FDD\u5B58\u7684 HTML\u3002`, 1e4);
    }
  }
  async refresh(file) {
    let sources;
    try {
      sources = this.importer.sources(file);
    } catch (error) {
      new import_obsidian6.Notice(error instanceof Error ? error.message : String(error), 1e4);
      return;
    }
    let recoveryUrl;
    for (const source of sources) {
      try {
        if (this.importRoute().kind !== "independent") throw new Error("\u5F53\u524D\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u8BF7\u901A\u8FC7\u5355\u6761\u9884\u89C8\u4EA4\u7ED9 Media Core\u3002");
        const metadata = await this.importer.fetch(source.url);
        if (this.importRoute().kind !== "independent") throw new Error("\u5F53\u524D\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u8BF7\u901A\u8FC7\u5355\u6761\u9884\u89C8\u4EA4\u7ED9 Media Core\u3002");
        const result = await this.importer.import(metadata, file);
        new import_obsidian6.Notice(`${providerName(source.provider)}\u5DF2\u5237\u65B0\uFF1A\u91C7\u7528 ${result.adopted.length} \u9879\uFF0C\u4FDD\u7559 ${result.preserved.length} \u9879\u4EBA\u5DE5/\u5176\u4ED6\u6765\u6E90\u503C\u3002${result.warnings.length ? `
${result.warnings.join("\n")}` : ""}`, 8e3);
      } catch (error) {
        recoveryUrl ?? (recoveryUrl = source.url);
        new import_obsidian6.Notice(`${providerName(source.provider)}\u5237\u65B0\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`, 1e4);
      }
    }
    if (recoveryUrl) new SingleImportModal(this, file, { url: recoveryUrl }).open();
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var WebnovelSettings = class extends import_obsidian6.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "Webnovel Import" });
    this.containerEl.createEl("p", { text: `\u4F5C\u54C1\u5143\u6570\u636E\u5BFC\u5165\u5668 \xB7 ${this.plugin.manifest.version} \u5F00\u53D1\u9884\u89C8\u3002\u652F\u6301\u8D77\u70B9\u3001\u756A\u8304\u3001\u4E03\u732B\u4E0E\u664B\u6C5F\u7684\u641C\u7D22\u548C\u4F5C\u54C1\u91C7\u96C6\u3002` });
    new import_obsidian6.Setting(this.containerEl).setName("\u5BFC\u5165\u6A21\u5F0F").setDesc("\u81EA\u52A8\u6A21\u5F0F\u4F18\u5148\u4F7F\u7528 Media Core\uFF1B\u786E\u8BA4\u672A\u5B89\u88C5\u65F6\u624D\u72EC\u7ACB\u4FDD\u5B58\u3002\u5DF2\u5B89\u88C5\u4F46\u4E0D\u53EF\u7528\u65F6\uFF0C\u53EF\u4EE5\u590D\u5236\u89C4\u8303\u6765\u6E90 JSON \u6216\u5728\u8FD9\u91CC\u660E\u786E\u5207\u6362\u6A21\u5F0F\u3002").addDropdown((dropdown) => dropdown.addOptions({ auto: "\u81EA\u52A8", "media-core": "Media Core", independent: "\u72EC\u7ACB" }).setValue(this.plugin.settings.importMode).onChange(async (value) => {
      this.plugin.settings.importMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian6.Setting(this.containerEl).setName("\u91C7\u96C6\u5F53\u524D\u7F51\u6587\u4F5C\u54C1").setDesc("\u628A\u590D\u5236\u7684\u5185\u5BB9\u7528\u4F5C\u6D4F\u89C8\u5668\u4E66\u7B7E\u7684\u7F51\u5740\u3002\u6253\u5F00\u8D77\u70B9\u3001\u4E03\u732B\u6216\u664B\u6C5F\u4F5C\u54C1\u8BE6\u60C5\u9875\u540E\u70B9\u51FB\u4E66\u7B7E\uFF0C\u8D44\u6599\u901A\u8FC7\u672C\u673A\u526A\u8D34\u677F\u8FD4\u56DE\u5F53\u524D Vault \u7684\u9884\u89C8\u3002\u756A\u8304\u53EF\u7528\u4F5C\u54C1\u94FE\u63A5\u83B7\u53D6\u3002").addButton((button) => button.setButtonText("\u590D\u5236\u91C7\u96C6\u4E66\u7B7E").onClick(() => void this.plugin.copyCaptureBookmarklet()));
    new import_obsidian6.Setting(this.containerEl).setName("\u65B0\u4F5C\u54C1\u76EE\u5F55").setDesc("\u76F8\u5BF9\u4E8E\u5F53\u524D Vault\u3002\u65E2\u6709\u6587\u4EF6\u4FDD\u6301\u539F\u8DEF\u5F84\u3002").addText((text2) => text2.setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
      try {
        this.plugin.settings.outputFolder = folderPath(value);
        await this.plugin.saveSettings();
      } catch {
      }
    }));
    new import_obsidian6.Setting(this.containerEl).setName("\u4E0B\u8F7D\u5C01\u9762").setDesc("\u6210\u529F\u540E\u4FDD\u5B58\u5728 Vault\uFF1B\u4E0B\u8F7D\u5931\u8D25\u4FDD\u7559\u539F\u59CB\u5C01\u9762\u94FE\u63A5\u3002").addToggle((toggle) => toggle.setValue(this.plugin.settings.downloadCovers).onChange(async (value) => {
      this.plugin.settings.downloadCovers = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian6.Setting(this.containerEl).setName("\u5C01\u9762\u76EE\u5F55").addText((text2) => text2.setValue(this.plugin.settings.coverFolder).onChange(async (value) => {
      try {
        this.plugin.settings.coverFolder = folderPath(value);
        await this.plugin.saveSettings();
      } catch {
      }
    }));
    new import_obsidian6.Setting(this.containerEl).setName("\u672C\u5730\u7B80\u4ECB\u957F\u5EA6").setDesc("\u6765\u6E90\u7B80\u4ECB\u53E6\u5B58\u4E8E\u6765\u6E90\u533A\uFF1B\u4EBA\u5DE5\u4FEE\u6539\u540E\u7684\u672C\u5730\u7B80\u4ECB\u53D7\u4FDD\u62A4\u3002").addSlider((slider) => slider.setLimits(80, 600, 20).setValue(this.plugin.settings.summaryLength).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.summaryLength = value;
      await this.plugin.saveSettings();
    }));
    this.containerEl.createEl("p", { text: "\u4E2A\u4EBA\u8BC4\u5206\u3001\u9605\u8BFB\u72B6\u6001\u3001\u8FDB\u5EA6\u3001\u7B80\u8BC4\u3001\u968F\u8BB0\u548C\u7CFB\u5217\u5173\u7CFB\u7531\u4F60\u7EF4\u62A4\u3002\u5237\u65B0\u4E0D\u6539\u5199\u6B63\u6587\uFF0C\u4E5F\u4E0D\u4EE5\u4F5C\u54C1\u6807\u9898\u81EA\u52A8\u5408\u5E76\u4E0D\u540C\u6765\u6E90\u3002", cls: "setting-item-description" });
  }
};
