from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


class AnalyticsProcessor:
    def __init__(
        self,
        chats: list[dict],
        ratings: list[dict],
        members: list[dict],
    ) -> None:
        self.chats = chats
        self.ratings = ratings
        self.members = members
        self._ratings_by_chat: dict[str, dict] = {
            r["chat"]["id"]: r for r in ratings if isinstance(r.get("chat"), dict) and r["chat"].get("id")
        }

    # ── KPIs ──────────────────────────────────────────────────────────────────

    def compute_kpis(self) -> dict:
        total = len(self.chats)
        waiting = sum(1 for c in self.chats if c.get("waiting"))
        closed = [c for c in self.chats if c.get("closedAtUTC")]

        wait_times: list[float] = []
        for c in closed:
            w = _parse_dt(c.get("waitingSinceUTC"))
            cl = _parse_dt(c.get("closedAtUTC"))
            if w and cl and cl > w:
                wait_times.append((cl - w).total_seconds())

        frt_list: list[float] = []
        for c in self.chats:
            frm = c.get("firstMemberReplyMessage")
            if not isinstance(frm, dict):
                continue
            created = _parse_dt(c.get("eventAtUTC"))
            replied = _parse_dt(frm.get("eventAtUTC"))  # MessageReferenceModel usa eventAtUTC
            if created and replied and replied > created:
                frt_list.append((replied - created).total_seconds())

        # Bot detection: totalAIResponses > 0 OR non-empty bots array
        bot_chats = [
            c for c in closed
            if (c.get("totalAIResponses") or 0) > 0 or c.get("bots")
        ]
        bot_resolved = [c for c in bot_chats if not c.get("organizationMember")]

        scores = [
            r["rating"] for r in self.ratings
            if r.get("rating") is not None
        ]

        agent_ids: set[str] = set()
        for c in self.chats:
            m = c.get("organizationMember")
            if isinstance(m, dict) and m.get("id"):
                agent_ids.add(m["id"])

        return {
            "total_conversations": total,
            "waiting_now": waiting,
            "avg_wait_time_seconds": statistics.mean(wait_times) if wait_times else 0,
            "resolution_rate": len(closed) / total if total else 0,
            "bot_resolution_rate": len(bot_resolved) / len(bot_chats) if bot_chats else 0,
            "active_agents": len(agent_ids),
            "avg_csat": statistics.mean(scores) if scores else None,
            "avg_first_response_seconds": statistics.mean(frt_list) if frt_list else 0,
        }

    # ── Volume series ──────────────────────────────────────────────────────────

    def volume_series(self) -> list[dict]:
        by_day: dict[str, dict] = defaultdict(lambda: {"human_count": 0, "bot_count": 0})
        for c in self.chats:
            day = (c.get("eventAtUTC") or "")[:10]
            if not day:
                continue
            is_bot = (c.get("totalAIResponses") or 0) > 0 or bool(c.get("bots"))
            key = "bot_count" if is_bot else "human_count"
            by_day[day][key] += 1
        return [{"date": d, **v} for d, v in sorted(by_day.items())]

    # ── Hourly heatmap ────────────────────────────────────────────────────────

    def hourly_heatmap(self) -> list[dict]:
        grid: dict[tuple[int, int], int] = defaultdict(int)
        for c in self.chats:
            dt = _parse_dt(c.get("eventAtUTC"))
            if dt:
                grid[(dt.weekday(), dt.hour)] += 1
        return [
            {"weekday": wd, "hour": h, "count": cnt}
            for (wd, h), cnt in grid.items()
        ]

    # ── Agent ranking ─────────────────────────────────────────────────────────

    def agent_ranking(self) -> list[dict]:
        agents: dict[str, dict] = {}
        for c in self.chats:
            # organizationMember = agente atual (null em chats fechados)
            # lastOrganizationMember = último agente que atendeu
            m = c.get("organizationMember") or c.get("lastOrganizationMember")
            if not isinstance(m, dict) or not m.get("id"):
                continue
            aid = m["id"]
            if aid not in agents:
                # ChatAgentReferenceModel não tem campo name — usamos id como fallback
                display = m.get("name") or m.get("email") or aid
                agents[aid] = {
                    "id": aid,
                    "name": display,
                    "resolved": 0,
                    "csat_list": [],
                }
            if c.get("closedAtUTC"):
                agents[aid]["resolved"] += 1
            chat_id = c.get("id")
            r = self._ratings_by_chat.get(chat_id)
            if r and r.get("rating") is not None:
                agents[aid]["csat_list"].append(r["rating"])

        result = []
        for a in agents.values():
            result.append({
                "id": a["id"],
                "name": a["name"],
                "resolved": a["resolved"],
                "avg_csat": statistics.mean(a["csat_list"]) if a["csat_list"] else None,
            })
        return sorted(result, key=lambda x: x["resolved"], reverse=True)

    # ── Tag distribution ──────────────────────────────────────────────────────

    def tag_distribution(self) -> list[dict]:
        counts: dict[str, int] = defaultdict(int)
        for c in self.chats:
            for t in (c.get("tags") or []):
                if not isinstance(t, dict):
                    continue
                name = t.get("name") or t.get("id") or "?"
                counts[name] += 1
        return [
            {"name": n, "count": v}
            for n, v in sorted(counts.items(), key=lambda x: -x[1])[:10]
        ]

    # ── Channel distribution ──────────────────────────────────────────────────

    def channel_distribution(self) -> list[dict]:
        counts: dict[str, int] = defaultdict(int)
        for c in self.chats:
            ch = c.get("channel")
            if isinstance(ch, dict):
                name = ch.get("name") or ch.get("id") or "Desconhecido"
            else:
                name = "Desconhecido"
            counts[name] += 1
        total = sum(counts.values()) or 1
        return [
            {"name": n, "count": v, "pct": round(v / total * 100, 1)}
            for n, v in sorted(counts.items(), key=lambda x: -x[1])
        ]

    # ── Bot stats ─────────────────────────────────────────────────────────────

    def bot_stats(self) -> dict:
        bot_chats = [
            c for c in self.chats
            if (c.get("totalAIResponses") or 0) > 0 or c.get("bots")
        ]
        resolved_by_bot = [c for c in bot_chats if not c.get("organizationMember")]
        transferred = [c for c in bot_chats if c.get("organizationMember")]
        return {
            "initiated": len(bot_chats),
            "resolved_without_human": len(resolved_by_bot),
            "transferred": len(transferred),
        }
