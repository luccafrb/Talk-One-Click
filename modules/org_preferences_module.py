import logging

from client.talk_client import TalkClient
from errors import TalkApiError

logger = logging.getLogger(__name__)


class OrgPreferencesModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def configure_close_chat_message(self, message: str) -> bool:
        org_id = self._client.organization_id
        try:
            await self._client.put(
                f"/v1/organizations/{org_id}/preferences/",
                json={"closeChatBehavior": {"behavior": "SendMessage", "message": message}},
            )
            return True
        except TalkApiError as exc:
            logger.error("Falha ao configurar preferências da organização: %s", exc)
            return False
