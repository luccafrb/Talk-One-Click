import logging

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig

logger = logging.getLogger(__name__)


class LabelModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_many(self, segment: str, ai_config: AiConfig) -> int:
        created = 0

        for name in ai_config.labels:
            try:
                await self._client.post("/v1/tags/", json={"name": name})
                created += 1
            except TalkApiError as exc:
                logger.error("Falha ao criar etiqueta '%s': %s", name, exc)

        return created
