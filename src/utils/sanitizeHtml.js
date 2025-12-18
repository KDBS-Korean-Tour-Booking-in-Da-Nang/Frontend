// Minimal HTML sanitizer to allow safe rendering of rich text (img, p, br, strong, em, a, ul, li, headings)
// Removes script/style tags and event handler attributes like onClick, onError, etc.

const DISALLOWED_TAGS_REGEX = /<\/(?:script|style)[^>]*>|<(?:script|style)(?:\s|>)/gi;
const EVENT_HANDLER_ATTR_REGEX = /\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_HREF_REGEX = /href\s*=\s*("|')\s*javascript:[^"']*(\1)/gi;
const JAVASCRIPT_SRC_REGEX = /src\s*=\s*("|')\s*javascript:[^"']*(\1)/gi;

// Sanitize HTML: loại bỏ script/style tags và event handlers để render an toàn
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  let sanitized = html;
  // Loại bỏ hoàn toàn script/style tags
  sanitized = sanitized.replace(DISALLOWED_TAGS_REGEX, '');
  // Loại bỏ inline event handlers như onclick, onerror, etc.
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_REGEX, '');
  // Không cho phép javascript: trong href/src
  sanitized = sanitized.replace(JAVASCRIPT_HREF_REGEX, '');
  sanitized = sanitized.replace(JAVASCRIPT_SRC_REGEX, '');
  return sanitized;
};

export default sanitizeHtml;


