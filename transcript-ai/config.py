"""Configuration module for speech-to-text workflow."""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Configuration class for API keys and settings."""
    
    # API Keys
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    
    # Language Configuration
    SUPPORTED_LANGUAGES = {
        'en': 'English',
        'fr': 'French',
        'ar': 'Arabic',  # For Tunisian dialect
        'tn': 'Tunisian'  # Tunisian dialect (treated as Arabic variant)
    }
    
    # ElevenLabs Language Codes
    ELEVENLABS_LANG_MAP = {
        'en': 'eng',
        'fr': 'fra',
        'ar': 'ara',
        'tn': 'ara'  # Tunisian uses Arabic
    }
    
    DEFAULT_LANGUAGE = os.getenv('DEFAULT_LANGUAGE', 'en')
    
    # Audio Configuration
    SAMPLE_RATE = 16000  # Hz
    CHANNELS = 1  # Mono
    RECORDING_DURATION = 5  # seconds (default)
    
    # ElevenLabs Model Configuration
    SCRIBE_MODEL = 'scribe_v2'  # ElevenLabs Scribe v2 model
    
    # Output Configuration
    OUTPUT_DIR = 'outputs'
    RECORDINGS_DIR = 'recordings'
    
    @classmethod
    def validate(cls):
        """Validate that required configuration is present."""
        if not cls.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY not found in environment variables")
        
        # Create necessary directories
        os.makedirs(cls.OUTPUT_DIR, exist_ok=True)
        os.makedirs(cls.RECORDINGS_DIR, exist_ok=True)
        
        return True
