package counter

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	busuanziURL     = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
	busuanziCookie  = "busuanziId=89D15D1F66D2494F91FB315545BF9C2A"
	busuanziTimeout = 500 * time.Millisecond
)

type busuanziData struct {
	SiteUV int64 `json:"site_uv"`
	SitePV int64 `json:"site_pv"`
	PagePV int64 `json:"page_pv"`
}

func (s *Service) fetchBusuanziData(ctx context.Context, referer string) *busuanziData {
	requestCtx, cancel := context.WithTimeout(ctx, busuanziTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, busuanziURL, nil)
	if err != nil {
		s.log.Debug("Busuanzi request creation failed", counterLogFields("busuanzi.request.create_failed", map[string]any{"error": err.Error()}))
		return nil
	}

	req.Header.Set("Referer", referer)
	req.Header.Set("Cookie", busuanziCookie)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		s.log.Debug("Busuanzi request failed", counterLogFields("busuanzi.request.failed", map[string]any{"error": err.Error()}))
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.log.Debug("Busuanzi response returned non-OK status", counterLogFields("busuanzi.response.invalid_status", map[string]any{"status": resp.StatusCode}))
		return nil
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		s.log.Debug("Busuanzi response read failed", counterLogFields("busuanzi.response.read_failed", map[string]any{"error": err.Error()}))
		return nil
	}

	body := string(bodyBytes)
	start := strings.IndexByte(body, '{')
	end := strings.LastIndexByte(body, '}')
	if start == -1 || end == -1 || end < start {
		s.log.Debug("Busuanzi payload parse failed", counterLogFields("busuanzi.response.parse_failed", nil))
		return nil
	}

	data := &busuanziData{}
	if err := json.Unmarshal([]byte(body[start:end+1]), data); err != nil {
		s.log.Debug("Busuanzi JSON decode failed", counterLogFields("busuanzi.response.decode_failed", map[string]any{"error": err.Error()}))
		return nil
	}

	s.log.Debug("Busuanzi data retrieved", counterLogFields("busuanzi.data.retrieved", map[string]any{"site_uv": data.SiteUV, "site_pv": data.SitePV, "page_pv": data.PagePV}))
	return data
}

func (s *Service) fetchBusuanziSiteUV(ctx context.Context, target Target) int64 {
	data := s.fetchBusuanziData(ctx, "https://"+target.Host+"/")
	if data == nil {
		return 0
	}

	s.log.Debug("Busuanzi site UV retrieved", counterLogFields("busuanzi.site_uv.retrieved", map[string]any{"host": target.Host, "site_uv": data.SiteUV}))
	return data.SiteUV
}

func (s *Service) fetchBusuanziSitePV(ctx context.Context, target Target) int64 {
	data := s.fetchBusuanziData(ctx, "https://"+target.Host+"/")
	if data == nil {
		return 0
	}

	s.log.Debug("Busuanzi site PV retrieved", counterLogFields("busuanzi.site_pv.retrieved", map[string]any{"host": target.Host, "site_pv": data.SitePV}))
	return data.SitePV
}

func (s *Service) fetchBusuanziPagePV(ctx context.Context, target Target) int64 {
	data := s.fetchBusuanziData(ctx, "https://"+target.Host+target.Path)
	if data == nil {
		return 0
	}

	s.log.Debug("Busuanzi page PV retrieved", counterLogFields("busuanzi.page_pv.retrieved", map[string]any{"host": target.Host, "target_path": target.Path, "page_pv": data.PagePV}))
	return data.PagePV
}
