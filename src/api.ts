let csrf = '';
export function setCsrf(token: string) {
  csrf = token;
}
export async function api<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const endpoint = `/api${path}`;
  const unavailable = `A API do SCAR não está disponível em ${endpoint} (HTTP ${res.status}). Verifique se o servidor da aplicação está publicado e se as rotas /api estão direcionadas para ele.`;
  if (!/application\/(?:[\w.-]+\+)?json(?:;|$)/i.test(contentType)) {
    throw new Error(unavailable);
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `A API retornou JSON inválido em ${endpoint} (HTTP ${res.status}). Tente novamente ou verifique o servidor.`,
    );
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      `A API retornou dados inesperados em ${endpoint}. Verifique a configuração do servidor.`,
    );
  }
  if (!res.ok) {
    const message =
      'error' in data && typeof data.error === 'string'
        ? data.error
        : `Não foi possível concluir a operação (HTTP ${res.status}).`;
    throw new Error(message);
  }
  return data as T;
}
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const fmtDate = (date: string) =>
  date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
export function download(name: string, body: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return (
    '\uFEFF' +
    rows
      .map((r) =>
        r
          .map((v) => {
            let s = String(v ?? '');
            if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(';'),
      )
      .join('\r\n')
  );
}
