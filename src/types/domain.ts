export interface Domain {
  id: string;
  name: string;
  verified: boolean;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  monitoredPages: MonitoredPage[];
  counters?: {
    sitePv: number;
    siteUv: number;
    pageViews: PageViewData[];
  };
}

export interface MonitoredPage {
  id: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageViewData {
  path: string;
  views: number;
}

export interface CounterTableMeta {
  handlePageViewChange?: (path: string, value: number) => void;
  handleUpdatePageView?: (path: string) => Promise<void>;
  handleDeleteMonitoredPage?: (path: string) => Promise<void>;
} 