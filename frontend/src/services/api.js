// frontend/src/services/api.js
const API_URL = "http://localhost:5000";

const getToken = () => localStorage.getItem("token");

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

export const signup = async (username, email, password) => {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
};

// ── Avatar ────────────────────────────────────────────────────────────────────
export const getAvatar = async () => {
  const res = await fetch(`${API_URL}/avatar`, {
    headers: { ...authHeader() },
  });
  return res.json();
};

export const saveAvatar = async (measurements) => {
  const res = await fetch(`${API_URL}/avatar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ measurements }),
  });
  return res.json();
};

export const addWearable = async (url, name, thumbnail) => {
  const res = await fetch(`${API_URL}/avatar/wearables`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ url, name, thumbnail }),
  });
  return res.json();
};

export const deleteWearable = async (wearableId) => {
  const res = await fetch(`${API_URL}/avatar/wearables/${wearableId}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  return res.json();
};

export const saveSet = async (name, wearables) => {
  const res = await fetch(`${API_URL}/avatar/sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ name, wearables }),
  });
  return res.json();
};

export const deleteSet = async (setId) => {
  const res = await fetch(`${API_URL}/avatar/sets/${setId}`, {
    method: "DELETE",
    headers: { ...authHeader() },
  });
  return res.json();
};

// ── SMPL 3D Body Generation ───────────────────────────────────────────────────
/**
 * Upload 4 body images + height to generate a personalised SMPL 3D avatar.
 *
 * @param {FormData} formData  Fields: front, back, left, right (File), height (string)
 * @returns {{ success, measurements, modelUrl }}
 */
export const generateSMPLAvatar = async (formData) => {
  const res = await fetch(`${API_URL}/api/measurements/calculate`, {
    method: "POST",
    headers: { ...authHeader() }, // Do NOT set Content-Type – let browser set multipart boundary
    body: formData,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Server error (${res.status}): ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
};