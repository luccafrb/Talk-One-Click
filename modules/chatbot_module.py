import logging
import time
import uuid

from client.talk_client import TalkClient
from errors import TalkApiError
from models import AiConfig, OnboardingRequest

logger = logging.getLogger(__name__)


def _make_id() -> str:
    return format(int(time.time()), "08x") + uuid.uuid4().hex[:16]


def _find_terminal_id(custom_steps: list[dict], ids: list[str]) -> str | None:
    """Return the ID of the best fallback step for out-of-hours/unconnected ranges.

    Preference order:
    1. send_message immediately before the last close_chat
    2. the last close_chat
    3. the last step
    """
    for i in range(len(custom_steps) - 1, -1, -1):
        if custom_steps[i]["type"] == "close_chat":
            if i > 0 and custom_steps[i - 1]["type"] == "send_message":
                return ids[i - 1]
            return ids[i]
    return ids[-1] if ids else None


class ChatbotModule:
    def __init__(self, client: TalkClient) -> None:
        self._client = client

    async def create(
        self,
        ai_config: AiConfig,
        request: OnboardingRequest,
        sectors: list[dict],
        channel_id: str | None,
        labels: list[dict] | None = None,
    ) -> bool:
        print(f"[DEBUG] channel_id recebido: {channel_id}")
        sector_map = {s["name"]: s["id"] for s in sectors}
        label_map = {l["name"]: l["id"] for l in (labels or [])}

        if ai_config.custom_steps:
            steps = self._build_custom_steps(ai_config.custom_steps, sector_map, label_map)
        else:
            flow = request.chatbot_flow or "collect"
            steps = self._build_steps(flow, ai_config, sector_map)

        payload = {
            "_t": "CreateFlowchartBotModel",
            "title": ai_config.chatbot_name,
            "organizationId": self._client.organization_id,
            "channelIds": [channel_id] if channel_id is not None else [],
            "trigger": "ChatCreated",
            "final": False,
            "steps": steps,
        }
        print(f"[DEBUG] channelIds no payload: {payload['channelIds']}")
        try:
            await self._client.post("/v1/bots/flowchart/", json=payload)
            return True
        except TalkApiError as exc:
            logger.error("Falha ao criar chatbot '%s': %s", ai_config.chatbot_name, exc)
            return False

    # ── Custom flow ──────────────────────────────────────────────────────────

    def _build_custom_steps(
        self,
        custom_steps: list[dict],
        sector_map: dict,
        label_map: dict,
    ) -> list[dict]:
        ids = [_make_id() for _ in custom_steps]

        # Pre-scan: assign Y lanes to branch targets of options/time_of_day steps
        branch_y: dict[int, int] = {}
        for block in custom_steps:
            btype = block["type"]
            params = block.get("params", {})
            if btype == "options":
                for lane, opt in enumerate(params.get("options", [])):
                    target = opt.get("next", -1)
                    if 0 <= target < len(custom_steps) and target not in branch_y:
                        branch_y[target] = lane * 600
            elif btype == "time_of_day":
                for lane, r in enumerate(params.get("ranges", [])):
                    target = r.get("next", -1)
                    if 0 <= target < len(custom_steps) and target not in branch_y:
                        branch_y[target] = lane * 600

        steps = []

        for idx, block in enumerate(custom_steps):
            btype = block["type"]
            params = block.get("params", {})
            bid = ids[idx]
            next_id = ids[idx + 1] if idx + 1 < len(ids) else None
            y = branch_y.get(idx, 0)
            x = idx * 400

            if btype == "send_message" or btype == "collect_text":
                step = {
                    "_t": "CreateSendMessageActionModel",
                    "id": bid,
                    "message": params["message"],
                    "isPrivate": False,
                    "position": {"x": x, "y": y},
                }
                if next_id:
                    step["nextStepId"] = next_id

            elif btype == "options":
                step = {
                    "_t": "CreateOptionsStepModel",
                    "id": bid,
                    "text": params["text"],
                    "options": [
                        {"text": opt["label"], "stepId": ids[opt["next"]]}
                        for opt in params["options"]
                        if opt["next"] < len(ids)
                    ],
                    "messageType": None,
                    "position": {"x": x, "y": y},
                }

            elif btype == "sector_transfer":
                step = {
                    "_t": "CreateSectorTransferActionModel",
                    "id": bid,
                    "sectorId": sector_map.get(params.get("sector_name")),
                    "strategy": "Direct",
                    "onlyAllowedMember": False,
                    "position": {"x": x, "y": y},
                }

            elif btype == "tag":
                step = {
                    "_t": "CreateTagActionModel",
                    "id": bid,
                    "option": params["option"],
                    "tags": [label_map[n] for n in params.get("tag_names", []) if n in label_map],
                    "contactTags": [],
                    "position": {"x": x, "y": y},
                }
                if next_id:
                    step["nextStepId"] = next_id

            elif btype == "time_of_day":
                ranges_raw = params.get("ranges", [])
                ranges_built = [
                    {
                        "range": {"start": r["start"], "end": r["end"]},
                        "stepId": ids[r["next"]] if r.get("next", -1) >= 0 and r["next"] < len(ids) else None,
                    }
                    for r in ranges_raw
                ]
                # For any range without a stepId, fall back to the best terminal step:
                # the send_message just before close_chat, or close_chat itself, or last step.
                fallback_id = _find_terminal_id(custom_steps, ids)
                ranges_built = [
                    {**r, "stepId": r["stepId"] if r["stepId"] is not None else fallback_id}
                    for r in ranges_built
                ]
                # API requires minimum 2 contiguous ranges covering 24h.
                if len(ranges_built) == 1:
                    first_start = ranges_raw[0]["start"]
                    last_end = ranges_raw[0]["end"]
                    ranges_built.append({
                        "range": {"start": last_end, "end": first_start},
                        "stepId": fallback_id,
                    })
                elif len(ranges_built) == 0:
                    ranges_built = [
                        {"range": {"start": "08:00", "end": "18:00"}, "stepId": fallback_id},
                        {"range": {"start": "18:00", "end": "08:00"}, "stepId": fallback_id},
                    ]
                step = {
                    "_t": "CreateTimeOfDayStepModel",
                    "id": bid,
                    "timeZone": params.get("timezone", "America/Sao_Paulo"),
                    "ranges": ranges_built,
                    "position": {"x": x, "y": y},
                }

            elif btype == "day_of_week":
                days_raw = params.get("days", [None] * 7)
                step = {
                    "_t": "CreateDayOfTheWeekStepModel",
                    "id": bid,
                    "timeZone": params.get("timezone", "America/Sao_Paulo"),
                    "stepsForDaysOfTheWeek": [
                        ids[d] if isinstance(d, int) and d < len(ids) else None
                        for d in days_raw
                    ],
                    "position": {"x": x, "y": y},
                }

            elif btype == "wait":
                step = {
                    "_t": "CreateWaitingActionModel",
                    "id": bid,
                    "interval": {
                        "_t": "WaitingActionFixedIntervalModel",
                        "interval": params["interval"],
                    },
                    "position": {"x": x, "y": y},
                }
                if next_id:
                    step["nextStepId"] = next_id

            elif btype == "close_chat":
                step = {
                    "_t": "CreateCloseChatActionModel",
                    "id": bid,
                    "closedByAs": "NoOne",
                    "position": {"x": x, "y": y},
                }

            else:
                logger.warning("Tipo de bloco desconhecido ignorado: %s", btype)
                continue

            steps.append(step)

        # Prepend ChatStartedEvent
        start_id = _make_id()
        start_step = {
            "_t": "CreateFlowchartBotChatStartedEventModel",
            "id": start_id,
            "nextStepId": ids[0] if ids else None,
            "position": {"x": -400, "y": 0},
        }
        return [start_step] + steps

    # ── Standard flows ────────────────────────────────────────────────────────

    def _build_steps(self, flow: str, ai_config: AiConfig, sector_map: dict) -> list[dict]:
        if flow == "welcome_only":
            return self._steps_welcome_only(ai_config, sector_map)
        if flow == "menu":
            return self._steps_menu(ai_config, sector_map)
        return self._steps_collect(ai_config, sector_map)

    def _steps_welcome_only(self, ai_config: AiConfig, sector_map: dict) -> list[dict]:
        s1, s2, s3 = _make_id(), _make_id(), _make_id()
        first_sector = ai_config.sectors[0] if ai_config.sectors else None
        return [
            {"_t": "CreateFlowchartBotChatStartedEventModel", "id": s1, "nextStepId": s2, "position": {"x": 0, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s2, "nextStepId": s3, "message": ai_config.welcome_message, "isPrivate": False, "position": {"x": 400, "y": 0}},
            {"_t": "CreateSectorTransferActionModel", "id": s3, "sectorId": sector_map.get(first_sector), "strategy": "Direct", "onlyAllowedMember": False, "position": {"x": 800, "y": 0}},
        ]

    def _steps_collect(self, ai_config: AiConfig, sector_map: dict) -> list[dict]:
        s1, s2, s3, s4, s5 = _make_id(), _make_id(), _make_id(), _make_id(), _make_id()
        first_sector = ai_config.sectors[0] if ai_config.sectors else None
        return [
            {"_t": "CreateFlowchartBotChatStartedEventModel", "id": s1, "nextStepId": s2, "position": {"x": 0, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s2, "nextStepId": s3, "message": ai_config.welcome_message, "isPrivate": False, "position": {"x": 400, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s3, "nextStepId": s4, "message": "Para continuar, qual é o seu nome?", "isPrivate": False, "position": {"x": 800, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s4, "nextStepId": s5, "message": "Obrigado! Agora me informe seu e-mail:", "isPrivate": False, "position": {"x": 1200, "y": 0}},
            {"_t": "CreateSectorTransferActionModel", "id": s5, "sectorId": sector_map.get(first_sector), "strategy": "Direct", "onlyAllowedMember": False, "position": {"x": 1600, "y": 0}},
        ]

    def _steps_menu(self, ai_config: AiConfig, sector_map: dict) -> list[dict]:
        s1, s2, s3 = _make_id(), _make_id(), _make_id()
        transfer_ids = [_make_id() for _ in ai_config.sectors]

        options = [
            {"text": sector, "stepId": transfer_ids[i]}
            for i, sector in enumerate(ai_config.sectors)
        ]

        steps = [
            {"_t": "CreateFlowchartBotChatStartedEventModel", "id": s1, "nextStepId": s2, "position": {"x": 0, "y": 0}},
            {"_t": "CreateSendMessageActionModel", "id": s2, "nextStepId": s3, "message": ai_config.welcome_message, "isPrivate": False, "position": {"x": 400, "y": 0}},
            {"_t": "CreateOptionsStepModel", "id": s3, "text": "Como posso te ajudar?", "options": options, "messageType": None, "position": {"x": 800, "y": 0}},
        ]

        for i, (sector, transfer_id) in enumerate(zip(ai_config.sectors, transfer_ids)):
            steps.append({
                "_t": "CreateSectorTransferActionModel",
                "id": transfer_id,
                "sectorId": sector_map.get(sector),
                "strategy": "Direct",
                "onlyAllowedMember": False,
                "position": {"x": 1200, "y": i * 600},
            })

        return steps
