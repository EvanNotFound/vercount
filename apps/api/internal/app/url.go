package app

import "net/url"

type targetURL struct {
	Host string
	Path string
}

func validateTargetURL(raw string) (targetURL, string) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return targetURL{}, "Invalid URL format"
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return targetURL{}, "Invalid URL protocol. Only HTTP and HTTPS are supported."
	}

	if parsed.Host == "" {
		return targetURL{}, "Invalid URL host"
	}

	path := parsed.Path
	if path == "" {
		path = "/"
	}

	return targetURL{Host: parsed.Host, Path: path}, ""
}
