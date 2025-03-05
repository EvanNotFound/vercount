var visitorCounterCaller, visitorCounterDisplay;
(function () {
  var documentReady,
    readyCallbacks = [],
    isDocumentReady = false;

  documentReady = function (callback) {
    if (
      isDocumentReady ||
      document.readyState === "interactive" ||
      document.readyState === "complete"
    ) {
      callback.call(document);
    } else {
      readyCallbacks.push(callback);
      document.addEventListener("DOMContentLoaded", onDocumentReady);
    }
  };

  function onDocumentReady() {
    isDocumentReady = true;
    document.removeEventListener("DOMContentLoaded", onDocumentReady);
    readyCallbacks.forEach((callback) => callback.call(document));
    readyCallbacks = [];
  }

  const getBaseUrl = () => {
    return "https://events.vercount.one";
  };

  // Get the API endpoint with version
  const getApiEndpoint = (version = 2) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/v${version}/log`;
  };

  // Generate a simple browser fingerprint to help identify legitimate requests
  const generateBrowserToken = () => {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const languages = navigator.languages ? navigator.languages.join(',') : navigator.language || '';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const glInfo = gl ? gl.getParameter(gl.RENDERER) : '';
    
    // Combine various browser properties to create a simple fingerprint
    const components = [
      screenInfo,
      timeZone,
      languages,
      navigator.userAgent,
      glInfo,
      new Date().getTimezoneOffset()
    ].join('|');
    
    // Create a simple hash of the components
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      hash = ((hash << 5) - hash) + components.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  };

  // Helper function to extract counter data from the new API response format
  const extractCounterData = (response) => {
    // If response has the new format with status and data
    if (response && response.status) {
      if (response.status === "success" && response.data) {
        return response.data;
      } else if (response.status === "error" && response.data) {
        console.warn(`API error: ${response.message}`, response);
        return response.data; // Return the data even in case of error
      } else if (response.status === "error") {
        console.warn(`API error: ${response.message}`, response);
        return { site_uv: 0, site_pv: 0, page_pv: 0 }; // Default values
      }
    }
    
    // Fallback for old format or unexpected response structure
    return response || { site_uv: 0, site_pv: 0, page_pv: 0 };
  };

  visitorCounterCaller = {
    fetch: async function (callback) {
      const apiUrl = getApiEndpoint(2); // Use v2 endpoint
      const fallbackApiUrl = getApiEndpoint(1); // Fallback to v1 if needed
      
      try {
        visitorCounterDisplay.hideAll();
        
        // Generate browser token
        const browserToken = generateBrowserToken();
        
        // Validate URL before sending
        const currentUrl = window.location.href;
        let validUrl = currentUrl;
        
        // Check if it's a file:// URL or other non-http(s) protocol
        if (!currentUrl.startsWith('http')) {
          console.warn("Invalid URL protocol detected. Only HTTP and HTTPS are supported.");
          // Use a fallback URL for local files to avoid polluting the KV store
          validUrl = "https://local.file/invalid-protocol";
        }
        
        // Try to fetch with the v2 endpoint first
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Browser-Token": browserToken
            },
            body: JSON.stringify({ 
              url: validUrl,
              token: browserToken
            }),
          });
          
          // Check if the response is ok
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const responseData = await response.json();
          const counterData = extractCounterData(responseData);
          
          documentReady(() => {
            callback(counterData);
            localStorage.setItem("visitorCountData", JSON.stringify(counterData));
            visitorCounterDisplay.showAll();
          });
        } catch (v2Error) {
          // If v2 endpoint fails, try the v1 endpoint
          console.warn("Error with v2 API, falling back to v1:", v2Error);
          
          try {
            const fallbackResponse = await fetch(fallbackApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Browser-Token": browserToken
              },
              body: JSON.stringify({ 
                url: validUrl,
                token: browserToken
              }),
            });
            
            const fallbackResponseData = await fallbackResponse.json();
            // No need to extract data for v1 format as it's already in the right format
            
            documentReady(() => {
              callback(fallbackResponseData);
              localStorage.setItem("visitorCountData", JSON.stringify(fallbackResponseData));
              visitorCounterDisplay.showAll();
            });
          } catch (corsError) {
            // If we get a CORS error, try again without the custom header
            console.warn("CORS error with token header, retrying without custom header:", corsError);
            const lastFallbackResponse = await fetch(fallbackApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ 
                url: validUrl,
                token: browserToken // Still include token in body
              }),
            });
            const lastFallbackData = await lastFallbackResponse.json();
            
            documentReady(() => {
              callback(lastFallbackData);
              localStorage.setItem("visitorCountData", JSON.stringify(lastFallbackData));
              visitorCounterDisplay.showAll();
            });
          }
        }
      } catch (error) {
        console.error("Error fetching visitor count:", error);
        
        // Try to use cached data if available
        const cachedData = localStorage.getItem("visitorCountData");
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            documentReady(() => {
              callback(parsedData);
              visitorCounterDisplay.showAll();
            });
            console.log("Using cached visitor count data");
          } catch (cacheError) {
            console.error("Error parsing cached data:", cacheError);
            visitorCounterDisplay.hideAll();
          }
        } else {
          visitorCounterDisplay.hideAll();
        }
      }
    },
  };

  visitorCounterDisplay = {
    counterIds: ["site_pv", "page_pv", "site_uv"],
    updateText: function (data) {
      this.counterIds.forEach((id) => {
        // Update busuanzi elements
        const busuanziElement = document.getElementById("busuanzi_value_" + id);
        if (busuanziElement) {
          busuanziElement.textContent = data[id] || "0";
        }

        // Update vercount elements
        const vercountElement = document.getElementById("vercount_value_" + id);
        if (vercountElement) {
          vercountElement.textContent = data[id] || "0";
        }
      });
    },
    hideAll: function () {
      this.counterIds.forEach((id) => {
        // Hide busuanzi elements
        const busuanziContainer = document.getElementById(
          "busuanzi_container_" + id,
        );
        if (busuanziContainer) {
          busuanziContainer.style.display = "none";
        }

        // Hide vercount elements
        const vercountContainer = document.getElementById(
          "vercount_container_" + id,
        );
        if (vercountContainer) {
          vercountContainer.style.display = "none";
        }
      });
    },
    showAll: function () {
      this.counterIds.forEach((id) => {
        // Show busuanzi elements
        const busuanziContainer = document.getElementById(
          "busuanzi_container_" + id,
        );
        if (busuanziContainer) {
          busuanziContainer.style.display = "inline";
        }

        // Show vercount elements
        const vercountContainer = document.getElementById(
          "vercount_container_" + id,
        );
        if (vercountContainer) {
          vercountContainer.style.display = "inline";
        }
      });
    },
  };

  documentReady(() => {
    visitorCounterCaller.fetch(
      visitorCounterDisplay.updateText.bind(visitorCounterDisplay)
    );
  });
})();
