from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Segment = Literal[
    "beleza",
    "saude",
    "ecommerce",
    "educacao",
    "imobiliaria",
    "juridico",
    "financeiro",
    "restaurante",
    "logistica",
    "tecnologia",
    "construcao",
    "automotivo",
    "eventos",
    "pet",
    "outro",
]
Approach = Literal[
    "consultivo",
    "direto",
    "empatico",
    "tecnico",
    "comercial",
    "educativo",
]
OnboardingStatus = Literal["ok", "partial", "error"]
AiAgentType = Literal["support", "sales", "qualification", "greeting", "sector_forwarding", "tagging"]


class OnboardingRequest(BaseModel):
    business_name: str
    segment: Segment
    goal: str
    approach: Approach
    talk_api_key: str
    organization_id: str
    chatbot_flow: Literal["menu", "collect", "welcome_only"] | None = "collect"
    # Resource toggles
    create_sectors: bool = True
    sectors_description: str | None = None
    create_labels: bool = True
    labels_description: str | None = None
    create_channel: bool = True
    channel_name: str | None = None
    create_chatbot: bool = True
    chatbot_description: str | None = None
    # Members
    member_emails: list[str] | None = None
    label_colors_override: list[str] | None = None
    # Quick Answers
    create_quick_answers: bool = True
    quick_answers_description: str | None = None
    # Custom Fields
    create_custom_fields: bool = True
    custom_fields_description: str | None = None
    custom_field_items_override: list[dict] | None = None
    # Org Preferences
    configure_org_preferences: bool = True
    close_chat_message: str | None = None
    # AI agent
    create_ai_agent: bool = False
    ai_agent_type: AiAgentType | None = None
    ai_agent_description: str | None = None


class AiConfig(BaseModel):
    chatbot_name: str
    chatbot_approach: str
    explanation: str
    sectors: list[str]
    labels: list[str]
    label_colors: list[str] = []
    welcome_message: str
    custom_steps: list[dict] | None = None
    quick_answers: list[dict] = Field(default_factory=list)
    custom_fields: list[dict] = Field(default_factory=list)
    close_chat_message: str | None = None


class SectorResult(BaseModel):
    name: str
    id: str


class StepError(BaseModel):
    step: str
    error: str


class OnboardingResult(BaseModel):
    status: OnboardingStatus
    # AI summary
    chatbot_name: str | None = None
    chatbot_approach: str | None = None
    ai_explanation: str | None = None
    welcome_message: str | None = None
    # Resources
    sectors_created: int = 0
    sectors: list[SectorResult] = Field(default_factory=list)
    labels_created: int = 0
    labels: list[dict] = Field(default_factory=list)
    chatbot_created: bool = False
    channel_id: str | None = None
    members_invited: int = 0
    members: list[str] = Field(default_factory=list)
    quick_answers_created: int = 0
    custom_fields_created: int = 0
    org_preferences_configured: bool = False
    ai_agent_created: bool = False
    errors: list[StepError] = Field(default_factory=list)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatSessionRequest(BaseModel):
    messages: list[ChatMessage]
    draft: dict


class ChatSessionResponse(BaseModel):
    message: str
    draft: dict
    ready: bool


class MaturityRequest(BaseModel):
    messages: list[ChatMessage]
    onboarding_result: dict


class SurpriseRequest(BaseModel):
    segment: str | None = None
    business_name: str | None = None
    description: str | None = None


class ValidateCredentialsRequest(BaseModel):
    talk_api_key: str
    organization_id: str
