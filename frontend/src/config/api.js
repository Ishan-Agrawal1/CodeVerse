const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

// Normalize by removing any trailing slashes to avoid double slashes in requests.
export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const API_ENDPOINTS = {
  auth: `${API_BASE_URL}/auth`,
  workspaces: `${API_BASE_URL}/workspaces`,
  aiChat: `${API_BASE_URL}/ai/chat`,
  compile: `${BACKEND_URL}/compile`,
};
