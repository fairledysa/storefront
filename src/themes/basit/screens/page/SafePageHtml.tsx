"use client";

import {
  createElement,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Props = {
  html: string;
};

const ALLOWED_BLOCKS = new Set([
  "H1",
  "H2",
  "H3",
  "P",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
]);

const ALLOWED_INLINE = new Set(["STRONG", "B", "EM", "I", "U", "BR"]);

function safeUrl(value: string, allowImages = false) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (
    raw.startsWith("/") ||
    raw.startsWith("#") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw;
  }

  if (allowImages && raw.startsWith("data:image/")) return raw;

  return "";
}

function decodeHtmlEntities(value: string) {
  if (typeof document === "undefined") return value;

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;

  return textarea.value;
}

function renderChildren(node: Node, keyPrefix: string): ReactNode[] {
  return Array.from(node.childNodes).map((child, index) =>
    renderNode(child, `${keyPrefix}-${index}`),
  );
}

function isTextOnlyElement(element: Element) {
  return Array.from(element.childNodes).every(
    (child) => child.nodeType === Node.TEXT_NODE,
  );
}

function markdownHeadingFromParagraph(element: Element) {
  if (element.tagName.toUpperCase() !== "P" || !isTextOnlyElement(element)) {
    return null;
  }

  const text = String(element.textContent || "").trim();
  const match = /^(#{1,3})\s+(.+)$/.exec(text);

  if (!match) return null;

  return {
    tag: `h${match[1].length}`,
    text: match[2].trim(),
  };
}

function hasMeaningfulContent(element: Element): boolean {
  const tag = element.tagName.toUpperCase();
  const text = String(element.textContent || "").trim();

  if (text) return true;
  if (element.querySelector("img,table")) return true;

  if (tag === "UL" || tag === "OL") {
    return Array.from(element.querySelectorAll("li")).some((item) =>
      hasMeaningfulContent(item),
    );
  }

  return false;
}

function renderNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const tag = element.tagName.toUpperCase();
  const children = renderChildren(element, key);
  const markdownHeading = markdownHeadingFromParagraph(element);

  if (markdownHeading) {
    return createElement(markdownHeading.tag, { key }, markdownHeading.text);
  }

  if (tag === "A") {
    const href = safeUrl(element.getAttribute("href") || "");
    if (!href) return <span key={key}>{children}</span>;

    return <a key={key} href={href}>{children}</a>;
  }

  if (tag === "IMG") {
    const src = safeUrl(element.getAttribute("src") || "", true);
    if (!src) return null;

    return (
      <img
        key={key}
        src={src}
        alt={element.getAttribute("alt") || ""}
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (ALLOWED_INLINE.has(tag)) {
    if (tag === "BR") return <br key={key} />;
    if (tag === "STRONG" || tag === "B") return <strong key={key}>{children}</strong>;
    if (tag === "EM" || tag === "I") return <em key={key}>{children}</em>;
    if (tag === "U") return <u key={key}>{children}</u>;
  }

  if (!ALLOWED_BLOCKS.has(tag)) return <span key={key}>{children}</span>;

  if (!hasMeaningfulContent(element)) return null;

  return createElement(tag.toLowerCase(), { key }, children);
}

export default function SafePageHtml({ html }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nodes = useMemo(() => {
    if (!mounted || typeof window === "undefined") return null;

    const parser = new DOMParser();
    const source = decodeHtmlEntities(String(html || ""));
    const doc = parser.parseFromString(source, "text/html");

    return renderChildren(doc.body, "html");
  }, [html, mounted]);

  if (!mounted) return null;

  return <>{nodes}</>;
}
