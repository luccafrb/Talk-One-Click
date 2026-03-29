import logging

from client.talk_client import TalkClient
from errors import TalkApiError

logger = logging.getLogger(__name__)


class MemberModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def invite_many(self, emails: list[str]) -> list[str]:
        invited: list[str] = []
        for email in emails:
            try:
                await self._client.post("/v1/organization-invites/", json={
                    "email": email,
                    "allowedChannel": {"allChannelsEnable": True, "channels": []},
                    "allowedChannelSession": {"allChannelsSessionEnable": True, "channelsSession": []},
                    "allowedSector": {"allSectorsEnable": True, "sectors": []},
                    "allowedContactsBoard": {"allContactsBoardsEnable": True, "contactsBoards": []},
                    "allowedContact": True,
                    "allowedQuickAnswer": ["Create", "Edit", "Delete"],
                    "allowedTemplate": True,
                    "allowReport": True,
                })
                invited.append(email)
            except TalkApiError as exc:
                logger.error("Falha ao convidar '%s': %s", email, exc)
        return invited
