const baseUrl = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The field guide could not reach the server.');
  return body;
}

export const captureSpecies = ({ imageBase64, userId, deviceMeta }) => request('/api/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-device-id': userId },
  body: JSON.stringify({ imageBase64, userId, deviceMeta })
});

export const fetchLibrary = (userId) => request(`/api/library/${encodeURIComponent(userId)}`);

