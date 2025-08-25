import os

import requests
from dotenv import load_dotenv

load_dotenv()

class ArtifactoryClient:
    BASE_URL = os.getenv("ARTIFACTORY_BASE_URL")

    def __init__(self, repo: str):
        self.repo = repo
        self.token = os.getenv("ARTIFACTORY_TOKEN")
        if not self.token:
            raise ValueError("ARTIFACTORY_TOKEN not found in environment. Run token_refresher.py first.")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }

    def get_artifact_metadata(self):
        url = f"{self.BASE_URL}/api/storage/{self.repo}"
        response = requests.get(url, headers=self._headers())
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get metadata: {response.status_code} {response.text}")

    def list_artifacts(self):
        url = f"{self.BASE_URL}/api/storage/{self.repo}?list"
        response = requests.get(url, headers=self._headers())
        if response.status_code == 200:
            return response.json().get("files", [])
        else:
            raise Exception(f"Failed to list artifacts: {response.status_code} {response.text}")

    def find_artifact_by_properties(self, properties: dict, path_contains: str = None):
        """
        Find exactly one artifact matching the given properties.
        :param properties: dict of property_key: property_value
        :return: full URL to the matching artifact (str)
        :raises Exception: if zero or multiple artifacts are found
        Example:
            link_to_artifact = ArtifactoryClient(repo="ARTBC-SUM-LTS").find_artifact_by_properties({"baseline.sw.version":"BSW_VCC_20.0.1", "xcp":"disabled", "type":"swlm"})
        """
        url = f"{self.BASE_URL}/api/search/aql"

        # Build the AQL object with repo and type
        base_conditions = [
            f'"repo": "{self.repo}"',
            '"type": "file"'
        ]

        if path_contains:
            base_conditions.append(f'"path": {{"$match": "*{path_contains}*"}}')

        # Append @property entries
        base_conditions += [f'"@{k}": "{v}"' for k, v in properties.items()]
        aql_query = f"items.find({{{', '.join(base_conditions)}}})"

        response = requests.post(url, data=aql_query, headers={
            **self._headers(),
            "Content-Type": "text/plain"
        })

        if response.status_code == 200:
            results = response.json().get("results", [])
            filtered = [m for m in results if m["path"].endswith("xcp_disabled/vbf")]
            full_urls = [
                f"{self.BASE_URL}/{m['repo']}/{m['path']}/{m['name']}"
                for m in filtered
            ]
            if len(full_urls) == 1:
                return full_urls[0]
            elif len(full_urls) == 0:
                raise Exception("No artifact found matching the given properties.")
            else:
                raise Exception(f"Multiple ({len(full_urls)}) artifacts found, but exactly one expected: {full_urls}")
        else:
            raise Exception(f"Failed to search by properties: {response.status_code} {response.text}")


    @staticmethod
    def _release_from_sw_version(sw_version: str) -> str:
        """
        "BSW_VCC_20.0.1" -> "20.0.1"
        If sw_version has no underscores, just return it.
        """
        return sw_version.split("_")[-1] if "_" in sw_version else sw_version

    def _parse_repo_and_path_from_url(self, url: str) -> tuple[str, str]:
        """
        Given a full download URL that starts with BASE_URL,
        return (repo, path_with_name) for /api/storage.
        """
        base = self.BASE_URL.rstrip("/")
        if not url.startswith(base + "/"):
            raise ValueError("URL does not belong to configured Artifactory BASE_URL")

        # strip base
        rest = url[len(base) + 1 :]  # after "<base>/"
        # first segment is repo, remainder is path
        parts = rest.split("/", 1)
        if len(parts) != 2:
            raise ValueError("Unexpected artifact URL format")
        repo, path_with_name = parts[0], parts[1]
        return repo, path_with_name

    def sha256_for_url(self, url: str) -> str:
        """
        Call /api/storage/{repo}/{path}/{name} and return checksums.sha256
        """
        repo, path_with_name = self._parse_repo_and_path_from_url(url)
        storage = f"{self.BASE_URL}/api/storage/{repo}/{path_with_name}"
        r = requests.get(storage, headers=self._headers())
        if r.status_code // 100 != 2:
            raise Exception(f"Failed to read storage info: {r.status_code} {r.text}")
        return (r.json().get("checksums") or {}).get("sha256", "")

    # ---------- NEW: mapping-based resolver using your existing 'find_artifact_by_properties' ----------

    def resolve_url_via_mapping(self, name: str, sw_version: str) -> str:
        """
        Map UI artifact 'name' + sw_version to Artifactory properties,
        then reuse 'find_artifact_by_properties(...)' to get ONE URL.
        """
        mapping = {
            # UI Name  -> which property to use for the version AND type to match
            "SUM SWLM": {"type": "swlm", "key": "baseline.sw.version", "val": lambda sv: sv},
            "SUM SWP1": {"type": "swp1", "key": "release",               "val": self._release_from_sw_version},
            "SUM SWP2": {"type": "swp2", "key": "release",               "val": self._release_from_sw_version},
            "SUM SWP4": {"type": "swp4", "key": "release",               "val": self._release_from_sw_version},
        }
        if name not in mapping:
            raise ValueError(f"Unknown artifact name '{name}'")

        m = mapping[name]
        key = m["key"]
        val = m["val"](sw_version)
        props = {key: val, "type": m["type"]}

        # Reuse your working function
        return self.find_artifact_by_properties(props)
