"""
Example scripts demonstrating various use cases of the speech-to-text workflow.
"""

from speech_to_text import SpeechToText
from language_utils import LanguageUtils
from config import Config


def example_1_record_and_transcribe():
    """Example 1: Simple record and transcribe."""
    print("\n" + "="*70)
    print("EXAMPLE 1: Record and Transcribe")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Record and transcribe
    result = stt.transcribe_with_prompt(
        record_new=True,
        duration=5
    )
    
    # Display result
    print(f"\nTranscribed text: {result['text']}")


def example_2_transcribe_existing_file():
    """Example 2: Transcribe an existing audio file."""
    print("\n" + "="*70)
    print("EXAMPLE 2: Transcribe Existing File")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Transcribe existing file
    audio_file = "path/to/your/audio.wav"  # Replace with actual file
    
    result = stt.transcribe_file(audio_file, language='fr')
    
    print(f"\nTranscribed text: {result['text']}")
    print(f"Language: {result['language']}")
    
    # Save to file
    stt.save_transcription(result)


def example_3_batch_transcription():
    """Example 3: Batch transcribe multiple files."""
    print("\n" + "="*70)
    print("EXAMPLE 3: Batch Transcription")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # List of audio files
    audio_files = [
        "audio1.wav",
        "audio2.mp3",
        "audio3.wav"
    ]
    
    # Batch transcribe
    results = stt.batch_transcribe(audio_files)
    
    # Display all results
    for result in results:
        if result.get('text'):
            print(f"\nFile: {result['file']}")
            print(f"Text: {result['text']}")
            print(f"Language: {result.get('language', 'unknown')}")
            print("-" * 70)


def example_4_language_specific():
    """Example 4: Transcribe with specific language."""
    print("\n" + "="*70)
    print("EXAMPLE 4: Language-Specific Transcription")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Transcribe French audio
    result_fr = stt.transcribe_with_prompt(
        record_new=True,
        duration=5,
        language='fr'
    )
    
    print(f"\nFrench transcription: {result_fr['text']}")


def example_5_tunisian_dialect():
    """Example 5: Handle Tunisian dialect with code-switching."""
    print("\n" + "="*70)
    print("EXAMPLE 5: Tunisian Dialect with Code-Switching")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Record audio (typically contains mixed Arabic, French, and dialect)
    result = stt.transcribe_with_prompt(
        record_new=True,
        duration=10,
        language='ar'  # Use Arabic for Tunisian
    )
    
    # Analyze the transcription
    if result['text']:
        lang_stats = LanguageUtils.get_language_stats(result['text'])
        
        print(f"\nTranscribed text: {result['text']}")
        print(f"\nLanguage Statistics:")
        print(f"  Arabic characters: {lang_stats['arabic_chars']}")
        print(f"  Latin characters: {lang_stats['latin_chars']}")
        print(f"  Mixed language: {lang_stats['is_mixed']}")
        print(f"  Primary language: {LanguageUtils.get_language_name(lang_stats['primary_language'])}")


def example_6_speaker_diarization():
    """Example 6: Use speaker diarization to identify different speakers."""
    print("\n" + "="*70)
    print("EXAMPLE 6: Speaker Diarization")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Transcribe with speaker diarization
    result = stt.transcribe_with_prompt(
        record_new=True,
        duration=10,
        diarize=True
    )
    
    print(f"\nTranscribed text: {result['text']}")
    if result.get('speakers'):
        print(f"Speakers: {result['speakers']}")


def example_7_audio_events():
    """Example 7: Tag audio events like laughter, applause, etc."""
    print("\n" + "="*70)
    print("EXAMPLE 7: Audio Event Tagging")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Record and transcribe with audio event tagging
    result = stt.transcribe_with_prompt(
        record_new=True,
        duration=10,
        tag_audio_events=True
    )
    
    print(f"\nTranscribed text: {result['text']}")
    print(f"Audio events tagged: {result.get('audio_events_tagged')}")


def example_8_custom_recording():
    """Example 8: Custom recording parameters."""
    print("\n" + "="*70)
    print("EXAMPLE 8: Custom Recording Parameters")
    print("="*70)
    
    # Initialize engine
    stt = SpeechToText()
    
    # Record with custom parameters
    audio_file = stt.record_audio(
        duration=15,  # 15 seconds
        sample_rate=22050,  # Custom sample rate
        output_file="recordings/my_custom_recording.wav"
    )
    
    # Transcribe
    result = stt.transcribe_file(audio_file)
    
    print(f"\nAudio file: {audio_file}")
    print(f"Transcribed text: {result['text']}")


def run_all_examples():
    """Run all examples (for demonstration purposes)."""
    examples = [
        ("Record and Transcribe", example_1_record_and_transcribe),
        ("Transcribe Existing File", example_2_transcribe_existing_file),
        ("Batch Transcription", example_3_batch_transcription),
        ("Language-Specific", example_4_language_specific),
        ("Tunisian Dialect", example_5_tunisian_dialect),
        ("Speaker Diarization", example_6_speaker_diarization),
        ("Audio Event Tagging", example_7_audio_events),
        ("Custom Recording", example_8_custom_recording),
    ]
    
    print("\n" + "="*70)
    print("SPEECH-TO-TEXT EXAMPLES")
    print("="*70)
    
    for i, (name, func) in enumerate(examples, 1):
        print(f"\n{i}. {name}")
    
    print("\n" + "="*70)
    choice = input("\nSelect example to run (1-8, or 0 for all): ").strip()
    
    if choice == '0':
        for name, func in examples:
            try:
                func()
                input("\nPress Enter to continue to next example...")
            except Exception as e:
                print(f"Error in {name}: {e}")
                input("\nPress Enter to continue...")
    elif choice.isdigit() and 1 <= int(choice) <= len(examples):
        try:
            examples[int(choice)-1][1]()
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Invalid choice.")


if __name__ == '__main__':
    run_all_examples()
