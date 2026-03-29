import logging
import re

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig

logger = logging.getLogger(__name__)

_VALID_TYPES = {
    "CreateTextCustomFieldDefinitionModel",
    "CreateNumberCustomFieldDefinitionModel",
    "CreateCPFCustomFieldDefinitionModel",
    "CreateCNPJCustomFieldDefinitionModel",
    "CreateDateCustomFieldDefinitionModel",
    "CreateLinkCustomFieldDefinitionModel",
    "CreateLogicCustomFieldDefinitionModel",
    "CreateCurrencyCustomFieldDefinitionModel",
}


def _sanitize_name(name: str) -> str:
    """Convert to alphanumeric CamelCase: 'Data Nascimento' → 'DataNascimento'."""
    words = re.sub(r"[^a-zA-Z0-9\s]", "", name).split()
    return "".join(w.capitalize() for w in words)


class CustomFieldsModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_many(self, ai_config: AiConfig) -> list[dict]:
        created: list[dict] = []
        for field in ai_config.custom_fields:
            raw_name = field.get("name") or ""
            name = _sanitize_name(raw_name)[:160]
            if len(name) < 3:
                logger.warning("Campo customizado '%s' ignorado: nome inválido após sanitização", raw_name)
                continue

            field_type = field.get("type") or "CreateTextCustomFieldDefinitionModel"
            if field_type not in _VALID_TYPES:
                logger.warning("Tipo inválido '%s' para campo '%s', usando Text", field_type, name)
                field_type = "CreateTextCustomFieldDefinitionModel"

            try:
                response = await self._client.post("/v1/custom-field-definitions/", json={
                    "_t": field_type,
                    "name": name,
                })
                created.append({"name": name, "id": str(response.get("id", ""))})
            except TalkApiError as exc:
                logger.error("Falha ao criar campo customizado '%s': %s", name, exc)
        return created
