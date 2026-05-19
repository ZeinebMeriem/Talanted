"""Language utilities for handling Tunisian dialect, French, and English."""
from typing import Optional, Dict
import re


class LanguageUtils:
    """Utilities for language detection and handling."""
    
    # Common words/phrases in each language for basic detection
    LANGUAGE_PATTERNS = {
        'tunisian': [
            # Tunisian Arabic specific words
            'برشا', 'ياسر', 'الباهي', 'كيفاش', 'شنوة', 'وين', 
            'mrigla', 'behi', 'fama', 'mouch', 'chnya', 
            'barcha', 'yaser', 'kifech', 'bech', 'chbik'
        ],
        'french': [
            'bonjour', 'merci', 'au revoir', 'oui', 'non', 
            'comment', 'pourquoi', 'quand', 'où', 'qui',
            'je suis', 'tu es', 'il est', 'nous sommes',
            'avec', 'sans', 'très', 'bien', 'mal'
        ],
        'english': [
            'hello', 'thank you', 'goodbye', 'yes', 'no',
            'how', 'why', 'when', 'where', 'who',
            'i am', 'you are', 'he is', 'we are',
            'with', 'without', 'very', 'good', 'bad'
        ],
        'arabic': [
            'مرحبا', 'شكرا', 'وداعا', 'نعم', 'لا',
            'كيف', 'لماذا', 'متى', 'أين', 'من',
            'أنا', 'أنت', 'هو', 'نحن'
        ]
    }
    
    @staticmethod
    def detect_language_simple(text: str) -> str:
        """
        Simple language detection based on common words.
        
        Args:
            text: Text to analyze
            
        Returns:
            Detected language code
        """
        text_lower = text.lower()
        scores = {'tunisian': 0, 'french': 0, 'english': 0, 'arabic': 0}
        
        for lang, patterns in LanguageUtils.LANGUAGE_PATTERNS.items():
            for pattern in patterns:
                if pattern.lower() in text_lower:
                    scores[lang] += 1
        
        # Check for Arabic script
        if re.search(r'[\u0600-\u06FF]', text):
            scores['arabic'] += 5
            scores['tunisian'] += 3  # Tunisian often uses Arabic script
        
        # Check for Latin script with French accents
        if re.search(r'[àâäéèêëïîôùûüÿæœç]', text_lower):
            scores['french'] += 3
        
        # Determine winner
        max_lang = max(scores, key=scores.get)
        
        if scores[max_lang] == 0:
            return 'unknown'
        
        # Map to standard codes
        lang_map = {
            'tunisian': 'tn',
            'french': 'fr',
            'english': 'en',
            'arabic': 'ar'
        }
        
        return lang_map.get(max_lang, 'unknown')
    
    @staticmethod
    def get_language_name(code: str) -> str:
        """Get full language name from code."""
        names = {
            'en': 'English',
            'fr': 'French',
            'ar': 'Arabic',
            'tn': 'Tunisian (Arabic dialect)',
            'unknown': 'Unknown'
        }
        return names.get(code, code)
    
    @staticmethod
    def prepare_text_for_tts(text: str, language: str) -> Dict:
        """
        Prepare text for text-to-speech with appropriate settings.
        
        Args:
            text: Input text
            language: Language code
            
        Returns:
            Dictionary with prepared text and TTS settings
        """
        # Language-specific TTS settings
        settings = {
            'en': {'voice': 'en-US-Neural2-J', 'rate': 1.0},
            'fr': {'voice': 'fr-FR-Neural2-A', 'rate': 1.0},
            'ar': {'voice': 'ar-XA-Standard-A', 'rate': 0.9},
            'tn': {'voice': 'ar-XA-Standard-A', 'rate': 0.9}
        }
        
        return {
            'text': text,
            'language': language,
            'settings': settings.get(language, settings['en'])
        }
    
    @staticmethod
    def is_mixed_language(text: str) -> bool:
        """
        Check if text contains mixed languages (code-switching).
        Common in Tunisian dialect which mixes Arabic, French, and local dialect.
        
        Args:
            text: Text to analyze
            
        Returns:
            True if mixed languages detected
        """
        has_arabic = bool(re.search(r'[\u0600-\u06FF]', text))
        has_latin = bool(re.search(r'[a-zA-Z]', text))
        
        return has_arabic and has_latin
    
    @staticmethod
    def get_language_stats(text: str) -> Dict:
        """
        Get detailed statistics about languages in text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with language statistics
        """
        stats = {
            'total_chars': len(text),
            'arabic_chars': len(re.findall(r'[\u0600-\u06FF]', text)),
            'latin_chars': len(re.findall(r'[a-zA-Z]', text)),
            'numbers': len(re.findall(r'\d', text)),
            'is_mixed': False,
            'primary_language': 'unknown'
        }
        
        # Determine primary language
        if stats['arabic_chars'] > stats['latin_chars']:
            stats['primary_language'] = 'ar'
        elif stats['latin_chars'] > 0:
            stats['primary_language'] = LanguageUtils.detect_language_simple(text)
        
        stats['is_mixed'] = LanguageUtils.is_mixed_language(text)
        
        return stats
