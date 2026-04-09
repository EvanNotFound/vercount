import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DISPLAY_COUNTER_DATA,
  fetchCounterData,
  getCachedCounterData,
  setCachedCounterData,
  toDisplayCounterData,
} from "@vercount/core";

type VisitorData = {
  sitePv: string;
  pagePv: string;
  siteUv: string;
};

export const useVercount = () => {
  const [visitorData, setVisitorData] = useState<VisitorData>(
    DEFAULT_DISPLAY_COUNTER_DATA,
  );
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) {
      return;
    }

    const storedData = getCachedCounterData();

    if (storedData) {
      setVisitorData(toDisplayCounterData(storedData));
    }

    fetchCounterData().then((freshData) => {
      if (freshData) {
        setCachedCounterData(freshData);
        setVisitorData(toDisplayCounterData(freshData));
      }
    });
    hasFired.current = true;
  }, []);

  return visitorData;
};
