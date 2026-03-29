import logging

from client.talk_client import TalkClient
from models import AiConfig, OnboardingRequest

logger = logging.getLogger(__name__)

_DEFAULT_VOICE_ID = "João Pedro"

_INDUSTRY_MAP = {
    "beleza": "Beleza e Estética",
    "saude": "Saúde",
    "ecommerce": "E-commerce",
    "educacao": "Educação",
}

_CHATBOT_TYPE_MAP = {
    "support": "SupportV2",
    "sales": "Sales",
    "qualification": "Qualification",
    "greeting": "SupportV2",
    "sector_forwarding": "SupportV2",
    "tagging": "Qualification",
}

_TRIGGER_ENCERRAR = "Encerrar chat"
_TRIGGER_HUMANO = "Falar com humano"


def _infer_communication_style(approach: str) -> str:
    approach_lower = (approach or "").lower()
    if "formal" in approach_lower:
        return "Formal"
    if "informal" in approach_lower or "descontraí" in approach_lower or "casual" in approach_lower:
        return "Informal"
    return "Regular"


def _build_intents(bot_id: str) -> tuple[list[dict], dict, dict]:
    """Returns (intents list, invalidMessageIntent, maxResponsesIntent)."""
    intents = [
        {
            "description": "Quando finalizar um atendimento",
            "action": {"botId": bot_id, "triggerName": _TRIGGER_ENCERRAR, "initialData": None},
            "required": True,
            "replyAfterExecuteTool": True,
        },
        {
            "description": "Quando for necessário transferir para um humano",
            "action": {"botId": bot_id, "triggerName": _TRIGGER_HUMANO, "initialData": None},
            "required": True,
            "replyAfterExecuteTool": True,
        },
    ]
    invalid_intent = {
        "description": "Quando receber mensagens de tipo inválido (vídeo, imagem, documentos, etc.)",
        "action": {"botId": bot_id, "triggerName": _TRIGGER_HUMANO, "initialData": None},
        "required": True,
        "replyAfterExecuteTool": False,
    }
    max_responses_intent = {
        "description": "Quando o agente de IA atingir o limite de respostas",
        "action": {"botId": bot_id, "triggerName": _TRIGGER_HUMANO, "initialData": None},
        "required": True,
        "replyAfterExecuteTool": False,
    }
    return intents, invalid_intent, max_responses_intent


class AiAgentModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(
        self,
        request: OnboardingRequest,
        ai_config: AiConfig,
        general_prompt: str,
        intent_bot_id: str | None = None,
        kb_id: str | None = None,
    ) -> bool:
        agent_type = request.ai_agent_type or "support"
        chatbot_type = _CHATBOT_TYPE_MAP.get(agent_type, "SupportV2")
        communication_style = _infer_communication_style(request.approach)
        industry = _INDUSTRY_MAP.get(request.segment, request.segment)

        intents: list[dict] = []
        invalid_intent = None
        max_responses_intent = None
        if intent_bot_id:
            intents, invalid_intent, max_responses_intent = _build_intents(intent_bot_id)

        payload: dict = {
            "displayName": ai_config.chatbot_name,
            "signature": ai_config.chatbot_name,
            "organizationName": request.business_name,
            "organizationIndustry": industry,
            "aiBotLocale": "PT_BR",
            "botLLM": "Standard",
            "chatbotType": chatbot_type,
            "communicationStyle": communication_style,
            "generalPrompt": general_prompt,
            "voiceId": _DEFAULT_VOICE_ID,
            "maxResponses": 50,
            "maxCharacterByResponses": 600,
            "inactivityWindowToReply": 8,
            "replyAfterTransfer": False,
            "replyInAudio": "Never",
            "llmTemperature": 0,
            "intents": intents,
        }

        if invalid_intent:
            payload["invalidMessageIntent"] = invalid_intent
        if max_responses_intent:
            payload["maxResponsesIntent"] = max_responses_intent
        if kb_id:
            payload["allowed_kb_ids"] = [kb_id]

        result = await self._client.post("/v1/ai-agents/", json=payload)

        agent_id = result.get("id")
        if not agent_id:
            logger.error("Resposta da criação do agente IA sem 'id': %s", result)
            return False

        logger.info("Agente IA criado (Draft): %s — publicando...", agent_id)
        await self._publish(agent_id, payload)
        return True

    async def _publish(self, agent_id: str, creation_payload: dict) -> None:
        update_payload = {**creation_payload, "status": "Published"}
        try:
            await self._client.put(
                f"/v1/ai-agents/{agent_id}/",
                json=update_payload,
            )
            logger.info("Agente IA publicado: %s", agent_id)
        except Exception as exc:
            logger.warning("Falha ao publicar agente IA %s: %s", agent_id, exc)
