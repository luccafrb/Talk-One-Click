import logging

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig

logger = logging.getLogger(__name__)


class SectorModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_many(self, segment: str, ai_config: AiConfig) -> list[dict]:
        created: list[dict] = []

        for name in ai_config.sectors:
            try:
                response = await self._client.post("/v1/sectors/", json={"name": name})
                created.append({"name": name, "id": str(response["id"])})
            except TalkApiError as exc:
                logger.error("Falha ao criar setor '%s': %s", name, exc)

        return created
