// API 베이스 경로.
// 기본값은 빈 문자열 → 상대경로 "/api/..."로 호출되어 Vite 프록시(dev) 또는
// 동일 출처(prod)로 전달된다. 다른 호스트를 쓰려면 VITE_API_BASE를 설정.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const STREAM_URL = `${API_BASE}/api/stream`;
export const THROW_URL = `${API_BASE}/api/throw`;
