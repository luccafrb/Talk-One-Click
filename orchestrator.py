from ai.ai_configurator import AiConfigurator
from client.talk_client import TalkClient
from models import OnboardingRequest, OnboardingResult, SectorResult, StepError
from modules.channel_module import ChannelModule
from modules.chatbot_module import ChatbotModule
from modules.label_module import LabelModule
from modules.sector_module import SectorModule


class Orchestrator:
    def __init__(self, talk_api_key: str, organization_id: str) -> None:
        client = TalkClient(talk_api_key, organization_id)
        self._ai_configurator = AiConfigurator()
        self._channel_module = ChannelModule(client)
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

        channel_id: str | None = None
        if request.channel_name is not None:
            channel_id = await self._channel_module.create(request.channel_name)
            if channel_id is None:
                errors.append(StepError(step="channel", error="Falha ao criar canal"))

        sectors: list[dict] = []
        try:
            sectors = await self._sector_module.create_many(request.segment, ai_config)
        except Exception as e:
            errors.append(StepError(step="sectors", error=str(e)))

        labels: list[dict] = []
        try:
            labels = await self._label_module.create_many(request.segment, ai_config)
        except Exception as e:
            errors.append(StepError(step="labels", error=str(e)))

        chatbot_created = False
        try:
            chatbot_created = await self._chatbot_module.create(ai_config, request, sectors, channel_id, labels)
        except Exception as e:
            errors.append(StepError(step="chatbot", error=str(e)))

        if not chatbot_created and not any(e.step == "chatbot" for e in errors):
            errors.append(StepError(step="chatbot", error="Falha ao criar chatbot"))

        status = "ok" if not errors else "partial"
        return OnboardingResult(
            status=status,
            sectors_created=len(sectors),
            sectors=[SectorResult(**s) for s in sectors],
            labels_created=len(labels),
            labels=labels,
            chatbot_created=chatbot_created,
            channel_id=channel_id,
            errors=errors,
        )
