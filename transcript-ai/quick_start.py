#!/usr/bin/env python3
"""
Quick launcher for speech-to-text workflow with API mode.
This version uses OpenAI API (no local model needed).
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from speech_to_text import SpeechToText
from config import Config

def main():
    """Quick ElevenLabs launcher."""
    print("\n" + "="*70)
    print(" 🎤  ELEVENLABS SPEECH-TO-TEXT")
    print(" Powered by Scribe v2 API")
    print(" Supporting: English | French | Tunisian Dialect | Arabic")
    print("="*70 + "\n")
    
    # Check if ElevenLabs API key is configured
    if not Config.ELEVENLABS_API_KEY:
        print("⚠️  ElevenLabs API key not configured!")
        print("\nPlease check your .env file and ensure your API key is set:")
        print("  ELEVENLABS_API_KEY=your_key_here")
        sys.exit(1)
    
    print("✅ Configuration loaded")
    print(f"   Mode: ElevenLabs Scribe v2")
    print(f"   ElevenLabs Key: Configured")
    
    # Initialize engine
    try:
        print("\n🔧 Initializing ElevenLabs client...")
        stt = SpeechToText()
        print("✅ Ready!\n")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    
    # Simple menu
    while True:
        print("\n" + "-"*70)
        print("QUICK MENU")
        print("-"*70)
        print("1. Record and transcribe (10 seconds)")
        print("2. Transcribe audio file")
        print("3. Exit")
        print("-"*70)
        
        choice = input("\nSelect (1-3): ").strip()
        
        if choice == '1':
            try:
                print("\nRecording 10 seconds...")
                result = stt.transcribe_with_prompt(record_new=True, duration=10)
                
                # Offer to save
                save = input("\n💾 Save transcription? (y/n): ").strip().lower()
                if save == 'y':
                    stt.save_transcription(result)
                    
            except Exception as e:
                print(f"❌ Error: {e}")
        
        elif choice == '2':
            file_path = input("\nEnter audio file path: ").strip()
            if os.path.exists(file_path):
                try:
                    result = stt.transcribe_file(file_path)
                    print("\n" + "="*70)
                    print(f"Text: {result['text']}")
                    print(f"Language: {result['language']}")
                    print("="*70)
                    
                    save = input("\n💾 Save transcription? (y/n): ").strip().lower()
                    if save == 'y':
                        stt.save_transcription(result)
                        
                except Exception as e:
                    print(f"❌ Error: {e}")
            else:
                print(f"❌ File not found: {file_path}")
        
        elif choice == '3':
            print("\n👋 Goodbye!\n")
            break
        else:
            print("❌ Invalid choice")

if __name__ == '__main__':
    main()
