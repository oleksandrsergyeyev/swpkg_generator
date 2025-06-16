import os
import json
import requests
from base64 import b64encode
from dotenv import load_dotenv

class Credentials:
    def __init__(self):
        load_dotenv()
        self._user = os.getenv("GERRIT_USER")
        self._pass = os.getenv("GERRIT_PASS")

    def get_user(self):
        return self._user

    def get_pass(self):
        return self._pass

    def get_credentials(self):
        return self._user, self._pass

class GerritClient:
    def __init__(self, base_url=None):
        load_dotenv()
        self.base_url = base_url or os.getenv("GERRIT_URL")
        creds = Credentials()
        self.user = creds.get_user()
        self.pwd = creds.get_pass()

    def _get_headers(self):
        basic = b64encode(f"{self.user}:{self.pwd}".encode()).decode()
        return {"Authorization": "Basic " + basic}

    def _resp2json(self, response):
        """Remove magic prefix, parse JSON, or raise on error."""
        if response.status_code // 100 == 2:
            # Remove Gerrit magic prefix
            text = response.text
            if text.startswith(")]}'"):
                text = text.split('\n', 1)[1]
            return json.loads(text)
        else:
            raise Exception(f"Gerrit API error: {response.status_code} {response.text}")

    def list_tags(self, project):
        url = f"{self.base_url}projects/{requests.utils.quote(project, safe='')}/tags/"
        response = requests.get(url, headers=self._get_headers())
        return self._resp2json(response)

    def search_tags(self, project, pattern):
        tags = self.list_tags(project)
        # Tag format: {'ref': 'refs/tags/yourtag', 'revision': '...'}
        filtered = [t for t in tags if pattern in t['ref'] or pattern in t.get('name', '')]
        return filtered

    def get_tag_url_by_exact_name(self, project, tag_name):
        """Return the full 'browse' URL for the tag exactly matching tag_name, or None.
        Example:
            tag_link = GerritClient().get_tag_url_by_exact_name("GenData/SimulinkFunc", "BSW_VCC_20.0.1")"""

        tags = self.list_tags(project)
        tag_ref = f"refs/tags/{tag_name}"
        for tag in tags:
            if tag.get("ref") == tag_ref:
                # Find the "browse" web_link
                for link in tag.get("web_links", []):
                    if link.get("name") == "browse":
                        # Compose absolute URL if needed
                        base_url = self.base_url.rstrip('/')
                        rel_url = link["url"]
                        # If rel_url is already absolute, just return it
                        if rel_url.startswith("http"):
                            return rel_url
                        # Else, build the absolute URL (handle 'a/' for auth)
                        if rel_url.startswith("/"):
                            rel_url = rel_url[1:]
                        if base_url.endswith("a"):
                            base_url = base_url[:-1]  # Remove trailing "a" for links

                        print(f"URL to tag '{tag_name}': {base_url}{rel_url}")
                        return f"{base_url}{rel_url}"
        return None
