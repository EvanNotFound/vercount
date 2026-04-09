import { useEffect, useRef, useState } from "react";

type VisitorData = {
  sitePv: string;
  pagePv: string;
  siteUv: string;
};

const API_URL = "https://events.vercount.one/api/v2/log";
const CACHE_KEY = "visitorCountData";
const REQUEST_TIMEOUT = 5000;
const UV_COOKIE_PREFIX = "vercount_uv_";
const UV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const DEFAULT_DATA: VisitorData = {
  sitePv: "0",
  pagePv: "0",
  siteUv: "0",
};

const extractCounterData = (response: any) => {
  if (response?.status === "success" && response.data) {
    return response.data;
  }

  if (response?.status === "error") {
    return (
      response.data || {
        site_uv: 0,
        site_pv: 0,
        page_pv: 0,
      }
    );
  }

  return (
    response || {
      site_uv: 0,
      site_pv: 0,
      page_pv: 0,
    }
  );
};

const getSiteUvCookieName = () => {
  const host = window.location.host || "unknown-host";
  return `${UV_COOKIE_PREFIX}${host.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
};

const getCookieValue = (name: string) => {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? cookie.substring(name.length + 1) : null;
};

const hasSiteUvCookie = () => getCookieValue(getSiteUvCookieName()) === "1";

const setSiteUvCookie = () => {
  document.cookie = `${getSiteUvCookieName()}=1; path=/; max-age=${UV_COOKIE_MAX_AGE}; samesite=lax`;
};

export const useVercount = () => {
  const [visitorData, setVisitorData] = useState<VisitorData>(DEFAULT_DATA);
  const hasFired = useRef(false);

  const fetchVisitorCount = async () => {
    const currentUrl = window.location.href;
    if (!currentUrl.startsWith("http")) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const isNewUv = !hasSiteUvCookie();

    if (isNewUv) {
      setSiteUvCookie();
    }

    try {
      const response = await fetch(API_URL, {
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
      const counterData = extractCounterData(responseData);
      const newData = {
        sitePv: String(counterData.site_pv ?? 0),
        pagePv: String(counterData.page_pv ?? 0),
        siteUv: String(counterData.site_uv ?? 0),
      };

      setVisitorData(newData);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
      return newData;
    } catch (error) {
      clearTimeout(timeoutId);
      return null;
    }
  };

  useEffect(() => {
    if (hasFired.current) {
      return;
    }

    const storedData = localStorage.getItem(CACHE_KEY);

    if (storedData) {
      try {
        setVisitorData(JSON.parse(storedData));
      } catch {
        setVisitorData(DEFAULT_DATA);
      }
    }

    fetchVisitorCount();
    hasFired.current = true;
  }, []);

  return visitorData;
};
