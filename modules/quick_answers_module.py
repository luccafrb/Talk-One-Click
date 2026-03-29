import logging

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig

logger = logging.getLogger(__name__)


class QuickAnswersModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_many(self, ai_config: AiConfig) -> list[dict]:
        created: list[dict] = []
        for qa in ai_config.quick_answers:
            name = (qa.get("name") or "").strip()[:160]
            content = (qa.get("content") or "").strip()[:2000]
            if not name or not content:
                continue
            try:
                response = await self._client.post("/v1/quick-answers/", json={
                    "name": name,
                    "content": content,
                    "visibility": "Public",
                })
                created.append({"name": name, "id": str(response.get("id", ""))})
            except TalkApiError as exc:
                logger.error("Falha ao criar resposta rápida '%s': %s", name, exc)
        return created
