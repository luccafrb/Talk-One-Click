import logging

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig, OnboardingRequest

logger = logging.getLogger(__name__)


class ChatbotModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(self, ai_config: AiConfig, request: OnboardingRequest) -> bool:
        try:
            await self._client.post(
                "/v1/bots/flowchart/",
                json={"name": ai_config.chatbot_name, "isActive": True},
            )
            return True
        except TalkApiError as exc:
            logger.error("Falha ao criar chatbot '%s': %s", ai_config.chatbot_name, exc)
            return False
