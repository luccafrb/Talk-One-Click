import logging

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig, OnboardingRequest

logger = logging.getLogger(__name__)


class ChatbotModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(self, ai_config: AiConfig, request: OnboardingRequest) -> bool:
        payload = {
            "_t": "CreateFlowchartBotModel",
            "title": ai_config.chatbot_name,
            "organizationId": self._client.organization_id,
            "channelIds": [],
            "trigger": "ChatCreated",
            "final": False,
            "steps": [
                {
                    "_t": "CreateFlowchartBotChatStartedEventModel",
                    "id": "step-1",
                    "nextStepId": "step-2",
                    "position": {"x": 0, "y": 0},
                },
                {
                    "_t": "CreateCloseChatActionModel",
                    "id": "step-2",
                    "position": {"x": 0, "y": 200},
                    "closedByAs": "NoOne",
                },
            ],
        }
        try:
            await self._client.post("/v1/bots/flowchart/", json=payload)
            return True
        except TalkApiError as exc:
            logger.error("Falha ao criar chatbot '%s': %s", ai_config.chatbot_name, exc)
            return False
