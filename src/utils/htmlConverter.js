/**
 * Convert HTML content to plain text
 * @param {string} html - HTML string to convert
 * @returns {string} - Plain text without HTML tags
 */
export const extractTextFromHtml = (html) => {
  if (!html) return '';
  
  // Create a temporary DOM element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and clean up
  const text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Clean up extra whitespace and newlines
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

/**
 * Extract first paragraph or summary from HTML content
 * @param {string} html - HTML string to extract from
 * @param {number} maxLength - Maximum length of the summary (default: 150)
 * @returns {string} - Truncated summary text
 */
export const getArticleSummary = (html, maxLength = 150) => {
  const text = extractTextFromHtml(html);
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last complete word before the limit
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  return lastSpaceIndex > 0 
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
};

/**
 * Convert HTML content to JSX-safe content
 * @param {string} html - HTML string to convert
 * @returns {string} - JSX-safe content
 */
export const htmlToJsx = (html) => {
  if (!html) return '';
  
  // Replace common HTML entities
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

/**
 * Extract image URL from HTML content
 * @param {string} html - HTML string to extract from
 * @returns {string|null} - First image URL found, or null if none
 */
export const extractFirstImageUrl = (html) => {
  if (!html) return null;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const img = tempDiv.querySelector('img');
  return img ? img.src : null;
};

/**
 * Remove all HTML tags from content
 * @param {string} html - HTML string to clean
 * @returns {string} - Clean text content
 */
export const stripHtmlTags = (html) => {
  if (!html) return '';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  return tempDiv.textContent || tempDiv.innerText || '';
};
