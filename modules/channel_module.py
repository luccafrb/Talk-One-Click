import logging

from client.talk_client import TalkClient
from errors import TalkApiError

logger = logging.getLogger(__name__)


class ChannelModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(self, channel_name: str) -> str | None:
        try:
            response = await self._client.post(
                "/v1/channels/starter/",
                json={"displayName": channel_name},
            )
            return response["id"]
        except TalkApiError as exc:
            logger.error("Falha ao criar canal '%s': %s", channel_name, exc)
            return None
