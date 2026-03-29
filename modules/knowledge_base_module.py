import logging

from client.talk_client import TalkClient
from errors import TalkApiError

logger = logging.getLogger(__name__)


class KnowledgeBaseModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create_and_train(self, business_name: str, general_prompt: str) -> str | None:
        """Creates a KB, seeds it with the agent's general prompt, triggers ingestion.
        Returns the KB id or None on failure."""
        try:
            result = await self._client.post(
                "/v1/knowledge-bases/",
                json={"name": f"Base de conhecimento - {business_name}"},
            )
            kb_id = result.get("id")
            if not kb_id:
                logger.error("Resposta da criação de KB sem 'id': %s", result)
                return None

            await self._client.post(
                f"/v1/knowledge-bases/{kb_id}/qa/",
                json={
                    "title": f"Sobre {business_name}",
                    "content": general_prompt,
                    "kbId": kb_id,
                },
            )

            await self._client.post(f"/v1/knowledge-bases/{kb_id}/ingest/", json={})

            logger.info("Base de conhecimento criada e treinada: %s", kb_id)
            return kb_id

        except TalkApiError as exc:
            logger.error("Falha ao criar base de conhecimento: %s", exc)
            return None
