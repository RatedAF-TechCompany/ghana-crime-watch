// IndexNow (free): tells Bing, Yandex, Seznam, Naver etc. a URL changed. Google does not use it.
// The key file is served from /public/80bfe9da3ff3aba30c81a08c695c9784.txt.
export const INDEXNOW_KEY = "80bfe9da3ff3aba30c81a08c695c9784";

export async function pingIndexNow(urls: string[]): Promise<number | null> {
  if (!urls.length) return null;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: "www.ghanacrimes.com", key: INDEXNOW_KEY, keyLocation: `https://www.ghanacrimes.com/${INDEXNOW_KEY}.txt`, urlList: urls.slice(0, 10000) }),
      signal: AbortSignal.timeout(8000),
    });
    return res.status;
  } catch (e) {
    console.error("IndexNow ping failed", e); // never blocks publishing
    return null;
  }
}
