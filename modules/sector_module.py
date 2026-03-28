import logging

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig

logger = logging.getLogger(__name__)

_TEMPLATES: dict[str, list[str]] = {
    "beleza": ["Agendamentos", "Atendimento", "Financeiro"],
    "saude": ["Consultas", "Exames", "Administrativo"],
    "ecommerce": ["Vendas", "Suporte", "Trocas e Devoluções"],
    "educacao": ["Matrículas", "Suporte Acadêmico", "Financeiro"],
}


class SectorModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_many(self, segment: str, ai_config: AiConfig) -> int:
        names = _TEMPLATES.get(segment, [])
        created = 0

        for name in names:
            try:
                await self._client.post("/v1/sectors/", json={"name": name})
                created += 1
            except TalkApiError as exc:
                logger.error("Falha ao criar setor '%s': %s", name, exc)

        return created
