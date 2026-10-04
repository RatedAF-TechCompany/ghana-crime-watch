import sanitizeHtml from 'sanitize-html';

/** Isomorphic article-body sanitiser (works during server rendering and in the browser). */
export function sanitizeArticleBody(body: string): string {
  return sanitizeHtml(body, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'mark', 'blockquote'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    },
  });
}
