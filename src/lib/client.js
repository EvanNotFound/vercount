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
    // const scriptSrc = document.currentScript.src;
    // return scriptSrc.includes("cn.vercount.one")
    //   ? "https://cn.vercount.one"
    //   : "https://vercount.one";
  };

  visitorCounterCaller = {
    fetch: async function (callback) {
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/log?jsonpCallback=VisitorCountCallback`;

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: window.location.href }),
        });

        const data = await response.json();
        documentReady(() => callback(data));
        visitorCounterDisplay.showAll();
      } catch (error) {
        console.error("Error fetching visitor count:", error);
        visitorCounterDisplay.hideAll();
      }
    },
  };

  visitorCounterDisplay = {
    counterIds: ["site_pv", "page_pv", "site_uv"],
    updateText: function (data) {
      this.counterIds.forEach((id) => {
        const element = document.getElementById("busuanzi_value_" + id);
        if (element) {
          element.textContent = data[id] || "0";
        }
      });
    },
    hideAll: function () {
      this.counterIds.forEach((id) => {
        const container = document.getElementById("busuanzi_container_" + id);
        if (container) {
          container.style.display = "none";
        }
      });
    },
    showAll: function () {
      this.counterIds.forEach((id) => {
        const container = document.getElementById("busuanzi_container_" + id);
        if (container) {
          container.style.display = "inline";
        }
      });
    },
  };

  // Fetch and update visitor count data
  visitorCounterCaller.fetch(
    visitorCounterDisplay.updateText.bind(visitorCounterDisplay),
  );
})();
