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
            filtered = [m for m in results if m["path"].endswith("SWLM/xcp_disabled/vbf")]
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
