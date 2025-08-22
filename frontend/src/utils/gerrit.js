export function toProjectName(input) {
  let s = (input || "").trim();
  if (!s) return "";

  // If it's a URL, try to extract project name
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const path = decodeURIComponent(u.pathname);

      // Try gitiles-style: /plugins/gitiles/<project>/+/refs/tags/...
      const m1 = path.match(/\/plugins\/gitiles\/([^/][^+]*)\/\+\//i);
      if (m1) return m1[1];

      // Try /projects/<project>/...
      const m2 = path.match(/\/projects\/([^/]+)(?:\/|$)/i);
      if (m2) return decodeURIComponent(m2[1]).replace(/%2F/gi, "/");

      // Try query pattern ?q=project:<project>
      const qp = u.searchParams.get("q") || "";
      const m3 = qp.match(/project:([^ ]+)/i);
      if (m3) return decodeURIComponent(m3[1]).replace(/%2F/gi, "/");
    } catch {
      // fall through
    }
  }

  // Handle encoded project names embedded in raw strings
  s = s.replace(/%2F/gi, "/");
  return s;
}
