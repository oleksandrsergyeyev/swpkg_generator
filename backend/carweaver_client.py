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
