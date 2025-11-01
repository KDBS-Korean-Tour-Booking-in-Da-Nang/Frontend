// Minimal HTML sanitizer to allow safe rendering of rich text (img, p, br, strong, em, a, ul, li, headings)
// Removes script/style tags and event handler attributes like onClick, onError, etc.

const DISALLOWED_TAGS_REGEX = /<\/(?:script|style)[^>]*>|<(?:script|style)(?:\s|>)/gi;
const EVENT_HANDLER_ATTR_REGEX = /\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_HREF_REGEX = /href\s*=\s*("|')\s*javascript:[^"']*(\1)/gi;
const JAVASCRIPT_SRC_REGEX = /src\s*=\s*("|')\s*javascript:[^"']*(\1)/gi;

export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  let sanitized = html;
  // Remove script/style tags completely
  sanitized = sanitized.replace(DISALLOWED_TAGS_REGEX, '');
  // Remove inline event handlers like onclick, onerror, etc.
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_REGEX, '');
  // Disallow javascript: in href/src
  sanitized = sanitized.replace(JAVASCRIPT_HREF_REGEX, '');
  sanitized = sanitized.replace(JAVASCRIPT_SRC_REGEX, '');
  return sanitized;
};

export default sanitizeHtml;


