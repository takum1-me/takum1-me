export function fetchWithAuth(path: string) {
  const url = `${import.meta.env.MICROCMS_API_URL}${path}`;
  const headers = {
    "X-MICROCMS-API-KEY": import.meta.env.MICROCMS_API_KEY,
  };
  return fetch(url, {
    headers,
  });
}
