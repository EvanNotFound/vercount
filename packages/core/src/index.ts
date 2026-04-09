export type CounterData = {
  site_pv: number;
  page_pv: number;
  site_uv: number;
};

export type DisplayCounterData = {
  sitePv: string;
  pagePv: string;
  siteUv: string;
};

export type FetchCounterDataOptions = {
  apiUrl?: string;
  requestTimeout?: number;
  url?: string;
  onError?: (error: unknown) => void;
};

export const API_URL = "https://events.vercount.one/api/v2/log";
export const CACHE_KEY = "visitorCountData";
export const REQUEST_TIMEOUT = 5000;
export const UV_COOKIE_PREFIX = "vercount_uv_";
export const UV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const COUNTER_IDS = ["site_pv", "page_pv", "site_uv"] as const;

export const DEFAULT_COUNTER_DATA: CounterData = {
  site_pv: 0,
  page_pv: 0,
  site_uv: 0,
};

export const DEFAULT_DISPLAY_COUNTER_DATA: DisplayCounterData = {
  sitePv: "0",
  pagePv: "0",
  siteUv: "0",
};

export const extractCounterData = (response: any): CounterData => {
  if (response?.status === "success" && response.data) {
    return {
      site_pv: Number(response.data.site_pv ?? 0),
      page_pv: Number(response.data.page_pv ?? 0),
      site_uv: Number(response.data.site_uv ?? 0),
    };
  }

  if (response?.status === "error") {
    return {
      site_pv: Number(response.data?.site_pv ?? 0),
      page_pv: Number(response.data?.page_pv ?? 0),
      site_uv: Number(response.data?.site_uv ?? 0),
    };
  }

  return {
    site_pv: Number(response?.site_pv ?? 0),
    page_pv: Number(response?.page_pv ?? 0),
    site_uv: Number(response?.site_uv ?? 0),
  };
};

export const toDisplayCounterData = (
  data: CounterData,
): DisplayCounterData => ({
  sitePv: String(data.site_pv ?? 0),
  pagePv: String(data.page_pv ?? 0),
  siteUv: String(data.site_uv ?? 0),
});

export const getCurrentCounterUrl = (): string | null => {
  const currentUrl = window.location.href;
  return currentUrl.startsWith("http") ? currentUrl : null;
};

export const getSiteUvCookieName = () => {
  const host = window.location.host || "unknown-host";
  return `${UV_COOKIE_PREFIX}${host.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
};

export const getCookieValue = (name: string) => {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? cookie.substring(name.length + 1) : null;
};

export const hasSiteUvCookie = () =>
  getCookieValue(getSiteUvCookieName()) === "1";

export const setSiteUvCookie = () => {
  document.cookie = `${getSiteUvCookieName()}=1; path=/; max-age=${UV_COOKIE_MAX_AGE}; samesite=lax`;
};

export const getCachedCounterData = (): CounterData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? extractCounterData(JSON.parse(cached)) : null;
  } catch {
    return null;
  }
};

export const setCachedCounterData = (data: CounterData): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be disabled or full
  }
};

export const fetchCounterData = async (
  options: FetchCounterDataOptions = {},
): Promise<CounterData | null> => {
  const currentUrl = options.url ?? getCurrentCounterUrl();
  if (!currentUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.requestTimeout ?? REQUEST_TIMEOUT,
  );
  const isNewUv = !hasSiteUvCookie();

  if (isNewUv) {
    setSiteUvCookie();
  }

  try {
    const response = await fetch(options.apiUrl ?? API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: currentUrl, isNewUv }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const responseData = await response.json();
    return extractCounterData(responseData);
  } catch (error) {
    clearTimeout(timeoutId);
    options.onError?.(error);
    return null;
  }
};
