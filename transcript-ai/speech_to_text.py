"""Speech-to-Text module using ElevenLabs Scribe v2 API."""
import os
import time
from datetime import datetime
from typing import Optional, Dict, List
import sounddevice as sd
import soundfile as sf
import numpy as np
from elevenlabs.client import ElevenLabs
from config import Config


class SpeechToText:
    """Speech-to-text engine using ElevenLabs Scribe v2."""
    
    def __init__(self):
        """Initialize ElevenLabs Speech-to-Text client."""
        Config.validate()
        self._setup_client()
    
    def _setup_client(self):
        """Setup ElevenLabs API client."""
        try:
            self.client = ElevenLabs(api_key=Config.ELEVENLABS_API_KEY)
            print("✅ ElevenLabs API client initialized!")
        except Exception as e:
            print(f"❌ Error setting up ElevenLabs client: {e}")
            raise
    
    def record_audio(
        self, 
        duration: int = None, 
        sample_rate: int = None,
        output_file: Optional[str] = None
    ) -> str:
        """
        Record audio from microphone.
        
        Args:
            duration: Recording duration in seconds
            sample_rate: Sample rate in Hz
            output_file: Optional output file path
            
        Returns:
            Path to recorded audio file
        """
        duration = duration or Config.RECORDING_DURATION
        sample_rate = sample_rate or Config.SAMPLE_RATE
        
        print(f"\n🎙️  Recording for {duration} seconds...")
        print("Speak now!")
        
        # Record audio
        recording = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=Config.CHANNELS,
            dtype='float32'
        )
        sd.wait()
        
        print("✅ Recording finished!")
        
        # Generate filename if not provided
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(
                Config.RECORDINGS_DIR, 
                f"recording_{timestamp}.wav"
            )
        
        # Save recording
        sf.write(output_file, recording, sample_rate)
        print(f"💾 Audio saved to: {output_file}")
        
        return output_file
    
    def transcribe_file(
        self, 
        audio_file: str, 
        language: Optional[str] = None,
        diarize: bool = True,
        tag_audio_events: bool = True
    ) -> Dict:
        """
        Transcribe audio file to text using ElevenLabs Scribe v2.
        
        Args:
            audio_file: Path to audio file
            language: Language code (en, fr, ar, eng, fra, ara) or None for auto-detection
            diarize: Whether to identify different speakers
            tag_audio_events: Whether to tag audio events (laughter, applause, etc.)
            
        Returns:
            Dictionary with transcription and metadata
        """
        if not os.path.exists(audio_file):
            raise FileNotFoundError(f"Audio file not found: {audio_file}")
        
        print(f"\n🎤 Transcribing: {audio_file}")
        start_time = time.time()
        
        try:
            # Map language codes to ElevenLabs format (accept both short and long codes)
            lang_map = {
                'en': 'eng',
                'fr': 'fra', 
                'ar': 'ara',
                'tn': 'ara',   # Tunisian uses Arabic
                'eng': 'eng',
                'fra': 'fra',
                'ara': 'ara',
                None: None     # Auto-detect
            }
            language_code = lang_map.get(language, language)  # Pass through if already valid
            
            # Open and transcribe audio file
            with open(audio_file, 'rb') as audio:
                transcription = self.client.speech_to_text.convert(
                    file=audio,
                    model_id="scribe_v2",
                    language_code=language_code,
                    diarize=diarize,
                    tag_audio_events=tag_audio_events
                )
            
            elapsed_time = time.time() - start_time
            
            # Extract text from transcription
            text = transcription.text if hasattr(transcription, 'text') else str(transcription)
            
            result = {
                'text': text.strip(),
                'language': language or 'auto-detected',
                'transcription': transcription,
                'diarize': diarize,
                'audio_events_tagged': tag_audio_events,
                'processing_time': round(elapsed_time, 2),
                'method': 'elevenlabs_scribe_v2'
            }
            
            # Extract language detection confidence
            if hasattr(transcription, 'language_code'):
                result['detected_language'] = transcription.language_code
            if hasattr(transcription, 'language_probability'):
                result['language_confidence'] = round(transcription.language_probability * 100, 1)
            
            # Extract speakers if diarization was enabled
            if diarize and hasattr(transcription, 'speakers'):
                result['speakers'] = transcription.speakers
            
            # Extract word-level information for code-switching analysis
            if hasattr(transcription, 'words') and transcription.words:
                result['word_count'] = len([w for w in transcription.words if w.type == 'word'])
                result['has_word_data'] = True
            
            return result
            
        except Exception as e:
            print(f"❌ Error during transcription: {e}")
            raise
    
    def transcribe_with_prompt(
        self,
        audio_file: str = None,
        duration: int = None,
        language: str = None,
        record_new: bool = False,
        diarize: bool = True,
        tag_audio_events: bool = True
    ) -> Dict:
        """
        Complete workflow: record (optional) and transcribe.
        
        Args:
            audio_file: Existing audio file to transcribe
            duration: Recording duration if recording new audio
            language: Target language
            record_new: Whether to record new audio
            diarize: Whether to identify different speakers
            tag_audio_events: Whether to tag audio events
            
        Returns:
            Transcription result dictionary
        """
        # Record audio if needed
        if record_new or not audio_file:
            audio_file = self.record_audio(duration=duration)
        
        # Transcribe
        result = self.transcribe_file(
            audio_file, 
            language=language,
            diarize=diarize,
            tag_audio_events=tag_audio_events
        )
        
        # Display results
        print("\n" + "="*70)
        print("✨ TRANSCRIPTION RESULTS")
        print("="*70)
        
        # Check if text contains Arabic or mixed languages
        text = result['text']
        has_arabic = any('\u0600' <= c <= '\u06FF' for c in text)
        has_latin = any('a' <= c.lower() <= 'z' for c in text)
        is_mixed = has_arabic and has_latin
        
        if is_mixed:
            print(f"📝 Text (Mixed AR/EN): \n   {text}")
            print(f"\n💡 Code-switching detected! For better English word recognition:")
            print(f"   • Pronounce English words more distinctly")
            print(f"   • Use auto-detection (don't specify --language)")
        elif has_arabic:
            print(f"📝 Text (Arabic): \n   {text}")
        else:
            print(f"📝 Text: {text}")
        
        # Language info
        lang_info = result['language']
        if result.get('detected_language'):
            lang_info = f"{result['detected_language']}"
        if result.get('language_confidence'):
            lang_info += f" ({result['language_confidence']}% confidence)"
        print(f"🌍 Language: {lang_info}")
        
        print(f"⚙️  Method: {result['method']}")
        print(f"⏱️  Processing time: {result['processing_time']}s")
        
        # Word-level stats
        if result.get('word_count'):
            print(f"📊 Words detected: {result['word_count']}")
        
        # Speaker info
        if result.get('speakers'):
            print(f"👥 Speakers identified: {len(result['speakers'])}")
        elif diarize:
            print(f"🎭 Speaker diarization: Enabled")
        
        if tag_audio_events:
            print(f"🎵 Audio events tagged: Yes")
            
        print("="*70)
        
        # Auto-save transcription
        saved_file = self.save_transcription(result)
        
        return result
    
    def batch_transcribe(
        self, 
        audio_files: List[str], 
        language: Optional[str] = None
    ) -> List[Dict]:
        """
        Transcribe multiple audio files.
        
        Args:
            audio_files: List of audio file paths
            language: Optional language code
            
        Returns:
            List of transcription results
        """
        results = []
        
        for i, audio_file in enumerate(audio_files, 1):
            print(f"\n📂 Processing file {i}/{len(audio_files)}: {audio_file}")
            try:
                result = self.transcribe_file(audio_file, language=language)
                result['file'] = audio_file
                results.append(result)
            except Exception as e:
                print(f"❌ Error processing {audio_file}: {e}")
                results.append({
                    'file': audio_file,
                    'error': str(e),
                    'text': None
                })
        
        return results
    
    def save_transcription(
        self, 
        result: Dict, 
        output_file: Optional[str] = None,
        auto_save: bool = True
    ) -> str:
        """
        Save transcription to file with proper formatting for Arabic/RTL text.
        
        Args:
            result: Transcription result dictionary
            output_file: Output file path
            auto_save: Whether to auto-save after transcription
            
        Returns:
            Path to saved file
        """
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            # Detect if Arabic text for better filename
            text_sample = result.get('text', '')[:50]
            has_arabic = any('\u0600' <= c <= '\u06FF' for c in text_sample)
            lang_hint = '_arabic' if has_arabic else ''
            output_file = os.path.join(
                Config.OUTPUT_DIR, 
                f"transcription{lang_hint}_{timestamp}.txt"
            )
        
        # Detect if text contains Arabic/RTL characters
        text = result.get('text', '')
        has_rtl = any('\u0600' <= c <= '\u06FF' for c in text)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            # Write UTF-8 BOM for better compatibility with Arabic text
            if has_rtl:
                f.write('\ufeff')  # UTF-8 BOM
            
            f.write(f"ElevenLabs Scribe v2 Transcription\n")
            f.write(f"{'='*70}\n")
            f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Language: {result.get('language', 'unknown')}\n")
            f.write(f"Method: {result.get('method', 'elevenlabs_scribe_v2')}\n")
            f.write(f"Processing time: {result.get('processing_time', 'N/A')}s\n")
            f.write(f"Speaker diarization: {result.get('diarize', False)}\n")
            f.write(f"Audio events tagged: {result.get('audio_events_tagged', False)}\n")
            
            if has_rtl:
                f.write(f"Text direction: Right-to-Left (RTL)\n")
                f.write(f"Script: Arabic\n")
            
            # Language confidence
            if result.get('detected_language'):
                f.write(f"Detected language: {result.get('detected_language')}\n")
            if result.get('language_confidence'):
                f.write(f"Language confidence: {result.get('language_confidence')}%\n")
            
            # Code-switching info
            has_latin = any('a' <= c.lower() <= 'z' for c in text)
            if has_rtl and has_latin:
                f.write(f"Code-switching: Mixed Arabic + English detected\n")
            
            if result.get('word_count'):
                f.write(f"Word count: {result.get('word_count')}\n")
            
            f.write(f"{'='*70}\n\n")
            
            # Write transcription text
            if has_rtl:
                f.write("TRANSCRIPTION (Arabic/RTL):\n")
                f.write("-" * 70 + "\n")
            
            f.write(result['text'])
            f.write("\n")
            
            # Add speaker information if available
            if result.get('speakers'):
                f.write("\n" + "="*70)
                f.write("\n👥 Speakers Identified\n")
                f.write("="*70 + "\n")
                for i, speaker in enumerate(result['speakers'], 1):
                    f.write(f"\nSpeaker {i}: {speaker}\n")
            
            # Add audio file info if available
            if result.get('file'):
                f.write(f"\n{'='*70}\n")
                f.write(f"Source audio: {result['file']}\n")
        
        print(f"\n💾 Transcription saved to: {output_file}")
        
        # Show file location clearly
        abs_path = os.path.abspath(output_file)
        print(f"📂 Full path: {abs_path}")
        
        if has_rtl:
            print(f"✨ Arabic text detected - saved with RTL formatting")
        
        return output_file
