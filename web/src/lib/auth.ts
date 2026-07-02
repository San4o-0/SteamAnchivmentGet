// JWT від бекенду (Потік 1): видається редіректом на /auth/callback?token=...,
// далі йде в заголовку Authorization: Bearer <jwt>.

const TOKEN_KEY = "sam.token";

// На MSW-моках бекенду немає — авторизація не потрібна.
export const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== "false";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthed(): boolean {
  return mocksEnabled || getToken() !== null;
}
