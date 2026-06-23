"""Main application with CLI interface for speech-to-text workflow."""
import argparse
import sys
import os
from speech_to_text import SpeechToText
from language_utils import LanguageUtils
from config import Config


def print_banner():
    """Print application banner."""
    print("\n" + "="*70)
    print(" 🎤  ELEVENLABS SPEECH-TO-TEXT WORKFLOW")
    print(" Powered by ElevenLabs Scribe v2 API")
    print(" Supporting: English | French | Tunisian Dialect | Arabic")
    print("="*70 + "\n")


def interactive_mode(stt_engine: SpeechToText):
    """Run interactive mode with menu."""
    while True:
        print("\n" + "-"*70)
        print("MAIN MENU")
        print("-"*70)
        print("1. Record and transcribe new audio")
        print("2. Transcribe existing audio file")
        print("3. Batch transcribe multiple files")
        print("4. View supported languages")
        print("5. Exit")
        print("-"*70)
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == '1':
            record_and_transcribe(stt_engine)
        elif choice == '2':
            transcribe_file_interactive(stt_engine)
        elif choice == '3':
            batch_transcribe_interactive(stt_engine)
        elif choice == '4':
            show_language_info()
        elif choice == '5':
            print("\n👋 Goodbye!\n")
            break
        else:
            print("\n❌ Invalid option. Please try again.")


def record_and_transcribe(stt_engine: SpeechToText):
    """Record audio and transcribe."""
    print("\n📹 RECORD NEW AUDIO")
    print("-"*70)
    
    # Get duration
    try:
        duration_input = input(f"Recording duration in seconds (default {Config.RECORDING_DURATION}): ").strip()
        duration = int(duration_input) if duration_input else Config.RECORDING_DURATION
    except ValueError:
        print("Invalid input. Using default duration.")
        duration = Config.RECORDING_DURATION
    
    # Get language preference
    language = get_language_choice()
    
    # Record and transcribe
    try:
        result = stt_engine.transcribe_with_prompt(
            record_new=True,
            duration=duration,
            language=language
        )
        
        # Analyze language
        if result['text']:
            lang_stats = LanguageUtils.get_language_stats(result['text'])
            print(f"\n📊 Language Analysis:")
            print(f"   Primary language: {LanguageUtils.get_language_name(lang_stats['primary_language'])}")
            if lang_stats['is_mixed']:
                print(f"   ⚠️  Mixed language detected (code-switching)")
        
        # Ask to save
        save = input("\n💾 Save transcription to file? (y/n): ").strip().lower()
        if save == 'y':
            output_file = stt_engine.save_transcription(result)
            print(f"✅ Saved to: {output_file}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")


def transcribe_file_interactive(stt_engine: SpeechToText):
    """Transcribe existing audio file."""
    print("\n📄 TRANSCRIBE AUDIO FILE")
    print("-"*70)
    
    # Get file path
    file_path = input("Enter audio file path: ").strip()
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return
    
    # Get language preference
    language = get_language_choice()
    
    # Transcribe
    try:
        result = stt_engine.transcribe_with_prompt(
            audio_file=file_path,
            language=language
        )
        
        # Analyze language
        if result['text']:
            lang_stats = LanguageUtils.get_language_stats(result['text'])
            print(f"\n📊 Language Analysis:")
            print(f"   Primary language: {LanguageUtils.get_language_name(lang_stats['primary_language'])}")
            if lang_stats['is_mixed']:
                print(f"   ⚠️  Mixed language detected (code-switching)")
        
        # Ask to save
        save = input("\n💾 Save transcription to file? (y/n): ").strip().lower()
        if save == 'y':
            output_file = stt_engine.save_transcription(result)
            print(f"✅ Saved to: {output_file}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")


def batch_transcribe_interactive(stt_engine: SpeechToText):
    """Batch transcribe multiple files."""
    print("\n📚 BATCH TRANSCRIBE")
    print("-"*70)
    
    # Get files
    print("Enter audio file paths (one per line, empty line to finish):")
    files = []
    while True:
        file_path = input().strip()
        if not file_path:
            break
        if os.path.exists(file_path):
            files.append(file_path)
        else:
            print(f"⚠️  File not found, skipping: {file_path}")
    
    if not files:
        print("❌ No valid files provided.")
        return
    
    # Get language preference
    language = get_language_choice()
    
    # Batch transcribe
    try:
        results = stt_engine.batch_transcribe(files, language=language)
        
        # Display summary
        print("\n" + "="*70)
        print("BATCH TRANSCRIPTION SUMMARY")
        print("="*70)
        
        successful = [r for r in results if r.get('text')]
        failed = [r for r in results if r.get('error')]
        
        print(f"✅ Successful: {len(successful)}/{len(results)}")
        print(f"❌ Failed: {len(failed)}/{len(results)}")
        
        # Save all results
        save = input("\n💾 Save all transcriptions? (y/n): ").strip().lower()
        if save == 'y':
            for result in successful:
                stt_engine.save_transcription(result)
            print(f"✅ Saved {len(successful)} transcriptions to {Config.OUTPUT_DIR}/")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")


def get_language_choice() -> str:
    """Get language choice from user."""
    print("\nSelect language:")
    print("1. Auto-detect (recommended)")
    print("2. English")
    print("3. French")
    print("4. Arabic/Tunisian")
    
    choice = input("Choice (1-4): ").strip()
    
    lang_map = {
        '1': None,  # Auto-detect
        '2': 'en',
        '3': 'fr',
        '4': 'ar'
    }
    
    return lang_map.get(choice, None)


def show_language_info():
    """Display information about supported languages."""
    print("\n" + "="*70)
    print("SUPPORTED LANGUAGES")
    print("="*70)
    
    for code, name in Config.SUPPORTED_LANGUAGES.items():
        print(f"  • {name} ({code})")
    
    print("\n📝 Notes:")
    print("  • Tunisian dialect is supported through Arabic language model")
    print("  • The system can handle code-switching (mixed languages)")
    print("  • Common in Tunisian speech: Arabic + French + local dialect")
    print("  • Auto-detection is recommended for best results")
    print("="*70)


def main():
    """Main application entry point."""
    parser = argparse.ArgumentParser(
        description='Multilingual Speech-to-Text Workflow',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode (recommended)
  python main.py
  
  # Record and transcribe
  python main.py --record --duration 10
  
  # Transcribe existing file
  python main.py --file recording.wav
  
  # Specify language
  python main.py --file audio.wav --language fr
  
  # Disable speaker diarization
  python main.py --record --no-diarize
        """
    )
    
    parser.add_argument(
        '--record',
        action='store_true',
        help='Record new audio'
    )
    
    parser.add_argument(
        '--file',
        type=str,
        help='Audio file to transcribe'
    )
    
    parser.add_argument(
        '--duration',
        type=int,
        default=Config.RECORDING_DURATION,
        help=f'Recording duration in seconds (default: {Config.RECORDING_DURATION})'
    )
    
    parser.add_argument(
        '--language',
        type=str,
        choices=['en', 'fr', 'ar', 'tn'],
        help='Target language (auto-detect if not specified)'
    )
    
    parser.add_argument(
        '--diarize',
        action='store_true',
        default=True,
        help='Enable speaker diarization (identify different speakers)'
    )
    
    parser.add_argument(
        '--no-diarize',
        action='store_false',
        dest='diarize',
        help='Disable speaker diarization'
    )
    
    parser.add_argument(
        '--tag-events',
        action='store_true',
        default=True,
        help='Tag audio events like laughter, applause, etc.'
    )
    
    parser.add_argument(
        '--no-tag-events',
        action='store_false',
        dest='tag_events',
        help='Disable audio event tagging'
    )
    
    parser.add_argument(
        '--batch',
        type=str,
        nargs='+',
        help='Batch transcribe multiple files'
    )
    
    parser.add_argument(
        '--save',
        action='store_true',
        help='Automatically save transcription to file'
    )
    
    parser.add_argument(
        '--interactive',
        action='store_true',
        help='Run in interactive mode'
    )
    
    args = parser.parse_args()
    
    # Print banner
    print_banner()
    
    # Initialize engine
    try:
        print("🔧 Initializing ElevenLabs speech-to-text engine...")
        stt_engine = SpeechToText()
        print("✅ Engine ready!\n")
    except Exception as e:
        print(f"❌ Failed to initialize engine: {e}")
        print("\n💡 Tip: Make sure your ElevenLabs API key is configured in .env")
        print("   Check .env file and verify your API key is valid")
        sys.exit(1)
    
    # Determine mode
    if args.interactive or (not args.record and not args.file and not args.batch):
        # Interactive mode
        interactive_mode(stt_engine)
    
    elif args.batch:
        # Batch mode
        try:
            results = stt_engine.batch_transcribe(args.batch, language=args.language)
            if args.save:
                for result in results:
                    if result.get('text'):
                        stt_engine.save_transcription(result)
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
    
    elif args.record or args.file:
        # Single transcription mode
        try:
            result = stt_engine.transcribe_with_prompt(
                audio_file=args.file,
                duration=args.duration,
                language=args.language,
                record_new=args.record
            )
            
            if args.save and result.get('text'):
                stt_engine.save_transcription(result)
                
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)


if __name__ == '__main__':
    main()
