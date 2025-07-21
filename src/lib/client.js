(function () {
  'use strict';
  
  const readyCallbacks = [];
  let isDocumentReady = false;
  let cachedElements = null;

  const documentReady = (callback) => {
    if (isDocumentReady || document.readyState !== 'loading') {
      callback();
    } else {
      readyCallbacks.push(callback);
      document.addEventListener('DOMContentLoaded', () => {
        isDocumentReady = true;
        readyCallbacks.forEach(cb => cb());
      }, { once: true });
    }
  };

  const API_URL = 'https://events.vercount.one/api/v2/log';
  const CACHE_KEY = 'visitorCountData';
  const REQUEST_TIMEOUT = 5000; // 5 seconds


  // Extract counter data from API response
  const extractCounterData = (response) => {
    if (response?.status === 'success' && response.data) {
      return response.data;
    }
    if (response?.status === 'error') {
      console.warn('API error:', response.message);
      return response.data || { site_uv: 0, site_pv: 0, page_pv: 0 };
    }
    return response || { site_uv: 0, site_pv: 0, page_pv: 0 };
  };

  // Fetch counter data from API with timeout
  const fetchCounterData = async () => {
    // Skip tracking for non-HTTP URLs
    const currentUrl = window.location.href;
    if (!currentUrl.startsWith('http')) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: currentUrl }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const responseData = await response.json();
      return extractCounterData(responseData);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn('Request timeout');
      } else {
        console.warn('API error:', error.message);
      }
      return null;
    }
  };

  // Get cached data from localStorage
  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  };

  // Save data to localStorage
  const setCachedData = (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage might be disabled or full
    }
  };

  // Cache DOM elements for better performance
  const getCachedElements = () => {
    if (cachedElements) return cachedElements;
    
    const COUNTER_IDS = ['site_pv', 'page_pv', 'site_uv'];
    cachedElements = {};
    
    COUNTER_IDS.forEach(id => {
      cachedElements[`busuanzi_value_${id}`] = document.getElementById(`busuanzi_value_${id}`);
      cachedElements[`busuanzi_container_${id}`] = document.getElementById(`busuanzi_container_${id}`);
      cachedElements[`vercount_value_${id}`] = document.getElementById(`vercount_value_${id}`);
      cachedElements[`vercount_container_${id}`] = document.getElementById(`vercount_container_${id}`);
    });
    
    return cachedElements;
  };

  // Update counter text values
  const updateCounters = (data) => {
    const elements = getCachedElements();
    const COUNTER_IDS = ['site_pv', 'page_pv', 'site_uv'];
    
    COUNTER_IDS.forEach(id => {
      const value = String(data[id] || '0');
      const busuanziEl = elements[`busuanzi_value_${id}`];
      const vercountEl = elements[`vercount_value_${id}`];
      
      if (busuanziEl) busuanziEl.textContent = value;
      if (vercountEl) vercountEl.textContent = value;
    });
  };

  // Show all counter containers
  const showCounters = () => {
    const elements = getCachedElements();
    const COUNTER_IDS = ['site_pv', 'page_pv', 'site_uv'];
    
    COUNTER_IDS.forEach(id => {
      const busuanziContainer = elements[`busuanzi_container_${id}`];
      const vercountContainer = elements[`vercount_container_${id}`];
      
      if (busuanziContainer) busuanziContainer.style.display = 'inline';
      if (vercountContainer) vercountContainer.style.display = 'inline';
    });
  };

  // Hide all counter containers
  const hideCounters = () => {
    const elements = getCachedElements();
    const COUNTER_IDS = ['site_pv', 'page_pv', 'site_uv'];
    
    COUNTER_IDS.forEach(id => {
      const busuanziContainer = elements[`busuanzi_container_${id}`];
      const vercountContainer = elements[`vercount_container_${id}`];
      
      if (busuanziContainer) busuanziContainer.style.display = 'none';
      if (vercountContainer) vercountContainer.style.display = 'none';
    });
  };

  // Main initialization function
  const initCounter = async () => {
    hideCounters();
    
    // Try to fetch new data
    const data = await fetchCounterData();
    
    if (data) {
      // Use fresh data
      updateCounters(data);
      setCachedData(data);
      showCounters();
    } else {
      // Use cached data as fallback
      const cachedData = getCachedData();
      if (cachedData) {
        updateCounters(cachedData);
        showCounters();
      }
      // If no cache either, containers remain hidden
    }
  };

  // Start when DOM is ready
  documentReady(initCounter);
})();
