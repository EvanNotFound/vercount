export interface Domain {
  id: string;
  name: string;
  verified: boolean;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // This is kept for backward compatibility but will always be an empty array
  counters?: {
    sitePv: number;
    siteUv: number;
    pageViews: PageViewData[];
  };
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