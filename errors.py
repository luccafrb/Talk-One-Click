class TalkApiError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        self.message = message
        super().__init__(f"TalkAPI {status_code}: {message}")


class AiConfigError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(f"AiConfig error: {message}")
