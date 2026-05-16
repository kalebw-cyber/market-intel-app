export async function GET() {
  return new Response(
    `<!doctype html>
<html>
  <head><title>Clearing site data</title></head>
  <body>
    <script>
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        document.cookie.split(";").forEach(function(cookie) {
          document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
        });
      } catch {}
      try {
        if ("caches" in window) {
          caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(key) { return caches.delete(key); }));
          }).finally(function() { location.replace("/"); });
        } else {
          location.replace("/");
        }
      } catch {
        location.replace("/");
      }
    </script>
    Clearing site data...
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "clear-site-data": '"cache", "cookies", "storage"'
      }
    }
  );
}
