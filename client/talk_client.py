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
        """Busca chats fechados com estratégia em duas fases:
        1. Conta o total via Behavior=CountOnly.
        2a. Se total ≤ 3000: pagina tudo com progresso real baseado em totalItems.
        2b. Se total > 3000: amostragem diária uniforme (budget = 3000 / dias).
        on_progress(done, total) é chamado a cada página ou dia processado.
        """
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        start_dt = now - timedelta(days=days)
        start = start_dt.isoformat()
        end = now.isoformat()

        total = await self._count_chats(start, end)
        logger.info("[analytics] total de chats fechados no período: %d", total)

        if on_progress:
            on_progress(0, total)  # sinaliza o total para a barra antes de buscar

        if total <= 3000:
            return await self._fetch_all_chats(start, end, total, on_progress)
        else:
            return await self._sample_chats_by_day(start_dt, now, days, on_progress)

    async def _count_chats(self, start: str, end: str) -> int:
        data = await self.get(
            f"/v1/chats/?ChatState=Closed&Behavior=CountOnly"
            f"&DateStartCreatedAtUTC={start}&DateEndCreatedAtUTC={end}&Take=1"
        )
        page = data.get("page") or data.get("pagination") or {}
        total = page.get("totalItems", 0)
        if total == 0:
            import json as _json
            logger.info("[analytics] ESTRUTURA DA RESPOSTA DE CONTAGEM:\n%s",
                        _json.dumps(data, indent=2, ensure_ascii=False, default=str))
        return total

    async def _fetch_all_chats(self, start: str, end: str, total: int, on_progress) -> list[dict]:
        skip, take = 0, 100
        results: list[dict] = []
        logger.info("[analytics] buscando todos os %d chats fechados", total)
        while True:
            data = await self.get(
                f"/v1/chats/?ChatState=Closed&Behavior=GetSliceOnly"
                f"&DateStartCreatedAtUTC={start}&DateEndCreatedAtUTC={end}"
                f"&ChatOrderBy=CreatedAtUTC&Order=Asc&Skip={skip}&Take={take}"
            )
            items: list[dict] = data.get("items", []) if isinstance(data, dict) else data
            results.extend(items)
            logger.info("[analytics] skip=%d: %d itens (total: %d/%d)", skip, len(items), len(results), total)
            if on_progress and total > 0:
                on_progress(len(results), total)
            if len(items) < take:
                break
            skip += take
        return results

    async def _sample_chats_by_day(self, start_dt, end_dt, days: int, on_progress) -> list[dict]:
        from datetime import timedelta
        budget = max(10, 3000 // days)
        results: list[dict] = []
        day = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        all_days = []
        while day < end_dt:
            all_days.append(day)
            day = day + timedelta(days=1)
        logger.info("[analytics] amostragem diária: %d dias, %d chats/dia", len(all_days), budget)
        for i, day in enumerate(all_days):
            day_end = day + timedelta(days=1)
            data = await self.get(
                f"/v1/chats/?ChatState=Closed&Behavior=GetSliceOnly"
                f"&DateStartCreatedAtUTC={day.isoformat()}&DateEndCreatedAtUTC={day_end.isoformat()}"
                f"&ChatOrderBy=CreatedAtUTC&Order=Asc&Skip=0&Take={budget}"
            )
            items: list[dict] = data.get("items", []) if isinstance(data, dict) else data
            results.extend(items)
            logger.info("[analytics] %s: %d chats amostrados", day.strftime("%Y-%m-%d"), len(items))
            if on_progress:
                on_progress(i + 1, len(all_days))
        logger.info("[analytics] amostragem concluída: %d chats no total", len(results))
        return results

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
