package routes

import (
	"net/http"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// spaHandler serves the built React app (client/dist) from dir. It's
// mounted as the router's NoRoute handler, so it only ever sees requests
// that matched no API route:
//
//   - /api/... that matched nothing stays a JSON 404 (never the HTML app).
//   - A real file (JS, CSS, images, favicon) is served as-is.
//   - Anything else is a client-side route (/portal/addresses,
//     /admin/inventory, ...) and gets index.html, so a browser refresh or a
//     bookmarked deep link loads the app instead of a 404.
//
// http.Dir confines lookups to dir, so "../" in a URL can't escape it.
func spaHandler(dir string) gin.HandlerFunc {
	root := http.Dir(dir)
	files := http.FileServer(root)
	index := filepath.Join(dir, "index.html")

	return func(c *gin.Context) {
		p := c.Request.URL.Path
		if p == "/api" || strings.HasPrefix(p, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// securityHeaders() sets "default-src 'none'", which is right for
		// JSON but would block every script and stylesheet on the page.
		// The other security headers (nosniff, frame DENY, HSTS) still apply.
		c.Writer.Header().Del("Content-Security-Policy")

		if f, err := root.Open(path.Clean("/" + p)); err == nil {
			stat, statErr := f.Stat()
			f.Close()
			if statErr == nil && !stat.IsDir() {
				// Vite fingerprints everything under /assets/ (name-hash.js),
				// so those files never change and can be cached for a year.
				if strings.HasPrefix(p, "/assets/") {
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				}
				files.ServeHTTP(c.Writer, c.Request)
				return
			}
		}

		// index.html must always be revalidated, or users keep loading an
		// old build that points at asset files which no longer exist.
		c.Header("Cache-Control", "no-cache")
		c.File(index)
	}
}
