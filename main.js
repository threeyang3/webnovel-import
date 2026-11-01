"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WebnovelPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/importer.ts
var import_obsidian = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  outputFolder: "\u7F51\u6587",
  coverFolder: "_assets/webnovel-import",
  downloadCovers: true,
  summaryLength: 260
};
var providerName = (provider) => provider === "qidian" ? "\u8D77\u70B9\u4E2D\u6587\u7F51" : "\u756A\u8304\u5C0F\u8BF4";
var sourceKey = (ref) => `${ref.provider}:${ref.id}`;

// src/merge.ts
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
  return isEmpty(source[field]) || field === "serialization_status" && source[field] === "unknown" && !isManualField(source, field);
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
  if (incoming.tags) snapshot.tags = [...incoming.tags];
  if (incoming.serialization_status === "unknown" && !isManualField(incoming, "serialization_status")) {
    delete snapshot.serialization_status;
  }
  for (const field of metadataFields) {
    if (isMissingSourceField(incoming, field) && previous && !isMissingSourceField(previous, field)) {
      snapshot[field] = previous[field];
      retainedFields[field] = previous.retained_fields?.[field] ?? previous.fetched_at;
      if (previous.evidence[field] !== void 0) snapshot.evidence[field] = previous.evidence[field];
      else if (previous.acquisition === "manual") snapshot.evidence[field] = "manual:\u7528\u6237\u624B\u5DE5\u5F55\u5165";
    } else {
      delete retainedFields[field];
      if (!isMissingSourceField(incoming, field) && incoming.evidence[field] === void 0) {
        delete snapshot.evidence[field];
      }
    }
  }
  if (Object.keys(retainedFields).length) snapshot.retained_fields = retainedFields;
  else delete snapshot.retained_fields;
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
    if (isEmpty(value)) continue;
    const evidence = incoming.evidence[sourceField];
    const manual = isManualField(incoming, sourceField);
    if (field === "serialization_status" && value === "unknown" && !manual) continue;
    const previous = adoptionRecords[field];
    const mayUpdate = previous ? (previous.source_key === key || manual && previous.source_key === `manual:${key}`) && sameValue(frontmatter[field], previous.value) : isEmpty(frontmatter[field]);
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

// src/sources.ts
function parseBookUrl(input) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("\u8BF7\u8F93\u5165\u5B8C\u6574\u7684\u8D77\u70B9\u6216\u756A\u8304\u4F5C\u54C1\u8BE6\u60C5\u9875\u94FE\u63A5\u3002");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error("\u4F5C\u54C1\u94FE\u63A5\u5FC5\u987B\u662F\u666E\u901A\u7684 HTTP \u6216 HTTPS \u5B98\u7F51\u94FE\u63A5\u3002");
  }
  const host = url.hostname.toLowerCase();
  const pattern = host === "book.qidian.com" ? /^\/info\/(\d+)\/?$/ : ["www.qidian.com", "m.qidian.com"].includes(host) ? /^\/book\/(\d+)\/?$/ : host === "fanqienovel.com" ? /^\/page\/(\d+)\/?$/ : void 0;
  const match = pattern?.exec(url.pathname);
  if (!match) throw new Error("\u4EC5\u652F\u6301\u8D77\u70B9 /book/ \u6216 /info/\u3001\u756A\u8304 /page/ \u4F5C\u54C1\u8BE6\u60C5\u9875\uFF1B\u8BF7\u52FF\u4F7F\u7528\u7AE0\u8282\u6216\u641C\u7D22\u9875\u94FE\u63A5\u3002");
  const id = match[1];
  const provider = host === "fanqienovel.com" ? "fanqie" : "qidian";
  return { provider, id, url: provider === "fanqie" ? `https://fanqienovel.com/page/${id}` : `https://www.qidian.com/book/${id}/` };
}
var clean = (value) => value?.replace(/\u00a0/g, " ").replace(/[\t ]+/g, " ").trim() || void 0;
function text(root, selector) {
  return clean(root.querySelector(selector)?.textContent);
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
function fanqieCover(doc, ref) {
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
      identity = parseBookUrl(data["@id"]);
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
function checkIdentity(doc, ref) {
  const candidates = [
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    meta(doc, "og:url"),
    meta(doc, "og:novel:book_url")
  ];
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    for (const match of (script.textContent || "").matchAll(/"@id"\s*:\s*("(?:[^"\\]|\\.)*")/g)) {
      try {
        candidates.push(JSON.parse(match[1]));
      } catch {
      }
    }
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    let actual;
    try {
      actual = parseBookUrl(new URL(candidate, ref.url).href);
    } catch {
      continue;
    }
    if (actual.provider !== ref.provider || actual.id !== ref.id) {
      throw new Error("\u9875\u9762\u6807\u8BC6\u4E0E\u8F93\u5165\u7684\u4F5C\u54C1\u94FE\u63A5\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u6838\u5BF9\u94FE\u63A5\u548C HTML \u6587\u4EF6\u3002");
    }
  }
}
function parseSourceHtml(html, ref, acquisition = "remote") {
  const doc = new DOMParser().parseFromString(html, "text/html");
  checkIdentity(doc, ref);
  const result = {
    ...ref,
    title: "",
    authors: [],
    fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
    acquisition,
    evidence: {},
    warnings: []
  };
  if (ref.provider === "fanqie") {
    const header = doc.querySelector(".page-header-info");
    result.title = header ? text(header, ".info-name h1") || "" : "";
    const author = header && text(header, ".author-name-text");
    if (author) result.authors = [author];
    const cover = fanqieCover(doc, ref);
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
  } else {
    result.title = meta(doc, "og:novel:book_name") || "";
    const author = meta(doc, "og:novel:author");
    if (author) result.authors = [author];
    result.description = meta(doc, "og:novel:description") || meta(doc, "og:description");
    result.cover_url = imageUrl(meta(doc, "og:image"), ref.url);
    const category = meta(doc, "og:novel:category");
    if (category) result.tags = [category];
    result.serialization_status = status(meta(doc, "og:novel:status"));
    result.word_count_text = meta(doc, "og:novel:word_count");
    result.last_updated_at = meta(doc, "og:novel:update_time");
    result.latest_chapter = meta(doc, "og:novel:latest_chapter_name");
    result.evidence.title = "meta og:novel:book_name";
    result.evidence.authors = "meta og:novel:author";
    if (result.description) result.evidence.description = "meta og:novel:description / og:description";
    if (result.cover_url) result.evidence.cover_url = "meta og:image";
    if (result.tags) result.evidence.tags = "meta og:novel:category";
    if (result.serialization_status) result.evidence.serialization_status = "meta og:novel:status";
    if (result.word_count_text) result.evidence.word_count_text = "meta og:novel:word_count";
    if (result.last_updated_at) result.evidence.last_updated_at = "meta og:novel:update_time\uFF1B\u975E\u9996\u53D1\u65E5\u671F";
    if (result.latest_chapter) result.evidence.latest_chapter = "meta og:novel:latest_chapter_name";
    result.warnings.push("\u8D77\u70B9\u9002\u914D\u57FA\u4E8E\u516C\u5F00\u5143\u6807\u7B7E\u683C\u5F0F\uFF0C\u5F53\u524D\u7AD9\u70B9\u5728\u7EBF\u8BBF\u95EE\u5C1A\u672A\u9A8C\u8BC1\u6210\u529F\u3002");
  }
  if (!result.title || result.authors.length === 0) {
    throw new Error("\u672A\u8BC6\u522B\u5230\u53EF\u9760\u7684\u4E66\u540D\u548C\u4F5C\u8005\u3002\u9875\u9762\u53EF\u80FD\u662F\u9A8C\u8BC1\u9875\u3001\u767B\u5F55\u9875\u6216\u7ED3\u6784\u5DF2\u53D8\u5316\uFF1B\u8BF7\u5728\u6D4F\u89C8\u5668\u786E\u8BA4\u4F5C\u54C1\u8BE6\u60C5\u9875\uFF0C\u6216\u4F7F\u7528\u624B\u52A8\u5EFA\u6863\u3002");
  }
  if (!result.cover_url) result.warnings.push("\u672A\u63D0\u53D6\u5230\u53EF\u7528\u5C01\u9762\u5730\u5740\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  if (!result.description) result.warnings.push("\u672A\u63D0\u53D6\u5230\u4F5C\u54C1\u7B80\u4ECB\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  result.warnings.push("\u672A\u83B7\u5F97\u660E\u786E\u7684\u9996\u53D1\u65E5\u671F\uFF0C\u9996\u53D1\u5E74\u4EFD\u7559\u7A7A\uFF1B\u4E0D\u4F1A\u7528\u6700\u8FD1\u66F4\u65B0\u65F6\u95F4\u63A8\u65AD\u5E74\u4EFD\u3002");
  return result;
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
  }
  async fetch(input) {
    const ref = parseBookUrl(input);
    const response = await (0, import_obsidian.requestUrl)({ url: ref.url, headers: { Accept: "text/html" }, throw: false });
    if (response.status !== 200) {
      throw new Error(`${providerName(ref.provider)}\u8FD4\u56DE HTTP ${response.status}\uFF0C\u672A\u83B7\u5F97\u53EF\u89E3\u6790\u7684\u4F5C\u54C1\u9875\u3002\u53EF\u5728\u6D4F\u89C8\u5668\u6B63\u5E38\u6253\u5F00\u540E\u63D0\u4F9B\u9875\u9762 HTML\uFF0C\u6216\u624B\u52A8\u8865\u586B\u3002`);
    }
    return parseSourceHtml(response.text, ref, "remote");
  }
  import(metadata, target) {
    const next = this.queue.then(() => this.write(metadata, target));
    this.queue = next.catch(() => void 0);
    return next;
  }
  sources(file) {
    return getSources(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {});
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
          throw new Error(`${file.path} \u5DF2\u8BB0\u5F55\u6B64\u6765\u6E90\uFF0C\u4F46\u63D2\u4EF6\u6570\u636E\u683C\u5F0F\u4E0D\u517C\u5BB9\u6216\u6709\u8BEF\uFF1B\u8BF7\u5148\u68C0\u67E5\u8BE5\u6587\u4EF6\u3002`);
        }
        warnings.push(`${file.path} \u7684\u6765\u6E90\u533A\u683C\u5F0F\u4E0D\u517C\u5BB9\uFF0C\u672A\u53C2\u4E0E\u672C\u6B21\u81EA\u52A8\u53BB\u91CD\u68C0\u67E5\u3002`);
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
  async write(metadata, explicitTarget) {
    if (!metadata.title.trim()) throw new Error("\u8BF7\u586B\u5199\u4F5C\u54C1\u6807\u9898\u3002");
    const warnings = [...metadata.warnings];
    const matches = this.findMatches(metadata, warnings);
    if (matches.length > 1) throw new Error(`\u540C\u4E00\u6765\u6E90\u5DF2\u5173\u8054\u591A\u4E2A\u6587\u4EF6\uFF0C\u8BF7\u5148\u6574\u7406\uFF1A${matches.map((f) => f.path).join("\uFF1B")}`);
    if (explicitTarget && matches[0] && matches[0] !== explicitTarget) {
      throw new Error(`\u6B64\u6765\u6E90\u5DF2\u7ECF\u5173\u8054 ${matches[0].path}\uFF0C\u672C\u6B21\u672A\u6539\u52A8\u5176\u4ED6\u6587\u4EF6\u3002`);
    }
    const target = explicitTarget ?? matches[0];
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
  initialBody(frontmatter, metadata) {
    const lines = [`# ${markdownText(String(frontmatter.title))}`, ""];
    const cover = frontmatter.cover;
    if (typeof cover === "string") {
      lines.push(/^https?:\/\//i.test(cover) ? `![\u5C01\u9762](<${cover.replace(/>/g, "%3E")}>)` : `![[${cover}]]`, "");
    }
    if (frontmatter.summary) lines.push(markdownText(String(frontmatter.summary)), "");
    lines.push(`[\u4F5C\u54C1\u8BE6\u60C5 \xB7 ${providerName(metadata.provider)}](${metadata.url})`, "", "<!-- \u6B63\u6587\u7531\u4F60\u7EF4\u62A4\uFF1B\u5237\u65B0\u4EC5\u66F4\u65B0\u5C5E\u6027\u4E2D\u7684\u6765\u6E90\u4FE1\u606F\u548C\u672A\u88AB\u4EBA\u5DE5\u4FEE\u6539\u7684\u91C7\u7528\u503C\u3002 -->", "");
    return lines.join("\n");
  }
};

// src/ui.ts
var import_obsidian2 = require("obsidian");
var errorText = (error) => error instanceof Error ? error.message : String(error);
var SingleImportModal = class extends import_obsidian2.Modal {
  constructor(plugin, target) {
    super(plugin.app);
    this.plugin = plugin;
    this.target = target;
    this.url = "";
    this.html = "";
    this.generation = 0;
  }
  onOpen() {
    this.contentEl.addClass("webnovel-import-modal");
    this.contentEl.createEl("h2", { text: this.target ? "\u5173\u8054\u7F51\u6587\u6765\u6E90" : "\u5BFC\u5165\u7F51\u6587\u4F5C\u54C1" });
    this.contentEl.createEl("p", { text: this.target ? `\u5C06\u6765\u6E90\u5173\u8054\u5230\u300C${this.target.basename}\u300D\u3002\u5DF2\u6709\u4EBA\u5DE5\u5185\u5BB9\u4F1A\u4FDD\u7559\u3002` : "\u7C98\u8D34\u8D77\u70B9\u6216\u756A\u8304\u4F5C\u54C1\u8BE6\u60C5\u9875\u94FE\u63A5\u3002\u83B7\u53D6\u540E\u53EF\u8865\u586B\u7F3A\u5931\u8D44\u6599\u3002" });
    new import_obsidian2.Setting(this.contentEl).setName("\u4F5C\u54C1\u94FE\u63A5").addText((text2) => {
      text2.setPlaceholder("https://fanqienovel.com/page/\u2026").onChange((value) => {
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
    const details = this.contentEl.createEl("details");
    details.createEl("summary", { text: "\u4ECE\u6B63\u5E38\u6253\u5F00\u7684\u4F5C\u54C1\u9875\u9762 HTML \u89E3\u6790" });
    details.createEl("p", { text: "\u53EF\u7C98\u8D34\u6D4F\u89C8\u5668\u53E6\u5B58\u4E3A HTML \u540E\u7684\u9875\u9762\u5185\u5BB9\uFF1B\u63D2\u4EF6\u53EA\u89E3\u6790\uFF0C\u4E0D\u6267\u884C\u5176\u4E2D\u7684\u811A\u672C\u3002" });
    const htmlArea = details.createEl("textarea", { cls: "webnovel-html-input", attr: { placeholder: "<!doctype html>\u2026", "aria-label": "\u4F5C\u54C1\u9875 HTML" } });
    htmlArea.addEventListener("input", () => {
      this.html = htmlArea.value;
    });
    new import_obsidian2.Setting(details).addButton((button) => button.setButtonText("\u89E3\u6790 HTML").onClick(() => void this.acquire(button, true)));
    this.status = this.contentEl.createEl("p", { cls: "webnovel-status", attr: { role: "status" } });
    this.form = this.contentEl.createDiv();
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
      if (generation === this.generation) this.status.setText(errorText(error));
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
    const set = (key, value) => {
      edited[key] = value;
      if (JSON.stringify(value) !== JSON.stringify(original[key])) edited.evidence[key] = "manual:\u7528\u6237\u8865\u586B\u6216\u4FEE\u6539";
      else if (original.evidence[key]) edited.evidence[key] = original.evidence[key];
      else delete edited.evidence[key];
    };
    new import_obsidian2.Setting(this.form).setName("\u4E66\u540D").addText((text2) => text2.setValue(edited.title).onChange((value) => set("title", value.trim())));
    new import_obsidian2.Setting(this.form).setName("\u4F5C\u8005").setDesc("\u591A\u4F4D\u4F5C\u8005\u7528\u9017\u53F7\u5206\u9694\u3002").addText((text2) => text2.setValue(edited.authors.join("\uFF0C")).onChange((value) => set("authors", value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))));
    new import_obsidian2.Setting(this.form).setName("\u6765\u6E90\u7B80\u4ECB").addTextArea((text2) => {
      text2.setValue(edited.description ?? "").onChange((value) => set("description", value.trim()));
      text2.inputEl.rows = 5;
    });
    new import_obsidian2.Setting(this.form).setName("\u5C01\u9762\u94FE\u63A5").addText((text2) => text2.setValue(edited.cover_url ?? "").onChange((value) => set("cover_url", value.trim() || void 0)));
    let yearText = edited.first_published_year?.toString() ?? "";
    new import_obsidian2.Setting(this.form).setName("\u7F51\u6587\u9996\u53D1\u5E74\u4EFD").setDesc("\u672A\u77E5\u65F6\u7559\u7A7A\uFF1B\u4E0D\u4EE5\u6700\u8FD1\u66F4\u65B0\u6216\u7EB8\u4E66\u51FA\u7248\u5E74\u4EFD\u4EE3\u66FF\u3002").addText((text2) => text2.setValue(yearText).setPlaceholder("\u672A\u77E5").onChange((value) => {
      yearText = value.trim();
    }));
    new import_obsidian2.Setting(this.form).setName("\u8FDE\u8F7D\u72B6\u6001").addDropdown((dropdown) => dropdown.addOptions({ unknown: "\u672A\u77E5", ongoing: "\u8FDE\u8F7D\u4E2D", completed: "\u5DF2\u5B8C\u7ED3", paused: "\u6682\u505C" }).setValue(edited.serialization_status ?? "unknown").onChange((value) => set("serialization_status", value)));
    if (edited.last_updated_at) this.form.createEl("p", { text: `\u6765\u6E90\u6700\u8FD1\u66F4\u65B0\uFF1A${edited.last_updated_at}`, cls: "setting-item-description" });
    if (edited.word_count_text) this.form.createEl("p", { text: `\u6765\u6E90\u663E\u793A\u5B57\u6570\uFF1A${edited.word_count_text}`, cls: "setting-item-description" });
    new import_obsidian2.Setting(this.form).addButton((button) => button.setButtonText(this.target ? "\u4FDD\u5B58\u6765\u6E90\u5173\u8054" : "\u5BFC\u5165\u4F5C\u54C1").setCta().onClick(async () => {
      button.setDisabled(true);
      try {
        if (yearText && !/^[12]\d{3}$/.test(yearText)) throw new Error("\u5E74\u4EFD\u8BF7\u586B\u56DB\u4F4D\u6570\u5B57\uFF0C\u672A\u77E5\u65F6\u7559\u7A7A\u3002");
        set("first_published_year", yearText ? Number(yearText) : void 0);
        if (edited.cover_url && !/^https?:\/\//i.test(edited.cover_url)) throw new Error("\u5C01\u9762\u94FE\u63A5\u987B\u4E3A http \u6216 https \u5730\u5740\u3002");
        this.status.setText("\u6B63\u5728\u4FDD\u5B58\u4F5C\u54C1\u8D44\u6599\u2026");
        const result = await this.plugin.importer.import(edited, this.target);
        new import_obsidian2.Notice(`${result.created ? "\u5DF2\u521B\u5EFA" : "\u5DF2\u66F4\u65B0"}\uFF1A${result.file.basename}${result.warnings.length ? `
${result.warnings.join("\n")}` : ""}`, 8e3);
        await this.app.workspace.getLeaf(false).openFile(result.file);
        this.close();
      } catch (error) {
        this.status.setText(errorText(error));
      } finally {
        button.setDisabled(false);
      }
    }));
  }
  onClose() {
    this.generation++;
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
    this.contentEl.createEl("p", { text: "\u6BCF\u884C\u4E00\u4E2A\u8D77\u70B9\u6216\u756A\u8304\u4F5C\u54C1\u8BE6\u60C5\u9875\u3002\u76F8\u540C\u6765\u6E90\u81EA\u52A8\u53BB\u91CD\uFF1B\u5DF2\u5BFC\u5165\u7684\u4F5C\u54C1\u6309\u5B57\u6BB5\u4FDD\u62A4\u89C4\u5219\u66F4\u65B0\u3002" });
    const input = this.contentEl.createEl("textarea", { cls: "webnovel-links-input", attr: { "aria-label": "\u4F5C\u54C1\u94FE\u63A5\u5217\u8868" } });
    const status2 = this.contentEl.createEl("p", { attr: { role: "status" } });
    const results = this.contentEl.createEl("ul", { cls: "webnovel-results" });
    const actions = new import_obsidian2.Setting(this.contentEl);
    let start;
    actions.addButton((button) => {
      start = button;
      button.setButtonText("\u5F00\u59CB\u5BFC\u5165").setCta().onClick(async () => {
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
            const result = await this.plugin.importer.import(metadata);
            results.createEl("li", { text: `${result.created ? "\u65B0\u5EFA" : "\u66F4\u65B0"}\uFF1A${result.file.path}${result.warnings.length ? `\uFF08${result.warnings.join("\uFF1B")}\uFF09` : ""}` });
            done++;
          } catch (error) {
            results.createEl("li", { text: `${url}\uFF1A${errorText(error)}`, cls: "webnovel-error" });
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

// src/main.ts
var WebnovelPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
  }
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    this.importer = new Importer(this.app, () => this.settings);
    this.addCommand({ id: "import-book", name: "\u4ECE\u4F5C\u54C1\u94FE\u63A5\u5BFC\u5165\u7F51\u6587", callback: () => new SingleImportModal(this).open() });
    this.addCommand({ id: "import-links", name: "\u6279\u91CF\u5BFC\u5165\u7F51\u6587\u4F5C\u54C1\u94FE\u63A5", callback: () => new BatchImportModal(this).open() });
    this.addCommand({
      id: "attach-source",
      name: "\u7ED9\u5F53\u524D\u4F5C\u54C1\u5173\u8054\u8D77\u70B9\u6216\u756A\u8304\u6765\u6E90",
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
        if (!file || !this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import) return false;
        if (!checking) void this.refresh(file);
        return true;
      }
    });
    this.addSettingTab(new WebnovelSettings(this));
  }
  activeMarkdown() {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === "md" ? file : null;
  }
  async refresh(file) {
    let sources;
    try {
      sources = this.importer.sources(file);
    } catch (error) {
      new import_obsidian3.Notice(error instanceof Error ? error.message : String(error), 1e4);
      return;
    }
    for (const source of sources) {
      try {
        const metadata = await this.importer.fetch(source.url);
        const result = await this.importer.import(metadata, file);
        new import_obsidian3.Notice(`${providerName(source.provider)}\u5DF2\u5237\u65B0\uFF1A\u91C7\u7528 ${result.adopted.length} \u9879\uFF0C\u4FDD\u7559 ${result.preserved.length} \u9879\u4EBA\u5DE5/\u5176\u4ED6\u6765\u6E90\u503C\u3002${result.warnings.length ? `
${result.warnings.join("\n")}` : ""}`, 8e3);
      } catch (error) {
        new import_obsidian3.Notice(`${providerName(source.provider)}\u5237\u65B0\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`, 1e4);
      }
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var WebnovelSettings = class extends import_obsidian3.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "Webnovel Import" });
    this.containerEl.createEl("p", { text: "\u4F5C\u54C1\u5143\u6570\u636E\u5BFC\u5165\u5668 \xB7 0.1.0 \u5F00\u53D1\u9884\u89C8\u3002\u8D77\u70B9\u81EA\u52A8\u83B7\u53D6\u5F85\u771F\u5B9E\u73AF\u5883\u9A8C\u8BC1\uFF1B\u7F3A\u5931\u5E74\u4EFD\u4FDD\u6301\u7A7A\u503C\u3002" });
    new import_obsidian3.Setting(this.containerEl).setName("\u65B0\u4F5C\u54C1\u76EE\u5F55").setDesc("\u76F8\u5BF9\u4E8E\u5F53\u524D Vault\u3002\u65E2\u6709\u6587\u4EF6\u4FDD\u6301\u539F\u8DEF\u5F84\u3002").addText((text2) => text2.setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
      try {
        this.plugin.settings.outputFolder = folderPath(value);
        await this.plugin.saveSettings();
      } catch {
      }
    }));
    new import_obsidian3.Setting(this.containerEl).setName("\u4E0B\u8F7D\u5C01\u9762").setDesc("\u6210\u529F\u540E\u4FDD\u5B58\u5728 Vault\uFF1B\u4E0B\u8F7D\u5931\u8D25\u4FDD\u7559\u539F\u59CB\u5C01\u9762\u94FE\u63A5\u3002").addToggle((toggle) => toggle.setValue(this.plugin.settings.downloadCovers).onChange(async (value) => {
      this.plugin.settings.downloadCovers = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian3.Setting(this.containerEl).setName("\u5C01\u9762\u76EE\u5F55").addText((text2) => text2.setValue(this.plugin.settings.coverFolder).onChange(async (value) => {
      try {
        this.plugin.settings.coverFolder = folderPath(value);
        await this.plugin.saveSettings();
      } catch {
      }
    }));
    new import_obsidian3.Setting(this.containerEl).setName("\u672C\u5730\u7B80\u4ECB\u957F\u5EA6").setDesc("\u6765\u6E90\u7B80\u4ECB\u53E6\u5B58\u4E8E\u6765\u6E90\u533A\uFF1B\u4EBA\u5DE5\u4FEE\u6539\u540E\u7684\u672C\u5730\u7B80\u4ECB\u53D7\u4FDD\u62A4\u3002").addSlider((slider) => slider.setLimits(80, 600, 20).setValue(this.plugin.settings.summaryLength).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.summaryLength = value;
      await this.plugin.saveSettings();
    }));
    this.containerEl.createEl("p", { text: "\u4E2A\u4EBA\u8BC4\u5206\u3001\u9605\u8BFB\u72B6\u6001\u3001\u8FDB\u5EA6\u3001\u7B80\u8BC4\u3001\u968F\u8BB0\u548C\u7CFB\u5217\u5173\u7CFB\u7531\u4F60\u7EF4\u62A4\u3002\u5237\u65B0\u4E0D\u6539\u5199\u6B63\u6587\uFF0C\u4E5F\u4E0D\u4EE5\u4F5C\u54C1\u6807\u9898\u81EA\u52A8\u5408\u5E76\u4E0D\u540C\u6765\u6E90\u3002", cls: "setting-item-description" });
  }
};
