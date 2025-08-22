import requests
import json
import os
from time import time
from dotenv import load_dotenv

TOKEN_REFRESH_MARGIN_SEC = 5.0

# Load .env file
load_dotenv()

class CarWeaver:
    def __init__(self):
        self.url = os.getenv("CARWEAVER_URL")
        self.user = os.getenv("CARWEAVER_USER")
        self.password = os.getenv("CARWEAVER_PASS")
        self.user_key = os.getenv("CARWEAVER_KEY")
        self.access_token = None
        self.refresh_token = None
        self.expires_at = None
        self.headers = None
        self.get_token()

    def get_token(self):
        data = {
            'username': self.user,
            'password': self.password,
            'grant_type': 'password'
        }
        headers = {'user-key': self.user_key}
        response = requests.post(f'{self.url}/token', data=data, headers=headers)
        response.raise_for_status()
        resp_json = response.json()
        self.access_token = resp_json['access_token']
        self.refresh_token = resp_json['refresh_token']
        self.expires_at = time() + float(resp_json['expires_in'])
        self.headers = {'Authorization': f'Bearer {self.access_token}', 'user-key': self.user_key}

    def refresh_token_check(self):
        if time() > self.expires_at - TOKEN_REFRESH_MARGIN_SEC:
            self.get_token()

    def get_item(self, item_id):
        """Fetch an item from CarWeaver by its ID.
            Example usage:
                item = cw.get_item("x04000000032FDEFB")
        """
        self.refresh_token_check()
        return requests.get(f'{self.url}/restapi/items/{item_id}', headers=self.headers)

    def generic_product_module(self, item_id):
        generic_product_module_id = 'Not found'
        item_id = item_id.split('/')[-1]  # Ensure we have just the ID part
        response = json.loads(self.get_item(item_id).content)
        print(json.dumps(response, indent=2))
        for i in response['attributes']:
            if i['attributeType']['name'] == "Generic Product Module Id":
                generic_product_module_id = (i['value'])
                break
        version = response['versionNumber']
        return generic_product_module_id, version

    def source_components(self, item_id):
        """Fetch source components for an item."""
        component_id = 'Not found'
        persistent_id = 'Not found'
        item_id = item_id.split('/')[-1]  # Ensure we have just the ID part
        response = json.loads(self.get_item(item_id).content)
        for i in response['attributes']:
            if i['attributeType']['name'] == "Component ID":
                component_id = (i['value'])
                break
        version = response['versionNumber']
        parts = response.get("parts", [])
        for part in parts:
            if 'PersistentID' in part['type']['name']:
                persistent_id_item = self.get_item(part['defObject']['handle']).json()
                for attribute in persistent_id_item['attributes']:
                    if attribute['attributeType']['name'] == 'Component ID':
                        persistent_id = attribute['value']
                        break

        return component_id, persistent_id, version
