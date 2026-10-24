import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function renderSafeMarkdown(markdownText = '') {
  const rawHtml = marked.parse(markdownText);
  return DOMPurify.sanitize(rawHtml);
}