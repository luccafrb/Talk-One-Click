import asyncio
import logging
import os

import httpx

from errors import TalkApiError

_BASE_URL = os.environ.get("TALK_API_BASE_URL", "https://app-utalk.umbler.com/api/")
_MAX_RETRIES = 3

logger = logging.getLogger(__name__)


class TalkClient:
    def __init__(self, talk_api_key: str, organization_id: str) -> None:
        self.organization_id = organization_id
        self._organization_id = organization_id
        self._headers = {
            "Authorization": f"Bearer {talk_api_key}",
            "X-Talk-Client": "one-click-onboarding/1.0",
        }

    async def get(self, path: str) -> dict:
        return await self._request("GET", path)

    async def post(self, path: str, json: dict) -> dict:
        json = {**json, "organizationId": self._organization_id}
        return await self._request("POST", path, json=json)

    async def put(self, path: str, json: dict) -> dict:
        return await self._request("PUT", path, json=json)

    async def delete(self, path: str) -> dict:
        return await self._request("DELETE", path)

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        url = _BASE_URL.rstrip("/") + "/" + path.lstrip("/")
        params = {"organizationId": self._organization_id}

        last_error: TalkApiError | None = None
        async with httpx.AsyncClient() as client:
            for attempt in range(1, _MAX_RETRIES + 1):
                logger.debug("%s %s (tentativa %d/%d)", method, url, attempt, _MAX_RETRIES)
                response = await client.request(
                    method, url, headers=self._headers, params=params, **kwargs
                )
                logger.debug("  → %d (%d bytes)", response.status_code, len(response.content))
                if response.status_code < 400:
                    return response.json()

                last_error = TalkApiError(
                    status_code=response.status_code,
                    message=response.text,
                )
                logger.warning("  ✗ erro %d: %s", response.status_code, response.text[:200])

                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(attempt * 0.8)

        raise last_error

