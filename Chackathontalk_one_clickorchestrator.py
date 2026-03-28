from ai.ai_configurator import AiConfigurator
from client.talk_client import TalkClient
from models import OnboardingRequest, OnboardingResult, StepError
from modules.chatbot_module import ChatbotModule
from modules.label_module import LabelModule
from modules.sector_module import SectorModule


class Orchestrator:
    def __init__(self, talk_api_key: str, organization_id: str) -> None:
        client = TalkClient(talk_api_key, organization_id)
        self._ai_configurator = AiConfigurator()
        self._sector_module = SectorModule(client)
        self._label_module = LabelModule(client)
        self._chatbot_module = ChatbotModule(client)

    async def run(self, request: OnboardingRequest) -> OnboardingResult:
        errors: list[StepError] = []

        try:
            ai_config = await self._ai_configurator.generate(request)
        except Exception as e:
            errors.append(StepError(step="ai", error=str(e)))
            return OnboardingResult(status="error", errors=errors)

        sectors_created = 0
        try:
            sectors_created = await self._sector_module.create_many(request.segment, ai_config)
        except Exception as e:
            errors.append(StepError(step="sectors", error=str(e)))

        labels_created = 0
        try:
            labels_created = await self._label_module.create_many(request.segment, ai_config)
        except Exception as e:
            errors.append(StepError(step="labels", error=str(e)))

        chatbot_created = False
        try:
            chatbot_created = await self._chatbot_module.create(ai_config, request)
        except Exception as e:
            errors.append(StepError(step="chatbot", error=str(e)))

        if not chatbot_created and not any(e.step == "chatbot" for e in errors):
            errors.append(StepError(step="chatbot", error="Falha ao criar chatbot"))

        status = "ok" if not errors else "partial"
        return OnboardingResult(
            status=status,
            sectors_created=sectors_created,
            labels_created=labels_created,
            chatbot_created=chatbot_created,
            errors=errors,
        )
