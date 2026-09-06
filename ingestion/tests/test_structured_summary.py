import sys
import unittest
from pathlib import Path


INGESTION_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(INGESTION_DIR))

from services.summarization_service import validate_ai_result


class StructuredSummaryTests(unittest.TestCase):
    def test_preserves_model_generated_structured_intelligence(self):
        result = validate_ai_result(
            {
                "summary": "A factual summary of the development.",
                "keyPoints": ["First fact", "Second fact", "Third fact"],
                "whyItMatters": "It affects the people named in the article.",
                "whatNext": "Officials are expected to publish more details.",
                "entities": ["NewsLensAI"],
                "confidence": 0.9,
            }
        )

        self.assertEqual(result["keyPoints"], ["First fact", "Second fact", "Third fact"])
        self.assertEqual(
            result["whyItMatters"],
            "It affects the people named in the article.",
        )
        self.assertEqual(
            result["whatNext"],
            "Officials are expected to publish more details.",
        )

    def test_allows_missing_optional_explanations(self):
        result = validate_ai_result(
            {
                "summary": "A factual summary of the development.",
                "keyPoints": [],
                "entities": [],
                "confidence": 0.7,
            }
        )

        self.assertIsNone(result["whyItMatters"])
        self.assertIsNone(result["whatNext"])

    def test_rejects_non_string_optional_explanations(self):
        with self.assertRaisesRegex(ValueError, "whyItMatters"):
            validate_ai_result(
                {
                    "summary": "A factual summary of the development.",
                    "keyPoints": [],
                    "whyItMatters": ["Not a string"],
                    "entities": [],
                }
            )


if __name__ == "__main__":
    unittest.main()
