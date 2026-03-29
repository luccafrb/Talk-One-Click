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

    _VALID_COLORS = {
        "Blue", "Skyblue", "Cyan", "Aquamarine", "Green", "Kiwi",
        "Gold", "Amber", "Tangerine", "Chocolate", "Salmon", "Tomato",
        "Rose", "Pink", "Magenta", "Violet", "Grape", "Gray", "Silver", "Umblerito",
    }

    async def create_many(self, segment: str, ai_config: AiConfig) -> list[dict]:
        created: list[dict] = []
        colors = ai_config.label_colors

        for i, name in enumerate(ai_config.labels):
            clean = _sanitize(name)
            if not clean:
                logger.warning("Etiqueta '%s' ignorada: nome inválido após sanitização", name)
                continue

            color = colors[i] if i < len(colors) else None
            if color and color not in self._VALID_COLORS:
                logger.warning("Cor inválida '%s' para etiqueta '%s', ignorada", color, name)
                color = None

            payload: dict = {"name": clean}
            if color:
                payload["color"] = color

            try:
                response = await self._client.post("/v1/tags/", json=payload)
                created.append({"name": clean, "id": str(response["id"]), "color": color or ""})
            except TalkApiError as exc:
                logger.error("Falha ao criar etiqueta '%s': %s", name, exc)

        return created
