import logging
import re

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig

logger = logging.getLogger(__name__)

_ALLOWED = re.compile(r"[^a-zA-Z\u00C0-\u00FF 0-9]")


def _sanitize(name: str) -> str:
    return _ALLOWED.sub("", name).strip()


class LabelModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_many(self, segment: str, ai_config: AiConfig) -> list[dict]:
        created: list[dict] = []

        for name in ai_config.labels:
            clean = _sanitize(name)
            if not clean:
                logger.warning("Etiqueta '%s' ignorada: nome inválido após sanitização", name)
                continue
            try:
                response = await self._client.post("/v1/tags/", json={"name": clean})
                created.append({"name": clean, "id": str(response["id"])})
            except TalkApiError as exc:
                logger.error("Falha ao criar etiqueta '%s': %s", name, exc)

        return created
