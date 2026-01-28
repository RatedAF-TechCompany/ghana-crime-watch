/**
 * Calculate reading time for article content
 * Based on average reading speed of 200 words per minute
 */
export function calculateReadingTime(content: string): string {
  // Strip HTML tags
  const textContent = content.replace(/<[^>]*>/g, "");
  
  // Count words
  const words = textContent.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  // Calculate minutes (200 wpm average)
  const minutes = Math.ceil(wordCount / 200);
  
  if (minutes < 1) {
    return "1 min read";
  }
  
  return `${minutes} min read`;
}
