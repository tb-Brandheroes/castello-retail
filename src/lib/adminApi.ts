import { supabase } from "@/integrations/supabase/client";

const CODE_KEY = "castello.adminCode";

export function getAdminCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAdminCode(code: string) {
  try {
    localStorage.setItem(CODE_KEY, code.trim());
  } catch {
    /* ignore */
  }
}

export function clearAdminCode() {
  try {
    localStorage.removeItem(CODE_KEY);
  } catch {
    /* ignore */
  }
}

export class AdminAuthError extends Error {}

type Table = "sessions" | "recipe_views" | "device_heartbeats";

type Options = {
  limit?: number;
  from?: string;
  to?: string;
};

export async function fetchAnalytics<T>(table: Table, opts: Options = {}): Promise<T[]> {
  const code = getAdminCode();
  if (!code) throw new AdminAuthError("Mangler kode");

  const { data, error } = await supabase.functions.invoke("analytics-read", {
    body: { code, table, ...opts },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 401) {
      clearAdminCode();
      throw new AdminAuthError("Ugyldig kode");
    }
    throw error;
  }

  return ((data as { rows?: T[] })?.rows ?? []) as T[];
}
