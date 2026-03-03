// frontend/src/services/api.js
const API_URL = "http://localhost:5000";
// Base URL of your VTON FastAPI/ngrok server, e.g. https://xxx.ngrok-free.dev
const VTON_API_BASE_URL = import.meta.env.VITE_VTON_API_BASE_URL || "";

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

// ── 3D Model Generation (PIFuHD) ──────────────────────────────────────────
export const generateModels = async (formData) => {
  const res = await fetch(`${API_URL}/avatar/generate`, {
    method: "POST",
    headers: { ...authHeader() }, // Let browser set multipart boundary
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

// ── Virtual Try-On via FastAPI/ngrok (async job) ───────────────────────────

// 1) Start job: POST /tryon -> { job_id }
export const startTryOnJob = async (personFile, garmentFile) => {
  if (!VTON_API_BASE_URL) {
    throw new Error("VITE_VTON_API_BASE_URL is not set. Please add it to your frontend .env.");
  }

  const formData = new FormData();
  formData.append("person", personFile);
  formData.append("garment", garmentFile);

  const res = await fetch(`${VTON_API_BASE_URL}/tryon`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Try-on API error (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json().catch(() => null);
  if (!data || !data.job_id) {
    throw new Error("Try-on API did not return a job_id.");
  }

  return data.job_id;
};

// 2) Poll result: GET /result/{job_id}
// - If ready: returns image/png bytes
// - If not: returns JSON { status: "processing" | ... }
export const fetchTryOnResult = async (jobId) => {
  if (!VTON_API_BASE_URL) {
    throw new Error("VITE_VTON_API_BASE_URL is not set. Please add it to your frontend .env.");
  }

  const res = await fetch(`${VTON_API_BASE_URL}/result/${jobId}`);

  const contentType = res.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return { done: true, url };
  }

  // Not ready yet – assume JSON status payload
  const json = await res.json().catch(() => ({}));
  return { done: false, status: json.status || "processing" };
};