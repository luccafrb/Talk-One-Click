from ai.ai_configurator import AiConfigurator
from client.talk_client import TalkClient
from models import OnboardingRequest, OnboardingResult, SectorResult, StepError
from modules.channel_module import ChannelModule
from modules.chatbot_module import ChatbotModule
from modules.label_module import LabelModule
from modules.member_module import MemberModule
from modules.sector_module import SectorModule

# [AI AGENT FEATURE — desabilitada temporariamente, código preservado nos módulos]
# from modules.ai_agent_module import AiAgentModule
# from modules.intent_chatbot_module import IntentChatbotModule
# from modules.knowledge_base_module import KnowledgeBaseModule


class Orchestrator:
    def __init__(self, talk_api_key: str, organization_id: str) -> None:
        client = TalkClient(talk_api_key, organization_id)
        self._ai_configurator = AiConfigurator()
        self._channel_module = ChannelModule(client)
        self._sector_module = SectorModule(client)
        self._label_module = LabelModule(client)
        self._member_module = MemberModule(client)
        self._chatbot_module = ChatbotModule(client)
        # self._intent_chatbot_module = IntentChatbotModule(client)
        # self._knowledge_base_module = KnowledgeBaseModule(client)
        # self._ai_agent_module = AiAgentModule(client)

    async def run(self, request: OnboardingRequest) -> OnboardingResult:
        errors: list[StepError] = []

        try:
            ai_config = await self._ai_configurator.generate(request)
        except Exception as e:
            errors.append(StepError(step="ai", error=str(e)))
            return OnboardingResult(status="error", errors=errors)

        channel_id: str | None = None
        if request.create_channel and request.channel_name:
            channel_id = await self._channel_module.create(request.channel_name)
            if channel_id is None:
                errors.append(StepError(step="channel", error="Falha ao criar canal"))

        sectors: list[dict] = []
        if request.create_sectors:
            try:
                sectors = await self._sector_module.create_many(request.segment, ai_config)
            except Exception as e:
                errors.append(StepError(step="sectors", error=str(e)))

        labels: list[dict] = []
        if request.create_labels:
            try:
                labels = await self._label_module.create_many(request.segment, ai_config)
            except Exception as e:
                errors.append(StepError(step="labels", error=str(e)))

        invited: list[str] = []
        if request.member_emails:
            try:
                invited = await self._member_module.invite_many(request.member_emails)
            except Exception as e:
                errors.append(StepError(step="members", error=str(e)))

        chatbot_created = False
        if request.create_chatbot:
            try:
                chatbot_created = await self._chatbot_module.create(ai_config, request, sectors, channel_id, labels)
            except Exception as e:
                errors.append(StepError(step="chatbot", error=str(e)))

            if not chatbot_created and not any(e.step == "chatbot" for e in errors):
                errors.append(StepError(step="chatbot", error="Falha ao criar chatbot"))

        # [AI AGENT FEATURE — desabilitada temporariamente]
        # Para reativar: descomentar imports acima, instanciar módulos no __init__,
        # e descomentar o bloco abaixo.
        #
        # ai_agent_created = False
        # if request.create_ai_agent:
        #     try:
        #         agent_prompt = await self._ai_configurator.generate_agent_prompt(request, ai_config)
        #
        #         kb_id: str | None = None
        #         try:
        #             kb_id = await self._knowledge_base_module.create_and_train(
        #                 request.business_name, agent_prompt
        #             )
        #         except Exception as e:
        #             errors.append(StepError(step="ai_agent_kb", error=str(e)))
        #
        #         intent_bot_id: str | None = None
        #         try:
        #             intent_bot_id = await self._intent_chatbot_module.create(
        #                 ai_config.chatbot_name, sectors
        #             )
        #         except Exception as e:
        #             errors.append(StepError(step="ai_agent_intent_bot", error=str(e)))
        #
        #         ai_agent_created = await self._ai_agent_module.create(
        #             request, ai_config, agent_prompt, intent_bot_id, kb_id
        #         )
        #     except Exception as e:
        #         errors.append(StepError(step="ai_agent", error=str(e)))
        #
        #     if not ai_agent_created and not any(e.step == "ai_agent" for e in errors):
        #         errors.append(StepError(step="ai_agent", error="Falha ao criar agente IA"))

        status = "ok" if not errors else "partial"
        return OnboardingResult(
            status=status,
            sectors_created=len(sectors),
            sectors=[SectorResult(**s) for s in sectors],
            labels_created=len(labels),
            labels=labels,
            chatbot_created=chatbot_created,
            channel_id=channel_id,
            members_invited=len(invited),
            ai_agent_created=False,
            errors=errors,
        )
