import logging
import time
import uuid

from client.talk_client import TalkClient
from errors import TalkApiError

logger = logging.getLogger(__name__)

_TRIGGER_ENCERRAR = "Encerrar chat"
_TRIGGER_HUMANO = "Falar com humano"


def _make_id() -> str:
    return format(int(time.time()), "08x") + uuid.uuid4().hex[:16]


class IntentChatbotModule:
    """Creates the companion FlowchartBot that AI-agent intents point to."""

    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(self, agent_name: str, sectors: list[dict]) -> str | None:
        first_sector_id = sectors[0]["id"] if sectors else None

        e_start = _make_id()
        e_msg = _make_id()
        e_close = _make_id()

        h_start = _make_id()
        h_transfer = _make_id()
        h_note = _make_id()

        steps: list[dict] = [
            # ── "Encerrar chat" branch ────────────────────────────────────────
            {
                "_t": "CreateFlowchartBotManualStartedEventModel",
                "id": e_start,
                "hidden": True,
                "triggerName": _TRIGGER_ENCERRAR,
                "variables": [],
                "nextStepId": e_msg,
                "position": {"x": 0, "y": 0},
            },
            {
                "_t": "CreateSendMessageActionModel",
                "id": e_msg,
                "message": "Obrigado pelo atendimento! Se precisar de ajuda novamente, estaremos aqui.",
                "isPrivate": False,
                "nextStepId": e_close,
                "position": {"x": 400, "y": 0},
            },
            {
                "_t": "CreateCloseChatActionModel",
                "id": e_close,
                "closedByAs": "ChatOwner",
                "position": {"x": 800, "y": 0},
            },
            # ── "Falar com humano" branch ─────────────────────────────────────
            {
                "_t": "CreateFlowchartBotManualStartedEventModel",
                "id": h_start,
                "hidden": True,
                "triggerName": _TRIGGER_HUMANO,
                "variables": [],
                "nextStepId": h_transfer,
                "position": {"x": 0, "y": 600},
            },
        ]

        if first_sector_id:
            steps += [
                {
                    "_t": "CreateSectorTransferActionModel",
                    "id": h_transfer,
                    "sectorId": first_sector_id,
                    "strategy": "Direct",
                    "onlyAllowedMember": False,
                    "nextStepId": h_note,
                    "position": {"x": 400, "y": 600},
                },
                {
                    "_t": "CreateSendMessageActionModel",
                    "id": h_note,
                    "message": "Atendimento transferido para um humano a pedido do cliente.",
                    "isPrivate": True,
                    "position": {"x": 800, "y": 600},
                },
            ]
        else:
            steps.append({
                "_t": "CreateSendMessageActionModel",
                "id": h_transfer,
                "message": "Transferindo para um atendente humano.",
                "isPrivate": False,
                "position": {"x": 400, "y": 600},
            })

        payload = {
            "_t": "CreateFlowchartBotModel",
            "title": f"Fluxos de {agent_name}",
            "organizationId": self._client.organization_id,
            "channelIds": [],
            "trigger": "Manual",
            "final": False,
            "steps": steps,
        }

        try:
            result = await self._client.post("/v1/bots/flowchart/", json=payload)
            bot_id = (
                result.get("id")
                or result.get("bot", {}).get("id")
            )
            if bot_id:
                logger.info("Chatbot de intenções criado: %s", bot_id)
            return bot_id
        except TalkApiError as exc:
            logger.error("Falha ao criar chatbot de intenções: %s", exc)
            return None
