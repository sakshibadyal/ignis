function getAuthHeaders() {
  const token = localStorage.getItem("ignis-token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function request(path, options) {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON responses
  }

  if (!res.ok) {
    const message =
      data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup: async ({ name, email, password }) =>
    request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: async ({ email, password }) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  createRoom: async ({ name }) =>
    request("/api/rooms/create", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    }),

  joinRoom: async ({ roomId }) =>
    request("/api/rooms/join", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId }),
    }),

  getMyRooms: async () =>
    request("/api/rooms/my", {
      method: "GET",
      headers: getAuthHeaders(),
    }),

  getRoomMembers: async ({ roomId }) =>
    request(`/api/rooms/members?roomId=${encodeURIComponent(roomId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    }),

  updateRoomMemberRole: async ({ roomId, memberUserId, role }) =>
    request("/api/rooms/member-role", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ roomId, memberUserId, role }),
    }),

  getFiles: async ({ roomId }) =>
    request(`/api/files?roomId=${encodeURIComponent(roomId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
    }),

  createFile: async ({ name, type, content, language, parentId, roomId }) =>
    request("/api/files/create", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        type,
        content,
        language,
        parentId,
        roomId,
      }),
    }),

  updateFile: async ({ fileId, name, content, language }) =>
    request("/api/files/update", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fileId,
        name,
        content,
        language,
      }),
    }),

  deleteFile: async ({ fileId }) =>
    request("/api/files/delete", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ fileId }),
    }),

  executeCode: async ({ code, language }) =>
    request("/api/terminal/execute", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, language }),
    }),
};

export { getAuthHeaders };

