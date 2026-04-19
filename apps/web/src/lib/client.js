import {
  COUNTER_IDS,
  fetchCounterData,
  getCachedCounterData,
  setCachedCounterData,
} from "@vercount/core";

const readyCallbacks = [];
let isDocumentReady = false;
let cachedElements = null;

const documentReady = (callback) => {
  if (isDocumentReady || document.readyState !== "loading") {
    callback();
  } else {
    readyCallbacks.push(callback);
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        isDocumentReady = true;
        readyCallbacks.forEach((cb) => cb());
      },
      { once: true },
    );
  }
};

const getCachedElements = () => {
  if (cachedElements) return cachedElements;

  cachedElements = {};

  COUNTER_IDS.forEach((id) => {
    cachedElements[`busuanzi_value_${id}`] = document.getElementById(
      `busuanzi_value_${id}`,
    );
    cachedElements[`busuanzi_container_${id}`] = document.getElementById(
      `busuanzi_container_${id}`,
    );
    cachedElements[`vercount_value_${id}`] = document.getElementById(
      `vercount_value_${id}`,
    );
    cachedElements[`vercount_container_${id}`] = document.getElementById(
      `vercount_container_${id}`,
    );
  });

  return cachedElements;
};

const updateCounters = (data) => {
  const elements = getCachedElements();

  COUNTER_IDS.forEach((id) => {
    const value = String(data[id] || "0");
    const busuanziEl = elements[`busuanzi_value_${id}`];
    const vercountEl = elements[`vercount_value_${id}`];

    if (busuanziEl) busuanziEl.textContent = value;
    if (vercountEl) vercountEl.textContent = value;
  });
};

const showCounters = () => {
  const elements = getCachedElements();

  COUNTER_IDS.forEach((id) => {
    const busuanziContainer = elements[`busuanzi_container_${id}`];
    const vercountContainer = elements[`vercount_container_${id}`];

    if (busuanziContainer) busuanziContainer.style.display = "inline";
    if (vercountContainer) vercountContainer.style.display = "inline";
  });
};

const hideCounters = () => {
  const elements = getCachedElements();

  COUNTER_IDS.forEach((id) => {
    const busuanziContainer = elements[`busuanzi_container_${id}`];
    const vercountContainer = elements[`vercount_container_${id}`];

    if (busuanziContainer) busuanziContainer.style.display = "none";
    if (vercountContainer) vercountContainer.style.display = "none";
  });
};

const handleFetchError = (error) => {
  if (error?.name === "AbortError") {
    console.warn("Request timeout");
  } else {
    console.warn("API error:", error instanceof Error ? error.message : error);
  }
};

const initCounter = async () => {
  hideCounters();

  const data = await fetchCounterData({ onError: handleFetchError });

  if (data) {
    updateCounters(data);
    setCachedCounterData(data);
    showCounters();
    return;
  }

  const cachedData = getCachedCounterData();
  if (cachedData) {
    updateCounters(cachedData);
    showCounters();
  }
};

documentReady(initCounter);
