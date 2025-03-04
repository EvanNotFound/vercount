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

  visitorCounterCaller = {
    fetch: async function (callback) {
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/log?jsonpCallback=VisitorCountCallback`;
      try {
        visitorCounterDisplay.hideAll();
        
        // Generate browser token
        const browserToken = generateBrowserToken();
        
        // Try to fetch with the token first
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Browser-Token": browserToken
            },
            body: JSON.stringify({ 
              url: window.location.href,
              token: browserToken
            }),
          });
          const data = await response.json();
          documentReady(() => {
            callback(data);
            localStorage.setItem("visitorCountData", JSON.stringify(data));
            visitorCounterDisplay.showAll();
          });
        } catch (corsError) {
          // If we get a CORS error, try again without the custom header
          console.warn("CORS error with token header, retrying without custom header:", corsError);
          const fallbackResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
              url: window.location.href,
              token: browserToken // Still include token in body
            }),
          });
          const fallbackData = await fallbackResponse.json();
          documentReady(() => {
            callback(fallbackData);
            localStorage.setItem("visitorCountData", JSON.stringify(fallbackData));
            visitorCounterDisplay.showAll();
          });
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
