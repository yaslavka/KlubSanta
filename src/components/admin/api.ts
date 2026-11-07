// Shared client helper for all admin API calls.
// On 401 the middleware-protected session is gone — bounce to the login screen.

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 401) {
    window.location.assign('/admin/login')
    throw new Error('Your session has expired. Redirecting to login…')
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (!res.ok) {
    const message =
      (json !== null && typeof json === 'object' && 'error' in json
        ? String((json as { error?: unknown }).error)
        : '') ||
      res.statusText ||
      'Request failed'
    throw new Error(message)
  }

  return json as T
}

export const get = <T>(url: string): Promise<T> => apiFetch<T>(url)

export const post = <T>(url: string, body?: unknown): Promise<T> =>
  apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const patch = <T>(url: string, body?: unknown): Promise<T> =>
  apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) })

export const put = <T>(url: string, body?: unknown): Promise<T> =>
  apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body ?? {}) })

export const del = <T>(url: string): Promise<T> => apiFetch<T>(url, { method: 'DELETE' })
