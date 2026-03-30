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

    async def get_chats(self, days: int, on_progress=None) -> list[dict]:
        """Busca conversas com estratégia de duas fases:
        1. Até 5.000 chats paginados normalmente.
        2. Se o limite foi atingido, amostra 10 chats por hora não coberta do período.
        on_progress(done, total) é chamado a cada hora amostrada na fase 2.
        """
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        start_dt = (now - timedelta(days=days)).replace(minute=0, second=0, microsecond=0)
        start = start_dt.isoformat()

        # ── Fase 1: até 5.000 conversas ─────────────────────────────────────
        skip, take, max_chats = 0, 100, 3000
        results: list[dict] = []
        hit_limit = False

        logger.info("[analytics] fase 1: buscando até 3.000 conversas — últimos %d dias", days)
        while len(results) < max_chats:
            data = await self.get(
                f"/v1/chats/?DateStartCreatedAtUTC={start}&Skip={skip}&Take={take}"
            )
            items: list[dict] = data if isinstance(data, list) else data.get("items", data.get("data", []))
            results.extend(items)
            logger.info("[analytics] fase 1 — skip=%d: %d itens (total: %d)", skip, len(items), len(results))
            if len(items) < take:
                break
            skip += take
            if len(results) >= max_chats:
                hit_limit = True
                break

        if not hit_limit:
            logger.info("[analytics] fase 1 concluída: %d conversas (abaixo do limite de 3.000)", len(results))
            return results

        # ── Fase 2: amostragem por hora das lacunas ──────────────────────────
        covered: set[tuple] = set()
        for chat in results:
            raw = chat.get("eventAtUTC") or chat.get("createdAtUTC")
            if raw:
                try:
                    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                    covered.add((dt.year, dt.month, dt.day, dt.hour))
                except Exception:
                    pass

        uncovered: list[datetime] = []
        cur = start_dt
        while cur < now:
            if (cur.year, cur.month, cur.day, cur.hour) not in covered:
                uncovered.append(cur)
            cur += timedelta(hours=5)

        total_uncovered = len(uncovered)
        logger.info("[analytics] fase 2: %d horas sem cobertura para amostrar", total_uncovered)

        sampled: list[dict] = []
        for i, hour_dt in enumerate(uncovered):
            window_end = hour_dt + timedelta(hours=5)
            data = await self.get(
                f"/v1/chats/?DateStartCreatedAtUTC={hour_dt.isoformat()}"
                f"&DateEndCreatedAtUTC={window_end.isoformat()}&Skip=0&Take=10"
            )
            items = data if isinstance(data, list) else data.get("items", data.get("data", []))
            sampled.extend(items)
            if items:
                logger.info("[analytics] fase 2 — %s a %s: %d chats amostrados",
                            hour_dt.strftime("%Y-%m-%d %H:00"),
                            window_end.strftime("%H:00"), len(items))
            if on_progress is not None:
                on_progress(i + 1, total_uncovered)

        logger.info("[analytics] amostragem concluída: %d chats adicionais. total final: %d",
                    len(sampled), len(results) + len(sampled))
        return results + sampled

    async def get_ratings(self, days: int) -> list[dict]:
        """Fetch all contact ratings for the last N days with automatic pagination."""
        from datetime import datetime, timedelta, timezone
        start = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        skip = 0
        take = 100
        results: list[dict] = []
        logger.info("[analytics] buscando avaliações — últimos %d dias", days)
        while True:
            data = await self.get(
                f"/v1/contact-ratings/?startUTC={start}&Skip={skip}&Take={take}"
            )
            items: list[dict] = data if isinstance(data, list) else data.get("items", data.get("data", []))
            results.extend(items)
            logger.info("[analytics] avaliações: página skip=%d → %d itens (total acumulado: %d)",
                        skip, len(items), len(results))
            if len(items) < take:
                break
            skip += take
        logger.info("[analytics] avaliações concluído: %d no total", len(results))
        return results

    async def get_online_members(self) -> list[dict]:
        """Fetch currently online organization members."""
        logger.info("[analytics] buscando membros online")
        data = await self.get("/v1/members/online/")
        items = data if isinstance(data, list) else data.get("items", data.get("data", []))
        logger.info("[analytics] membros online: %d", len(items))
        return items
