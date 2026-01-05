// frontend/src/services/api.js
const API_URL = "http://localhost:5000";

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem("token");
};

// Auth endpoints
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

// Avatar endpoints
export const getAvatar = async () => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/avatar`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return res.json();
};

export const saveAvatar = async (measurements, readyPlayerMeUrl = null, parametricData = null) => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ measurements, readyPlayerMeUrl, parametricData })
  });
  return res.json();
};

export const addWearable = async (url, name, thumbnail) => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/avatar/wearables`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ url, name, thumbnail })
  });
  return res.json();
};

export const deleteWearable = async (wearableId) => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/avatar/wearables/${wearableId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return res.json();
};

export const saveSet = async (name, wearables) => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/avatar/sets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name, wearables })
  });
  return res.json();
};

export const deleteSet = async (setId) => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/avatar/sets/${setId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return res.json();
};

export const uploadAvatarPhotos = async (formData) => {
  const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5000/avatar/measure", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
};

