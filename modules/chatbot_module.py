import logging
import time
import uuid

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig, OnboardingRequest

logger = logging.getLogger(__name__)


def _make_id() -> str:
    return format(int(time.time()), "08x") + uuid.uuid4().hex[:16]


class ChatbotModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(self, ai_config: AiConfig, request: OnboardingRequest) -> bool:
        flow = request.chatbot_flow or "collect"
        steps = self._build_steps(flow, ai_config)
        payload = {
            "_t": "CreateFlowchartBotModel",
            "title": ai_config.chatbot_name,
            "organizationId": self._client.organization_id,
            "channelIds": [],
            "trigger": "ChatCreated",
            "final": False,
            "steps": steps,
        }
        try:
            await self._client.post("/v1/bots/flowchart/", json=payload)
            return True
        except TalkApiError as exc:
            logger.error("Falha ao criar chatbot '%s': %s", ai_config.chatbot_name, exc)
            return False

    def _build_steps(self, flow: str, ai_config: AiConfig) -> list[dict]:
        if flow == "welcome_only":
            return self._steps_welcome_only(ai_config)
        if flow == "menu":
            return self._steps_menu(ai_config)
        return self._steps_collect(ai_config)

    def _steps_welcome_only(self, ai_config: AiConfig) -> list[dict]:
        s1, s2, s3 = _make_id(), _make_id(), _make_id()
        return [
            {"_t": "CreateFlowchartBotChatStartedEventModel", "id": s1, "nextStepId": s2, "position": {"x": 0, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s2, "nextStepId": s3, "message": ai_config.welcome_message, "isPrivate": False, "position": {"x": 0, "y": 200}},
            {"_t": "CreateSectorTransferActionModel", "id": s3, "sectorId": None, "strategy": "Direct", "onlyAllowedMember": False, "position": {"x": 0, "y": 400}},
        ]

    def _steps_collect(self, ai_config: AiConfig) -> list[dict]:
        s1, s2, s3, s4, s5 = _make_id(), _make_id(), _make_id(), _make_id(), _make_id()
        return [
            {"_t": "CreateFlowchartBotChatStartedEventModel", "id": s1, "nextStepId": s2, "position": {"x": 0, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s2, "nextStepId": s3, "message": ai_config.welcome_message, "isPrivate": False, "position": {"x": 0, "y": 200}},
            {"_t": "CreateSendMessageActionModel", "id": s3, "nextStepId": s4, "message": "Para continuar, qual é o seu nome?", "isPrivate": False, "position": {"x": 0, "y": 400}},
            {"_t": "CreateSendMessageActionModel", "id": s4, "nextStepId": s5, "message": "Obrigado! Agora me informe seu e-mail:", "isPrivate": False, "position": {"x": 0, "y": 600}},
            {"_t": "CreateSectorTransferActionModel", "id": s5, "sectorId": None, "strategy": "Direct", "onlyAllowedMember": False, "position": {"x": 0, "y": 800}},
        ]

    def _steps_menu(self, ai_config: AiConfig) -> list[dict]:
        s1, s2, s3 = _make_id(), _make_id(), _make_id()
        s_close = _make_id()

        transfer_ids = [_make_id() for _ in ai_config.sectors]

        options = [
            {"text": sector, "stepId": transfer_ids[i]}
            for i, sector in enumerate(ai_config.sectors)
        ]

        steps = [
            {"_t": "CreateFlowchartBotChatStartedEventModel", "id": s1, "nextStepId": s2, "position": {"x": 0, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s2, "nextStepId": s3, "message": ai_config.welcome_message, "isPrivate": False, "position": {"x": 0, "y": 200}},
            {"_t": "CreateOptionsStepModel", "id": s3, "text": "Como posso te ajudar?", "options": options, "messageType": None, "position": {"x": 0, "y": 400}},
        ]

        for i, transfer_id in enumerate(transfer_ids):
            steps.append({
                "_t": "CreateSectorTransferActionModel",
                "id": transfer_id,
                "sectorId": None,
                "strategy": "Direct",
                "onlyAllowedMember": False,
                "nextStepId": s_close,
                "position": {"x": 0, "y": 600 + i * 200},
            })

        steps.append({
            "_t": "CreateCloseChatActionModel",
            "id": s_close,
            "closedByAs": "NoOne",
            "position": {"x": 0, "y": 600 + len(ai_config.sectors) * 200},
        })

        return steps
