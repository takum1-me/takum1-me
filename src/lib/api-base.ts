export function fetchWithAuth(path: string) {
  const apiUrl = import.meta.env.MICROCMS_API_URL;
  const apiKey = import.meta.env.MICROCMS_API_KEY;

  if (!apiUrl) {
    throw new Error("MICROCMS_API_URL environment variable is not set");
  }

  if (!apiKey) {
    throw new Error("MICROCMS_API_KEY environment variable is not set");
  }

  const url = `${apiUrl}${path}`;
  const headers = {
    "X-MICROCMS-API-KEY": apiKey,
  };

  return fetch(url, {
    headers,
  }).catch((error) => {
    throw error;
  });
}
