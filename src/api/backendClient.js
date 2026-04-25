// @ts-nocheck
function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "http://localhost:4000/api";
  }

  const clean = raw.replace(/\/+$/, "");
  return /\/api$/i.test(clean) ? clean : `${clean}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_API_URL ||
    import.meta.env.VITE_BASE44_APP_BASE_URL,
);
let accessTokenCache = null;

export function setAccessToken(token) {
  accessTokenCache = token || null;
}

export function getAccessToken() {
  return accessTokenCache;
}

export function clearAccessToken() {
  accessTokenCache = null;
}

function shouldAttachJsonContentType(body) {
  return body !== undefined && !(body instanceof FormData);
}

async function rawRequest(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (shouldAttachJsonContentType(body)) {
    headers["Content-Type"] = "application/json";
  }

  const effectiveToken = accessTokenCache || token;
  if (effectiveToken) {
    headers.Authorization = `Bearer ${effectiveToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      body === undefined
        ? undefined
        : shouldAttachJsonContentType(body)
          ? JSON.stringify(body)
          : body,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data };
}

async function rawRequestBlob(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (shouldAttachJsonContentType(body)) {
    headers["Content-Type"] = "application/json";
  }

  const effectiveToken = accessTokenCache || token;
  if (effectiveToken) {
    headers.Authorization = `Bearer ${effectiveToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      body === undefined
        ? undefined
        : shouldAttachJsonContentType(body)
          ? JSON.stringify(body)
          : body,
  });

  return { response };
}

function shouldTryRefresh(path) {
  return ![
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
    "/auth/otp/verify",
    "/auth/otp/resend",
    "/auth/forgot-password",
    "/auth/reset-password",
  ].some((item) => path.startsWith(item));
}

async function request(path, options = {}) {
  const { retryOnAuth = true } = options;
  let { response, data } = await rawRequest(path, options);

  if (response.status === 401 && retryOnAuth && shouldTryRefresh(path)) {
    const refreshResult = await rawRequest("/auth/refresh", { method: "POST" });
    if (refreshResult.response.ok && refreshResult.data?.accessToken) {
      setAccessToken(refreshResult.data.accessToken);
      ({ response, data } = await rawRequest(path, {
        ...options,
        token: refreshResult.data.accessToken,
      }));
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function getFilenameFromContentDisposition(contentDispositionValue) {
  if (!contentDispositionValue) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDispositionValue);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(contentDispositionValue);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const simpleMatch = /filename=([^;]+)/i.exec(contentDispositionValue);
  if (simpleMatch?.[1]) {
    return simpleMatch[1].trim().replace(/^"|"$/g, "");
  }

  return null;
}

async function requestBlob(path, options = {}) {
  const { retryOnAuth = true } = options;
  let { response } = await rawRequestBlob(path, options);

  if (response.status === 401 && retryOnAuth && shouldTryRefresh(path)) {
    const refreshResult = await rawRequest("/auth/refresh", { method: "POST" });
    if (refreshResult.response.ok && refreshResult.data?.accessToken) {
      setAccessToken(refreshResult.data.accessToken);
      ({ response } = await rawRequestBlob(path, {
        ...options,
        token: refreshResult.data.accessToken,
      }));
    }
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const error = new Error(errorData?.error || "Request failed");
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  const blob = await response.blob();
  const contentType =
    response.headers.get("content-type") ||
    blob.type ||
    "application/octet-stream";
  const contentDisposition = response.headers.get("content-disposition") || "";
  const filename = getFilenameFromContentDisposition(contentDisposition);

  return {
    blob,
    contentType,
    filename,
  };
}

export const backendApi = {
  auth: {
    register: (payload) =>
      request("/auth/register", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    registerRestaurant: (payload) =>
      request("/auth/register-restaurant", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    login: (payload) =>
      request("/auth/login", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    verifyOtp: (payload) =>
      request("/auth/otp/verify", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    resendOtp: (payload) =>
      request("/auth/otp/resend", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    forgotPassword: (payload) =>
      request("/auth/forgot-password", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    resetPassword: (payload) =>
      request("/auth/reset-password", {
        method: "POST",
        body: payload,
        retryOnAuth: false,
      }),
    donorQuizStatus: (token) => request("/auth/donor-quiz/status", { token }),
    submitDonorQuiz: (token, payload) =>
      request("/auth/donor-quiz/submit", {
        method: "POST",
        token,
        body: payload,
      }),
    refresh: () =>
      request("/auth/refresh", { method: "POST", retryOnAuth: false }),
    logout: () =>
      request("/auth/logout", { method: "POST", retryOnAuth: false }),
    me: (token) => request("/auth/me", { token }),
    updateMe: (token, payload) =>
      request("/auth/me", { method: "PATCH", token, body: payload }),
  },
  restaurants: {
    getMe: (token) => request("/restaurants/me", { token }),
    uploadDocuments: (formData) =>
      request("/restaurants/documents", { method: "POST", body: formData }),
    verifySiren: (token, payload) =>
      request("/restaurants/verify-siren", {
        method: "POST",
        token,
        body: payload,
      }),
  },
  messages: {
    send: (token, payload) =>
      request("/messages", { method: "POST", token, body: payload }),
    listConversations: (token) => request("/messages/conversations", { token }),
    listWithPartner: (token, partnerEmail) =>
      request(`/messages/with/${encodeURIComponent(partnerEmail)}`, { token }),
    markRead: (token, messageId) =>
      request(`/messages/${encodeURIComponent(messageId)}/read`, {
        method: "PATCH",
        token,
      }),
  },
  meals: {
    list: (filters = {}, sort = "-created_date", limit = 100) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      });
      params.set("sort", sort);
      params.set("limit", String(limit));
      return request(`/meals?${params.toString()}`).then((d) =>
        Array.isArray(d?.meals) ? d.meals : [],
      );
    },
    getById: (id) =>
      request(`/meals/${encodeURIComponent(id)}`).then((d) => d?.meal || null),
    create: (token, payload) =>
      request("/meals", { method: "POST", token, body: payload }).then(
        (d) => d?.meal,
      ),
    update: (token, id, payload) =>
      request(`/meals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        token,
        body: payload,
      }).then((d) => d?.meal),
    remove: (token, id) =>
      request(`/meals/${encodeURIComponent(id)}`, { method: "DELETE", token }),
  },
  reports: {
    create: (token, payload) =>
      request("/reports", { method: "POST", token, body: payload }).then(
        (d) => d?.report,
      ),
  },
  verification: {
    upload: (token, file) => {
      const formData = new FormData();
      formData.append("document", file);
      return request("/verification/upload", {
        method: "POST",
        token,
        body: formData,
      });
    },
    status: (token) => request("/verification/status", { token }),
  },
  admin: {
    listVerifications: (token, status = "PENDING") => {
      const params = new URLSearchParams({ status });
      return request(`/admin/verifications?${params.toString()}`, { token });
    },
    listUsers: (token, filters = {}) => {
      const params = new URLSearchParams();
      if (filters.role && filters.role !== "ALL") {
        params.set("role", filters.role);
      }
      if (filters.accountStatus && filters.accountStatus !== "ALL") {
        params.set("accountStatus", filters.accountStatus);
      }
      const query = params.toString();
      return request(`/admin/users${query ? `?${query}` : ""}`, { token });
    },
    reviewVerification: (token, id, payload) =>
      request(`/admin/verifications/${encodeURIComponent(id)}`, {
        method: "PUT",
        token,
        body: payload,
      }),
    getVerificationDocument: (token, id, options = {}) => {
      const params = new URLSearchParams();
      if (options.download) {
        params.set("download", "1");
      }
      const query = params.toString();
      return requestBlob(
        `/admin/verifications/${encodeURIComponent(id)}/document${query ? `?${query}` : ""}`,
        { token },
      );
    },
  },
};
