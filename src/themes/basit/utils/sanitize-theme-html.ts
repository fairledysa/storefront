const BLOCKED_CONTAINER_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "textarea",
  "select",
  "option",
  "button",
  "input",
  "meta",
  "link",
  "base",
  "svg",
  "math",
  "template",
];

function stripBlockedTags(value: string) {
  let output = value;

  for (const tag of BLOCKED_CONTAINER_TAGS) {
    output = output.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      "",
    );
    output = output.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }

  return output;
}

/**
 * Conservative sanitizer for merchant-authored theme HTML.
 * Preserves ordinary content/layout markup while removing executable markup,
 * forms, embedded documents and unsafe URL schemes.
 */
export function sanitizeThemeHtml(input: unknown) {
  let html = stripBlockedTags(String(input ?? ""));

  html = html
    .replace(/\s(?:on[a-z0-9_-]+|srcdoc|xmlns(?::[a-z0-9_-]+)?)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src|action|formaction|poster|xlink:href)\s*=\s*(["'])\s*(?:javascript|vbscript|data\s*:\s*text\/html)[\s\S]*?\1/gi, "")
    .replace(/\s(?:href|src|action|formaction|poster|xlink:href)\s*=\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^\s>]*/gi, "")
    .replace(/\sstyle\s*=\s*(["'])[^"']*(?:expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding)[\s\S]*?\1/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  html = html.replace(
    /<a\b([^>]*)\btarget\s*=\s*(["'])_blank\2([^>]*)>/gi,
    (match, before, _quote, after) => {
      const attrs = `${before}${after}`;
      if (/\brel\s*=/.test(attrs)) return match;
      return `<a${before} target="_blank"${after} rel="noopener noreferrer">`;
    },
  );

  return html;
}
