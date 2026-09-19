import axios from "axios";

// Automatically use Vercel/Production URL or fallback to localhost for development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://answer-os-dusky.vercel.app";

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token dynamically from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (credentials) => API.post("/auth/login", credentials),
  signup: (userData) => API.post("/auth/signup", userData),
  getMe: () => API.get("/auth/me"),
  getUserDetails: () => API.get("/auth/userdetails"),
};

export const chatAPI = {
  sendMessage: (payload) => API.post("/chat", payload),
};

export const conversationAPI = {
  startConversation: () => API.post("/conversations/start"),
  getConversations: () => API.get("/conversations"),
  getMessages: (convoId) => API.get(`/conversations/${convoId}/messages`),
  endConversation: (convoId, data) => API.post(`/conversations/${convoId}/end`, data),
  submitFeedback: (payload) => API.post("/conversations/feedback", payload),
  getDailyAnalytics: () => API.get("/conversations/analytics/daily"),
  getFailingDocuments: () => API.get("/conversations/analytics/failing-documents"),
};

export const documentAPI = {
  uploadDocument: (formData) =>
    API.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default API;