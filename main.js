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
  browserCapture: { selectors: ['meta[property^="og:"]', 'meta[name^="og:"]', 'link[rel="canonical"]', "#book-detail", "#book-intro-detail"] },
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

// src/sources.ts
var sourceAdapters = [qidianAdapter, fanqieAdapter];
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
function parseSourceHtml(html, ref, acquisition = "remote") {
  const adapter = getSourceAdapter(ref.provider);
  const doc = new DOMParser().parseFromString(html, "text/html");
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
  result.warnings.push("\u672A\u83B7\u5F97\u660E\u786E\u7684\u9996\u53D1\u65E5\u671F\uFF0C\u9996\u53D1\u5E74\u4EFD\u7559\u7A7A\uFF1B\u4E0D\u4F1A\u7528\u6700\u8FD1\u66F4\u65B0\u65F6\u95F4\u63A8\u65AD\u5E74\u4EFD\u3002");
  return result;
}

// src/main.ts
var import_obsidian3 = require("obsidian");

// src/matching.ts
var normalize = (value) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
function authorNames(value) {
  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values) || !values.length || values.some((v) => typeof v !== "string" || !normalize(v))) return [];
  return [...new Set(values.map((v) => normalize(v)))].sort();
}
function matchesWork(local, incoming) {
  if (typeof local.title !== "string" || !normalize(local.title) || normalize(local.title) !== normalize(incoming.title)) return false;
  const left = authorNames(local.authors);
  const right = authorNames(incoming.authors);
  return left.length > 0 && left.length === right.length && left.every((name, index) => name === right[index]);
}

// src/importer.ts
var import_obsidian = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  outputFolder: "\u7F51\u6587",
  coverFolder: "_assets/webnovel-import",
  downloadCovers: true,
  summaryLength: 260
};
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
      const recovery = getSourceAdapter(ref.provider).recoveryHint;
      throw new Error(`${providerName(ref.provider)}\u8FD4\u56DE HTTP ${response.status}\uFF0C\u672A\u83B7\u5F97\u53EF\u89E3\u6790\u7684\u4F5C\u54C1\u9875\u3002${recovery}`);
    }
    return parseSourceHtml(response.text, ref, "remote");
  }
  import(metadata, target, options = {}) {
    const next = this.queue.then(() => this.write(metadata, target, options.createSeparate));
    this.queue = next.catch(() => void 0);
    return next;
  }
  sources(file) {
    return getSources(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {});
  }
  /** Exact source ownership takes precedence over title/author candidates. */
  previewMatches(metadata) {
    const warnings = [];
    const exact = this.findMatches(metadata, warnings);
    if (exact.length > 1) throw new Error(`\u540C\u4E00\u6765\u6E90\u5DF2\u5173\u8054\u591A\u4E2A\u6587\u4EF6\uFF0C\u8BF7\u5148\u6574\u7406\uFF1A${exact.map((f) => f.path).join("\uFF1B")}`);
    if (exact[0]) return { exact: exact[0], candidates: [], warnings };
    const candidates = this.app.vault.getMarkdownFiles().filter((file) => {
      const local = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!local || !matchesWork(local, metadata)) return false;
      try {
        this.sources(file);
        return true;
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
  async write(metadata, explicitTarget, createSeparate = false) {
    if (!metadata.title.trim()) throw new Error("\u8BF7\u586B\u5199\u4F5C\u54C1\u6807\u9898\u3002");
    if (explicitTarget && this.app.vault.getAbstractFileByPath(explicitTarget.path) !== explicitTarget) {
      throw new Error("\u76EE\u6807\u7B14\u8BB0\u5DF2\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002");
    }
    const plan = this.previewMatches(metadata);
    const warnings = [...metadata.warnings, ...plan.warnings];
    const matches = plan.exact ? [plan.exact] : [];
    if (explicitTarget && matches[0] && matches[0] !== explicitTarget) {
      throw new Error(`\u6B64\u6765\u6E90\u5DF2\u7ECF\u5173\u8054 ${matches[0].path}\uFF0C\u672C\u6B21\u672A\u6539\u52A8\u5176\u4ED6\u6587\u4EF6\u3002`);
    }
    const target = explicitTarget ?? matches[0];
    if (!target && plan.candidates.length && !createSeparate) {
      throw new Error(`\u53D1\u73B0\u4E66\u540D\u4E0E\u4F5C\u8005\u5339\u914D\u7684\u5DF2\u6709\u4F5C\u54C1\uFF0C\u8BF7\u5355\u72EC\u9884\u89C8\u5E76\u9009\u62E9\u5173\u8054\u6216\u72EC\u7ACB\u521B\u5EFA\uFF1A${plan.candidates.map((f) => f.path).join("\uFF1B")}`);
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
  constructor(plugin, target, initial) {
    super(plugin.app);
    this.plugin = plugin;
    this.target = target;
    this.initial = initial;
    this.url = "";
    this.html = "";
    this.generation = 0;
  }
  onOpen() {
    this.url = this.initial?.url ?? this.initial?.metadata?.url ?? "";
    this.metadata = this.initial?.metadata;
    this.contentEl.addClass("webnovel-import-modal");
    this.contentEl.createEl("h2", { text: this.target ? "\u5173\u8054\u7F51\u6587\u6765\u6E90" : "\u5BFC\u5165\u7F51\u6587\u4F5C\u54C1" });
    this.contentEl.createEl("p", { text: this.target ? `\u5C06\u6765\u6E90\u5173\u8054\u5230\u300C${this.target.basename}\u300D\u3002\u5DF2\u6709\u4EBA\u5DE5\u5185\u5BB9\u4F1A\u4FDD\u7559\u3002` : "\u7C98\u8D34\u8D77\u70B9\u6216\u756A\u8304\u4F5C\u54C1\u8BE6\u60C5\u9875\u94FE\u63A5\u3002\u83B7\u53D6\u540E\u53EF\u8865\u586B\u7F3A\u5931\u8D44\u6599\u3002" });
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
        const html = await file.text();
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
    let yearText = edited.first_published_year?.toString() ?? "";
    new import_obsidian2.Setting(this.form).setName("\u7F51\u6587\u9996\u53D1\u5E74\u4EFD").setDesc("\u672A\u77E5\u65F6\u7559\u7A7A\uFF1B\u4E0D\u4EE5\u6700\u8FD1\u66F4\u65B0\u6216\u7EB8\u4E66\u51FA\u7248\u5E74\u4EFD\u4EE3\u66FF\u3002").addText((text2) => text2.setValue(yearText).setPlaceholder("\u672A\u77E5").onChange((value) => {
      yearText = value.trim();
    }));
    new import_obsidian2.Setting(this.form).setName("\u8FDE\u8F7D\u72B6\u6001").addDropdown((dropdown) => dropdown.addOptions({ unknown: "\u672A\u77E5", ongoing: "\u8FDE\u8F7D\u4E2D", completed: "\u5DF2\u5B8C\u7ED3", paused: "\u6682\u505C" }).setValue(edited.serialization_status ?? "unknown").onChange((value) => set("serialization_status", value)));
    if (edited.last_updated_at) this.form.createEl("p", { text: `\u6765\u6E90\u6700\u8FD1\u66F4\u65B0\uFF1A${edited.last_updated_at}`, cls: "setting-item-description" });
    if (edited.word_count_text) this.form.createEl("p", { text: `\u6765\u6E90\u663E\u793A\u5B57\u6570\uFF1A${edited.word_count_text}`, cls: "setting-item-description" });
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
        matchArea.createEl("p", { text: "\u4E66\u540D\u4E0E\u4F5C\u8005\u5339\u914D\uFF0C\u4EC5\u4F5C\u4E3A\u5019\u9009\u3002\u9009\u62E9\u5DF2\u6709\u7B14\u8BB0\u53EF\u8FFD\u52A0\u6765\u6E90\u5E76\u4FDD\u7559\u4E2A\u4EBA\u5185\u5BB9\uFF0C\u6216\u9009\u62E9\u72EC\u7ACB\u521B\u5EFA\u3002" });
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
      button.setDisabled(true);
      try {
        if (yearText && !/^[12]\d{3}$/.test(yearText)) throw new Error("\u5E74\u4EFD\u8BF7\u586B\u56DB\u4F4D\u6570\u5B57\uFF0C\u672A\u77E5\u65F6\u7559\u7A7A\u3002");
        set("first_published_year", yearText ? Number(yearText) : void 0);
        if (edited.cover_url && !/^https?:\/\//i.test(edited.cover_url)) throw new Error("\u5C01\u9762\u94FE\u63A5\u987B\u4E3A http \u6216 https \u5730\u5740\u3002");
        if (matchError) throw new Error(matchError);
        if (unresolved) throw new Error("\u8BF7\u5148\u9009\u62E9\u5173\u8054\u5DF2\u6709\u4F5C\u54C1\u6216\u72EC\u7ACB\u521B\u5EFA\u3002");
        this.status.setText("\u6B63\u5728\u4FDD\u5B58\u4F5C\u54C1\u8D44\u6599\u2026");
        const result = await this.plugin.importer.import(edited, this.target ?? selected, { createSeparate });
        this.initial?.onSaved?.();
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
function makeBookmarklet(vault) {
  return `javascript:void(function(){${'"use strict";var WebnovelBrowser=(()=>{var _=Object.defineProperty;var $=Object.getOwnPropertyDescriptor;var N=Object.getOwnPropertyNames;var T=Object.prototype.hasOwnProperty;var I=(e,o)=>{for(var t in o)_(e,t,{get:o[t],enumerable:!0})},M=(e,o,t,r)=>{if(o&&typeof o=="object"||typeof o=="function")for(let n of N(o))!T.call(e,n)&&n!==t&&_(e,n,{get:()=>o[n],enumerable:!(r=$(o,n))||r.enumerable});return e};var O=e=>M(_({},"__esModule",{value:!0}),e);var H={};I(H,{capture:()=>z});var c=e=>e?.replace(/\\u00a0/g," ").replace(/[\\t ]+/g," ").trim()||void 0;function d(e,o){return c(e.querySelector(o)?.textContent)}function U(e,o){let t=e.querySelector(o);if(!t)return;let r=t.cloneNode(!0);return r.querySelectorAll("br").forEach(n=>n.replaceWith(`\n`)),r.querySelectorAll("script, style").forEach(n=>n.remove()),c(r.textContent?.replace(/\\r\\n?/g,`\n`).replace(/[\\t ]*\\n[\\t ]*/g,`\n`))}function l(e,o){return c(e.querySelector(`meta[property="${o}"], meta[name="${o}"]`)?.getAttribute("content"))}function g(e,o){if(e?.trim())try{let t=new URL(e.trim(),o);return["http:","https:"].includes(t.protocol)&&!t.username&&!t.password?t.href:void 0}catch{return}}function v(e){if(e){if(/\u5B8C\u7ED3|\u5B8C\u672C|\u5DF2\u5B8C\u6210/.test(e))return"completed";if(/\u6682\u505C|\u505C\u66F4|\u65AD\u66F4/.test(e))return"paused";if(/\u8FDE\u8F7D/.test(e))return"ongoing"}}function b(e,o,t){let r=[],n=(i,s)=>{if(i)try{r.push({book:t(new URL(i,o.url).href),evidence:s})}catch{}};n(e.querySelector(\'link[rel="canonical"]\')?.getAttribute("href"),\'link[rel="canonical"]\');for(let i of["og:url","og:novel:book_url","og:novel:read_url"])n(l(e,i),`meta ${i}`);return{identities:r,addUrl:n}}function B(e,o){if(!e.length)throw new Error("\\u672A\\u8BC6\\u522B\\u5230\\u53EF\\u6838\\u5BF9\\u7684\\u4F5C\\u54C1\\u6807\\u8BC6\\uFF0C\\u4E0D\\u80FD\\u5C06\\u9875\\u9762\\u8D44\\u6599\\u7ED1\\u5B9A\\u5230\\u8F93\\u5165\\u94FE\\u63A5\\uFF1B\\u8BF7\\u63D0\\u4F9B\\u5B8C\\u6574\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\u6216\\u4F7F\\u7528\\u624B\\u52A8\\u5EFA\\u6863\\u3002");for(let{book:t}of e)if(t.provider!==o.provider||t.id!==o.id)throw new Error("\\u9875\\u9762\\u6807\\u8BC6\\u4E0E\\u8F93\\u5165\\u7684\\u4F5C\\u54C1\\u94FE\\u63A5\\u4E0D\\u4E00\\u81F4\\uFF0C\\u8BF7\\u6838\\u5BF9\\u94FE\\u63A5\\u548C HTML \\u6587\\u4EF6\\u3002");return e.map(t=>t.evidence).join("\\uFF1B")}var C={provider:"qidian",name:"\\u8D77\\u70B9\\u4E2D\\u6587\\u7F51",recoveryHint:"\\u8BF7\\u6B63\\u5E38\\u6253\\u5F00\\u4F5C\\u54C1\\u9875\\uFF0C\\u4F7F\\u7528\\u8BBE\\u7F6E\\u4E2D\\u7684\\u6D4F\\u89C8\\u5668\\u91C7\\u96C6\\u4E66\\u7B7E\\uFF0C\\u6216\\u9009\\u62E9\\u53E6\\u5B58\\u7684 HTML \\u6587\\u4EF6\\u3002",browserCapture:{selectors:[\'meta[property^="og:"]\',\'meta[name^="og:"]\',\'link[rel="canonical"]\',"#book-detail","#book-intro-detail"]},matchUrl(e){let t=(e.hostname==="book.qidian.com"?/^\\/info\\/(\\d+)\\/?$/:["www.qidian.com","m.qidian.com"].includes(e.hostname)?/^\\/book\\/(\\d+)\\/?$/:void 0)?.exec(e.pathname)?.[1];return t?{provider:"qidian",id:t,url:`https://www.qidian.com/book/${t}/`}:void 0},identities(e,o,t){let{identities:r}=b(e,o,t),n=e.querySelector("#book-detail #bookImg")?.getAttribute("data-bid");return n&&/^\\d+$/.test(n)&&r.push({book:{...o,id:n},evidence:"#book-detail #bookImg[data-bid]"}),r},parse(e,o){let t={title:"",authors:[],evidence:{},warnings:[]},r=e.querySelector("#book-detail .book-info-top"),n=r?d(r,"#bookName"):void 0,i=r?c(d(r,".book-meta .author")?.replace(/^\u4F5C\u8005\\s*[\uFF1A:]\\s*/,"")):void 0;t.title=n||l(e,"og:novel:book_name")||"";let s=i||l(e,"og:novel:author");s&&(t.authors=[s]);let a=U(e,"#book-intro-detail");t.description=a||l(e,"og:novel:description")||l(e,"og:description");let p=e.querySelector("#book-detail #bookImg"),u=p?.getAttribute("data-bid")===o.id?g(p.querySelector("img")?.getAttribute("src"),o.url):void 0;t.cover_url=u||g(l(e,"og:image"),o.url);let m=r?Array.from(r.querySelectorAll(".book-attribute a")).map(f=>c(f.textContent)).filter(f=>!!f):[],S=l(e,"og:novel:category");m.length?t.tags=[...new Set(m)]:S&&(t.tags=[S]);let x=r?Array.from(r.querySelectorAll(".book-attribute span")).map(f=>v(c(f.textContent))).find(f=>f!==void 0):void 0;t.serialization_status=x||v(l(e,"og:novel:status"));let w=(r?Array.from(r.querySelectorAll(".count cite")).find(f=>c(f.textContent)==="\\u5B57"):void 0)?.previousElementSibling,A=w?.tagName.toLowerCase()==="em"&&c(w.textContent)?`${c(w.textContent)}\\u5B57`:void 0;t.word_count_text=A||l(e,"og:novel:word_count");let R=r?c(d(r,".book-meta .update-time")?.replace(/^\u66F4\u65B0\u65F6\u95F4\\s*[\uFF1A:]\\s*/,"")):void 0,q=r?c(d(r,".book-latest-chapter")?.replace(/^\u6700\u65B0\u7AE0\u8282\\s*[\uFF1A:]\\s*/,"")):void 0;return t.last_updated_at=R||l(e,"og:novel:update_time"),t.latest_chapter=q||l(e,"og:novel:latest_chapter_name"),t.evidence.title=n?"#book-detail .book-info-top #bookName":"meta og:novel:book_name",t.evidence.authors=i?"#book-detail .book-info-top .book-meta .author":"meta og:novel:author",t.description&&(t.evidence.description=a?"#book-intro-detail\\uFF1B\\u4FDD\\u7559br\\u6362\\u884C":"meta og:novel:description / og:description"),t.cover_url&&(t.evidence.cover_url=u?"#book-detail #bookImg[data-bid\\u4E0E\\u4F5C\\u54C1ID\\u4E00\\u81F4] img[src]":"meta og:image"),t.tags&&(t.evidence.tags=m.length?"#book-detail .book-info-top .book-attribute a":"meta og:novel:category"),t.serialization_status&&(t.evidence.serialization_status=x?"#book-detail .book-info-top .book-attribute span":"meta og:novel:status"),t.word_count_text&&(t.evidence.word_count_text=A?"#book-detail .book-info-top .count\\uFF1B\\u4EC5\\u53D6\\u5B57\\u6570\\uFF0C\\u4FDD\\u7559\\u663E\\u793A\\u7CBE\\u5EA6":"meta og:novel:word_count"),t.last_updated_at&&(t.evidence.last_updated_at=R?"#book-detail .book-info-top .update-time\\uFF1B\\u975E\\u9996\\u53D1\\u65E5\\u671F":"meta og:novel:update_time\\uFF1B\\u975E\\u9996\\u53D1\\u65E5\\u671F"),t.latest_chapter&&(t.evidence.latest_chapter=q?"#book-detail .book-info-top .book-latest-chapter":"meta og:novel:latest_chapter_name"),t}};function P(e,o,t){for(let n of Array.from(e.querySelectorAll(\'script[type="application/ld+json"]\'))){let i;try{let u=JSON.parse(n.textContent||"");if(!u||typeof u!="object"||Array.isArray(u))continue;i=u}catch{continue}if(typeof i["@id"]!="string")continue;let s;try{s=t(i["@id"])}catch{continue}if(s.provider!==o.provider||s.id!==o.id)continue;let a=i.images??i.image,p=Array.isArray(a)?a:[a];for(let u of p){if(typeof u!="string")continue;let m=g(u,o.url);if(m)return{url:m,evidence:"\\u4F5C\\u54C1\\u9875 JSON-LD images/image\\uFF0C@id \\u4E0E\\u4F5C\\u54C1\\u94FE\\u63A5\\u4E00\\u81F4"}}}let r=g(e.querySelector(".page-header-info .book-cover-img")?.getAttribute("src"),o.url);if(!(!r||new URL(r).pathname.includes("/novel-static/5cb03bd354145bc7815a5e09d4b15cfc")))return{url:r,evidence:"\\u4F5C\\u54C1\\u9875 .page-header-info .book-cover-img[src]\\uFF0C\\u5DF2\\u6392\\u9664\\u5DF2\\u77E5\\u52A0\\u8F7D\\u5360\\u4F4D\\u56FE"}}var E={provider:"fanqie",name:"\\u756A\\u8304\\u5C0F\\u8BF4",recoveryHint:"\\u53EF\\u5728\\u6D4F\\u89C8\\u5668\\u6B63\\u5E38\\u6253\\u5F00\\u540E\\u9009\\u62E9\\u53E6\\u5B58\\u7684 HTML \\u6587\\u4EF6\\uFF0C\\u6216\\u624B\\u52A8\\u8865\\u586B\\u3002",matchUrl(e){let o=e.hostname==="fanqienovel.com"?/^\\/page\\/(\\d+)\\/?$/.exec(e.pathname)?.[1]:void 0;return o?{provider:"fanqie",id:o,url:`https://fanqienovel.com/page/${o}`}:void 0},identities(e,o,t){let{identities:r,addUrl:n}=b(e,o,t);if(!r.length)for(let i of Array.from(e.querySelectorAll(\'script[type="application/ld+json"]\'))){let s;try{s=JSON.parse(i.textContent||"")}catch{continue}let a=Array.isArray(s)?s:[s];for(let p of a)p&&typeof p=="object"&&typeof p["@id"]=="string"&&n(p["@id"],"\\u4F5C\\u54C1\\u9875 JSON-LD \\u9876\\u5C42 @id")}return r},parse(e,o,t){let r={title:"",authors:[],evidence:{},warnings:[]},n=e.querySelector(".page-header-info");r.title=n&&d(n,".info-name h1")||"";let i=n&&d(n,".author-name-text");i&&(r.authors=[i]);let s=P(e,o,t);return s&&(r.cover_url=s.url,r.evidence.cover_url=s.evidence),n&&(r.tags=Array.from(n.querySelectorAll(".info-label-grey")).map(a=>c(a.textContent)).filter(a=>!!a),r.serialization_status=v(d(n,".info-label-yellow")),r.word_count_text=d(n,".info-count-word")?.replace(/\\s/g,""),r.last_updated_at=d(n,".info-last-time"),r.latest_chapter=d(n,".info-last-title")?.replace(/^\u6700\u8FD1\u66F4\u65B0\\s*[\uFF1A:]\\s*/,"")),r.description=d(e,".page-body .page-abstract-content"),r.evidence.title="\\u4F5C\\u54C1\\u9875 .page-header-info .info-name h1",r.evidence.authors="\\u4F5C\\u54C1\\u9875 .page-header-info .author-name-text",r.description&&(r.evidence.description="\\u4F5C\\u54C1\\u9875 .page-body .page-abstract-content"),r.tags?.length&&(r.evidence.tags="\\u4F5C\\u54C1\\u9875 .page-header-info .info-label-grey"),r.serialization_status&&(r.evidence.serialization_status="\\u4F5C\\u54C1\\u9875 .info-label-yellow"),r.word_count_text&&(r.evidence.word_count_text="\\u4F5C\\u54C1\\u9875 .info-count-word\\uFF1B\\u4FDD\\u7559\\u7F51\\u7AD9\\u663E\\u793A\\u7CBE\\u5EA6"),r.last_updated_at&&(r.evidence.last_updated_at="\\u4F5C\\u54C1\\u9875 .info-last-time\\uFF1B\\u5E73\\u53F0\\u539F\\u59CB\\u663E\\u793A\\u65F6\\u95F4\\uFF0C\\u975E\\u9996\\u53D1\\u65E5\\u671F"),r.latest_chapter&&(r.evidence.latest_chapter="\\u4F5C\\u54C1\\u9875 .info-last-title"),r}};var k=[C,E];function y(e){let o=k.find(t=>t.provider===e);if(!o)throw new Error(`\\u4E0D\\u652F\\u6301\\u7684\\u4F5C\\u54C1\\u6765\\u6E90\\uFF1A${e}`);return o}function h(e){let o;try{o=new URL(e.trim())}catch{throw new Error("\\u8BF7\\u8F93\\u5165\\u5B8C\\u6574\\u7684\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\u94FE\\u63A5\\u3002")}if(!["https:","http:"].includes(o.protocol)||o.username||o.password||o.port)throw new Error("\\u4F5C\\u54C1\\u94FE\\u63A5\\u5FC5\\u987B\\u662F\\u666E\\u901A\\u7684 HTTP \\u6216 HTTPS \\u5B98\\u7F51\\u94FE\\u63A5\\u3002");for(let t of k){let r=t.matchUrl(o);if(r)return r}throw new Error(`\\u4EC5\\u652F\\u6301${k.map(t=>t.name).join("\\u3001")}\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\uFF1B\\u8BF7\\u52FF\\u4F7F\\u7528\\u7AE0\\u8282\\u6216\\u641C\\u7D22\\u9875\\u94FE\\u63A5\\u3002`)}function L(e,o,t="remote"){let r=y(o.provider),n=new DOMParser().parseFromString(e,"text/html"),i=B(r.identities(n,o,h),o),s=r.parse(n,o,h),a={...s,...o,fetched_at:new Date().toISOString(),acquisition:t,evidence:{identity:i,...s.evidence}};if(!a.title||a.authors.length===0)throw new Error("\\u672A\\u8BC6\\u522B\\u5230\\u53EF\\u9760\\u7684\\u4E66\\u540D\\u548C\\u4F5C\\u8005\\u3002\\u9875\\u9762\\u53EF\\u80FD\\u662F\\u9A8C\\u8BC1\\u9875\\u3001\\u767B\\u5F55\\u9875\\u6216\\u7ED3\\u6784\\u5DF2\\u53D8\\u5316\\uFF1B\\u8BF7\\u5728\\u6D4F\\u89C8\\u5668\\u786E\\u8BA4\\u4F5C\\u54C1\\u8BE6\\u60C5\\u9875\\uFF0C\\u6216\\u4F7F\\u7528\\u624B\\u52A8\\u5EFA\\u6863\\u3002");return a.cover_url||a.warnings.push("\\u672A\\u63D0\\u53D6\\u5230\\u53EF\\u7528\\u5C01\\u9762\\u5730\\u5740\\uFF0C\\u53EF\\u7A0D\\u540E\\u624B\\u52A8\\u8865\\u5145\\u3002"),a.description||a.warnings.push("\\u672A\\u63D0\\u53D6\\u5230\\u4F5C\\u54C1\\u7B80\\u4ECB\\uFF0C\\u53EF\\u7A0D\\u540E\\u624B\\u52A8\\u8865\\u5145\\u3002"),a.warnings.push("\\u672A\\u83B7\\u5F97\\u660E\\u786E\\u7684\\u9996\\u53D1\\u65E5\\u671F\\uFF0C\\u9996\\u53D1\\u5E74\\u4EFD\\u7559\\u7A7A\\uFF1B\\u4E0D\\u4F1A\\u7528\\u6700\\u8FD1\\u66F4\\u65B0\\u65F6\\u95F4\\u63A8\\u65AD\\u5E74\\u4EFD\\u3002"),a}function D(e){return JSON.stringify({format:"webnovel-import-capture",version:1,metadata:e})}async function z(e){try{let o=h(location.href),t=y(o.provider);if(!t.browserCapture)throw new Error("\\u6B64\\u6765\\u6E90\\u6682\\u4E0D\\u652F\\u6301\\u6D4F\\u89C8\\u5668\\u91C7\\u96C6\\u4E66\\u7B7E\\u3002");let r=Array.from(document.querySelectorAll(t.browserCapture.selectors.join(","))).map(a=>a.outerHTML).join(`\n`),n=L(r,o,"browser"),i=D(n);try{await navigator.clipboard.writeText(i)}catch{if(window.prompt("\\u6D4F\\u89C8\\u5668\\u672A\\u5141\\u8BB8\\u76F4\\u63A5\\u590D\\u5236\\u3002\\u8BF7\\u590D\\u5236\\u4E0B\\u65B9\\u5B8C\\u6574\\u8D44\\u6599\\uFF0C\\u518D\\u6309\\u786E\\u5B9A\\u8FD4\\u56DE Obsidian\\uFF1B\\u53D6\\u6D88\\u5219\\u505C\\u6B62\\u3002",i)===null)return}let s=new URLSearchParams({vault:e,clipboard:"1",provider:o.provider,id:o.id});location.assign(`obsidian://webnovel-import?${s}`)}catch(o){window.alert(`\\u7F51\\u6587\\u8D44\\u6599\\u5C1A\\u672A\\u91C7\\u96C6\\uFF1A${o instanceof Error?o.message:String(o)}`)}}return O(H);})();\n'};WebnovelBrowser.capture(${JSON.stringify(vault)});})()`;
}
function parseCapturePayload(raw) {
  let packet;
  try {
    packet = JSON.parse(raw);
  } catch {
    throw new Error("\u526A\u8D34\u677F\u4E0D\u662F\u7F51\u6587\u91C7\u96C6\u7ED3\u679C\u3002\u8BF7\u5728\u6B63\u5E38\u663E\u793A\u7684\u8D77\u70B9\u4F5C\u54C1\u9875\u70B9\u51FB\u91C7\u96C6\u4E66\u7B7E\u3002");
  }
  if (packet?.format !== "webnovel-import-capture" || packet.version !== 1 || !packet.metadata) {
    throw new Error("\u672A\u8BC6\u522B\u7684\u6D4F\u89C8\u5668\u91C7\u96C6\u683C\u5F0F\uFF0C\u8BF7\u4F7F\u7528\u5F53\u524D\u7248\u672C\u63D0\u4F9B\u7684\u91C7\u96C6\u4E66\u7B7E\u3002");
  }
  const value = packet.metadata;
  const ref = parseBookUrl(typeof value.url === "string" ? value.url : "");
  if (!getSourceAdapter(ref.provider).browserCapture || value.provider !== ref.provider || value.id !== ref.id || value.acquisition !== "browser") {
    throw new Error("\u91C7\u96C6\u8D44\u6599\u7684\u4F5C\u54C1\u6807\u8BC6\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u91C7\u96C6\u5BF9\u5E94\u7684\u8D77\u70B9\u8BE6\u60C5\u9875\u3002");
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
  if (["ongoing", "completed", "paused", "unknown"].includes(value.serialization_status)) {
    result.serialization_status = value.serialization_status;
  }
  for (const key of ["identity", "title", "authors", "description", "cover_url", "tags", "serialization_status", "word_count_text", "last_updated_at", "latest_chapter"]) {
    const evidence = value.evidence?.[key];
    if (typeof evidence === "string") result.evidence[key] = evidence;
  }
  result.evidence.acquisition = "\u7528\u6237\u5728\u6B63\u5E38\u663E\u793A\u7684\u4F5C\u54C1\u9875\u70B9\u51FB\u91C7\u96C6\u4E66\u7B7E\uFF0C\u7ECF\u672C\u673A\u526A\u8D34\u677F\u5BFC\u5165";
  result.warnings = [
    "\u6D4F\u89C8\u5668\u9875\u9762\u91C7\u96C6\uFF1B\u4E0D\u4EE3\u8868\u666E\u901A HTTP \u81EA\u52A8\u5237\u65B0\u5DF2\u53EF\u7528\u3002",
    "\u672A\u83B7\u5F97\u660E\u786E\u7684\u4F5C\u54C1\u9996\u53D1\u65E5\u671F\uFF0C\u9996\u53D1\u5E74\u4EFD\u7559\u7A7A\uFF1B\u4E0D\u4F1A\u7528\u6700\u8FD1\u66F4\u65B0\u65F6\u95F4\u6216\u7AE0\u8282\u65E5\u671F\u63A8\u65AD\u5E74\u4EFD\u3002"
  ];
  if (!result.cover_url) result.warnings.push("\u672A\u63D0\u53D6\u5230\u53EF\u7528\u5C01\u9762\u5730\u5740\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  if (!result.description) result.warnings.push("\u672A\u63D0\u53D6\u5230\u4F5C\u54C1\u7B80\u4ECB\uFF0C\u53EF\u7A0D\u540E\u624B\u52A8\u8865\u5145\u3002");
  return result;
}

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
    this.addCommand({ id: "import-browser-capture", name: "\u4ECE\u6D4F\u89C8\u5668\u91C7\u96C6\u7ED3\u679C\u5BFC\u5165", callback: () => void this.receiveBrowserCapture() });
    this.registerObsidianProtocolHandler("webnovel-import", (params) => {
      if (params.vault && params.vault !== this.app.vault.getName()) return;
      if (params.clipboard === "1") void this.receiveBrowserCapture({ provider: params.provider, id: params.id });
    });
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
  openSourcePage(input, target) {
    const ref = parseBookUrl(input);
    this.browserTarget = { key: sourceKey(ref), file: target };
    window.open(ref.url, "_blank", "noopener,noreferrer");
  }
  async receiveBrowserCapture(expected) {
    try {
      const metadata = parseCapturePayload(await navigator.clipboard.readText());
      if (expected && (metadata.provider !== expected.provider || metadata.id !== expected.id)) {
        throw new Error("\u526A\u8D34\u677F\u5185\u5BB9\u4E0E\u521A\u91C7\u96C6\u7684\u4F5C\u54C1\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u91CD\u65B0\u70B9\u51FB\u8BE5\u4F5C\u54C1\u7684\u91C7\u96C6\u4E66\u7B7E\u3002");
      }
      const pending = this.browserTarget;
      const target = pending?.key === sourceKey(metadata) ? pending.file : void 0;
      if (target && this.app.vault.getAbstractFileByPath(target.path) !== target) {
        throw new Error("\u539F\u5148\u9009\u5B9A\u7684\u76EE\u6807\u7B14\u8BB0\u5DF2\u7ECF\u79FB\u52A8\u6216\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u5173\u8054\u6765\u6E90\u5165\u53E3\u3002");
      }
      new SingleImportModal(this, target, { metadata, onSaved: () => {
        if (pending?.key === sourceKey(metadata) && this.browserTarget === pending) this.browserTarget = void 0;
      } }).open();
    } catch (error) {
      new import_obsidian3.Notice(`\u6D4F\u89C8\u5668\u91C7\u96C6\u5BFC\u5165\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`, 1e4);
    }
  }
  async refresh(file) {
    let sources;
    try {
      sources = this.importer.sources(file);
    } catch (error) {
      new import_obsidian3.Notice(error instanceof Error ? error.message : String(error), 1e4);
      return;
    }
    let recoveryUrl;
    for (const source of sources) {
      try {
        const metadata = await this.importer.fetch(source.url);
        const result = await this.importer.import(metadata, file);
        new import_obsidian3.Notice(`${providerName(source.provider)}\u5DF2\u5237\u65B0\uFF1A\u91C7\u7528 ${result.adopted.length} \u9879\uFF0C\u4FDD\u7559 ${result.preserved.length} \u9879\u4EBA\u5DE5/\u5176\u4ED6\u6765\u6E90\u503C\u3002${result.warnings.length ? `
${result.warnings.join("\n")}` : ""}`, 8e3);
      } catch (error) {
        recoveryUrl ?? (recoveryUrl = source.url);
        new import_obsidian3.Notice(`${providerName(source.provider)}\u5237\u65B0\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`, 1e4);
      }
    }
    if (recoveryUrl) new SingleImportModal(this, file, { url: recoveryUrl }).open();
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
    this.containerEl.createEl("p", { text: "\u4F5C\u54C1\u5143\u6570\u636E\u5BFC\u5165\u5668 \xB7 0.1.1 \u5F00\u53D1\u9884\u89C8\u3002\u8D77\u70B9\u652F\u6301\u6D4F\u89C8\u5668\u9875\u9762\u91C7\u96C6\uFF1B\u666E\u901A HTTP \u83B7\u53D6\u4ECD\u53EF\u80FD\u9047\u5230\u9A8C\u8BC1\u9875\u3002" });
    new import_obsidian3.Setting(this.containerEl).setName("\u8D77\u70B9\u6D4F\u89C8\u5668\u91C7\u96C6\u4E66\u7B7E").setDesc("\u590D\u5236\u540E\uFF0C\u5728\u6D4F\u89C8\u5668\u65B0\u5EFA\u4E66\u7B7E\uFF0C\u628A\u5185\u5BB9\u7C98\u8D34\u5230\u4E66\u7B7E\u7684\u7F51\u5740\u680F\u3002\u6B63\u5E38\u6253\u5F00\u8D77\u70B9\u4F5C\u54C1\u9875\u540E\u70B9\u51FB\u4E66\u7B7E\uFF0C\u5373\u53EF\u628A\u8D44\u6599\u5E26\u56DE\u5F53\u524D Vault \u7684\u5BFC\u5165\u9884\u89C8\u3002\u53EA\u8BFB\u53D6\u4F5C\u54C1\u8D44\u6599\uFF0C\u901A\u8FC7\u672C\u673A\u526A\u8D34\u677F\u4F20\u9012\u3002").addButton((button) => button.setButtonText("\u590D\u5236\u91C7\u96C6\u4E66\u7B7E").onClick(async () => {
      try {
        await navigator.clipboard.writeText(makeBookmarklet(this.plugin.app.vault.getName()));
        new import_obsidian3.Notice("\u5DF2\u590D\u5236\u3002\u8BF7\u5C06\u5176\u7C98\u8D34\u5230\u6D4F\u89C8\u5668\u4E66\u7B7E\u7684\u7F51\u5740\u680F\uFF0C\u5E76\u4FDD\u7559\u5F00\u5934\u7684 javascript:\u3002", 1e4);
      } catch (error) {
        new import_obsidian3.Notice(`\u590D\u5236\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`);
      }
    }));
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
