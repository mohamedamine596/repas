import { useEffect } from "react";

const BASE_URL = "https://repas-fraiche.vercel.app";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;

/**
 * useSEO — dynamically update page title, meta description, OG and Twitter tags.
 *
 * @param {object} options
 * @param {string} options.title        — Page title (appended with " | Repas Solidaire")
 * @param {string} options.description  — Meta description (max ~160 chars)
 * @param {string} [options.image]      — OG image URL (absolute)
 * @param {string} [options.url]        — Canonical URL (absolute). Defaults to current page.
 * @param {string} [options.type]       — OG type. Default "website"
 * @param {object} [options.jsonLd]     — JSON-LD structured data object
 */
export function useSEO({ title, description, image, url, type = "website", jsonLd } = {}) {
  useEffect(() => {
    const siteName = "Repas Solidaire";
    const fullTitle = title ? `${title} | ${siteName}` : `${siteName} — Donnez ou trouvez des repas gratuits`;
    const canonicalUrl = url || (typeof window !== "undefined" ? window.location.href : BASE_URL);
    const ogImage = image || DEFAULT_IMAGE;

    // Title
    document.title = fullTitle;

    // Helper to set or create a meta tag
    function setMeta(selector, content) {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const attr = selector.includes("property=") ? "property" : "name";
        const value = selector.match(/["']([^"']+)["']/)?.[1] || "";
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    function setLink(rel, href) {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    }

    // Standard meta
    setMeta('meta[name="description"]', description || "");
    setLink("canonical", canonicalUrl);

    // Open Graph
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description || "");
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[property="og:type"]', type);
    setMeta('meta[property="og:image"]', ogImage);

    // Twitter
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description || "");
    setMeta('meta[name="twitter:image"]', ogImage);

    // JSON-LD
    if (jsonLd) {
      let script = document.getElementById("page-jsonld");
      if (!script) {
        script = document.createElement("script");
        script.id = "page-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    // Cleanup JSON-LD when navigating away (if no jsonLd provided)
    return () => {
      if (!jsonLd) {
        const script = document.getElementById("page-jsonld");
        if (script) script.remove();
      }
    };
  }, [title, description, image, url, type, jsonLd]);
}
