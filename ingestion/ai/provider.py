from abc import ABC, abstractmethod
from typing import Any

class AIProvider(ABC):
    @abstractmethod
    def generate_summary(
        self,
        article_text: str,
        language: str = "en"
    ) -> dict[str, Any]:
        """
        Generate a structured article summary in the requested language.
        """
        raise NotImplementedError