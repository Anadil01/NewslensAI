import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure we can import from the ingestion directory
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Load your backend .env file where GEMINI_API_KEY is stored
env_path = Path(__file__).resolve().parents[2] / "backend" / ".env"
load_dotenv(env_path)

from ai.gemini_provider import GeminiProvider

def main():
    print("Initializing Gemini Provider...")
    
    try:
        provider = GeminiProvider()
    except Exception as e:
        print(f"❌ Failed to initialize provider: {e}")
        return

    article = """
    NVIDIA has announced a definitive agreement to acquire Hugging Face for $13 billion. 
    The acquisition is expected to significantly expand NVIDIA's software ecosystem 
    and provide deep integration between NVIDIA's hardware and open-source AI developers.
    """

    languages_to_test = ["en", "hi", "hinglish"]

    for lang in languages_to_test:
        print(f"\n==============================")
        print(f"🤖 TESTING LANGUAGE: {lang.upper()}")
        print(f"==============================")
        
        try:
            result = provider.generate_summary(article, language=lang)
            
            print(f"✅ SUCCESS!\n")
            print(f"WHAT HAPPENED:\n{result['summary']}\n")
            
            print("KEY POINTS:")
            for point in result['keyPoints']:
                print(f"- {point}")
                
            print(f"\nWHY IT MATTERS:\n{result['whyItMatters']}")
            print(f"\nREADING TIME:\n{result['readingTimeSeconds']} seconds")
            
        except Exception as e:
            print(f"❌ FAILED to generate summary for {lang}: {e}")

if __name__ == "__main__":
    main()