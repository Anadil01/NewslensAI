import os
from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider
from .provider import AIProvider

def get_ai_provider() -> AIProvider:
    provider = os.getenv("AI_PROVIDER", "gemini").lower()

    if provider == "gemini":
        return GeminiProvider()
    if provider == "openrouter":
        return OpenRouterProvider()

    raise ValueError(f"Unsupported AI provider: {provider}")