"""Flask API server with WebSocket support for real-time streaming transcription."""
import os
import sys
import threading
import time
import queue
import collections
import json
from datetime import datetime
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sounddevice as sd
import soundfile as sf
import numpy as np
from speech_to_text import SpeechToText
from config import Config

# Pipeline imports
from pipeline.pipeline_config import PipelineConfig
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.diagram_chat import DiagramChat
from pipeline.requirements_spec_chat import RequirementsSpecChat
from pipeline.specification_generator import SpecificationGenerator

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Enable CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Initialize SocketIO with CORS support and async mode
socketio = SocketIO(
    app, 
    cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    async_mode='threading',
    logger=False,
    engineio_logger=False,
    ping_timeout=120,
    ping_interval=15,
    max_http_buffer_size=10 * 1024 * 1024  # 10MB
)

# Global recording state
recording_state = {
    'is_recording': False,
    'audio_data': [],
    'all_audio_chunks': [],
    'sample_rate': Config.SAMPLE_RATE,
    'start_time': None,
    'stream': None,
    'chunk_queue': queue.Queue(),
    'processing_thread': None,
    'full_transcription': "",
    'detected_language': None,
    'language_votes': collections.Counter(),
    'chunk_count': 0,
    'overlap_buffer': None,  # Overlap from previous chunk for context
    'selected_language': None,  # User-selected language hint
    'segments': []  # Speaker-labeled text segments
}

stt = SpeechToText()

# Lazy-init pipeline (heavy — only when first needed)
_pipeline = None

def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = PipelineOrchestrator()
    return _pipeline

# Diagram chat sessions (keyed by socket session ID)
diagram_chat_sessions = {}

# Requirements spec chat sessions (keyed by socket session ID)
requirements_spec_sessions = {}


def run_pipeline_for_transcript(transcript_text, sid):
    """Run the AI pipeline in a background thread and emit progress via WebSocket."""
    try:
        pipeline = _get_pipeline()

        # Step 1 — Ingest
        socketio.emit('pipeline_progress', {
            'step': 1, 'total': 9, 'label': 'Indexing transcript into vector store...'
        }, to=sid)
        pipeline.rag.ingest_text(transcript_text, source='live_recording')

        # Step 2 — Requirements
        socketio.emit('pipeline_progress', {
            'step': 2, 'total': 9, 'label': 'Extracting requirements (Qwen + RAG)...'
        }, to=sid)
        req_result = pipeline.analyse_only(transcript_text, task='requirements')

        # Step 3 — Summary
        socketio.emit('pipeline_progress', {
            'step': 3, 'total': 9, 'label': 'Generating meeting summary...'
        }, to=sid)
        sum_result = pipeline.analyse_only(transcript_text, task='summary')

        # Step 4 — Ambiguity Detection
        socketio.emit('pipeline_progress', {
            'step': 4, 'total': 9, 'label': 'Detecting ambiguities & warnings...'
        }, to=sid)
        amb_result = pipeline.analyse_only(transcript_text, task='ambiguity_detection')

        # Step 5 — Clarification Questions
        socketio.emit('pipeline_progress', {
            'step': 5, 'total': 9, 'label': 'Generating clarification questions...'
        }, to=sid)
        cq_result = pipeline.analyse_only(transcript_text, task='clarification_questions')

        # Step 6 — Consultant Guidance
        socketio.emit('pipeline_progress', {
            'step': 6, 'total': 9, 'label': 'Generating consultant guidance...'
        }, to=sid)
        cg_result = pipeline.analyse_only(transcript_text, task='consultant_guidance')

        # Step 7 — System Architecture Conception
        socketio.emit('pipeline_progress', {
            'step': 7, 'total': 9, 'label': 'Generating system architecture conception...'
        }, to=sid)
        arch_result = pipeline.analyse_only(transcript_text, task='system_architecture')

        # Step 8 — Diagram
        socketio.emit('pipeline_progress', {
            'step': 8, 'total': 9, 'label': 'Generating system diagram...'
        }, to=sid)
        diag_result = pipeline.analyse_only(transcript_text, task='diagram')
        diagram_path = None
        mermaid_code = diag_result.get('analysis', {}).get('mermaid_code', '')
        if mermaid_code:
            try:
                render = pipeline.diagrammer.render(mermaid_code)
                diagram_path = render.get('image_file')
            except Exception as e:
                print(f'⚠️  Diagram render failed: {e}')

        # Step 9 — PDF report
        socketio.emit('pipeline_progress', {
            'step': 9, 'total': 9, 'label': 'Generating PDF report...'
        }, to=sid)
        combined = {}
        combined.update(req_result.get('analysis', {}))
        combined.update(sum_result.get('analysis', {}))
        if mermaid_code:
            combined['mermaid_code'] = mermaid_code

        # Add ambiguity data
        amb_data = amb_result.get('analysis', {})
        combined['ambiguities'] = amb_data.get('ambiguities', [])
        combined['warnings'] = amb_data.get('warnings', [])
        combined['completeness_score'] = amb_data.get('completeness_score', None)
        combined['severity_summary'] = amb_data.get('severity_summary', {})
        combined['overall_assessment'] = amb_data.get('overall_assessment', '')

        # Add clarification questions data
        cq_data = cq_result.get('analysis', {})
        combined['clarification_questions'] = cq_data.get('questions', [])
        combined['recommended_meeting_agenda'] = cq_data.get('recommended_meeting_agenda', [])

        # Add consultant guidance data
        cg_data = cg_result.get('analysis', {})
        combined['client_intent_summary'] = cg_data.get('client_intent_summary', '')
        combined['key_insights'] = cg_data.get('key_insights', [])
        combined['inconsistencies'] = cg_data.get('inconsistencies', [])
        combined['hidden_requirements'] = cg_data.get('hidden_requirements', [])
        combined['risk_areas'] = cg_data.get('risk_areas', [])
        combined['recommended_next_steps'] = cg_data.get('recommended_next_steps', [])
        combined['stakeholder_analysis'] = cg_data.get('stakeholder_analysis', [])
        combined['technology_stack_recommendation'] = cg_data.get('technology_stack_recommendation', {})

        # Add system architecture data
        arch_data_combined = arch_result.get('analysis', {})
        combined['system_architecture'] = arch_data_combined

        all_sources = set()
        total_time = 0
        for r in [req_result, sum_result, diag_result, amb_result, cq_result, cg_result, arch_result]:
            all_sources.update(r.get('context_sources', []))
            total_time += r.get('processing_time', 0)

        report_data = {
            'analysis': combined,
            'context_sources': list(all_sources),
            'context_chunks_used': req_result.get('context_chunks_used', 0),
            'processing_time': round(total_time, 2),
        }

        pdf_path = pipeline.reporter.generate(
            analysis=report_data,
            task='requirements',
            transcript_text=transcript_text,
            diagram_path=diagram_path,
        )

        # Emit final results with all analysis sections
        socketio.emit('pipeline_completed', {
            'requirements': req_result.get('analysis', {}),
            'summary': sum_result.get('analysis', {}),
            'diagram': diag_result.get('analysis', {}),
            'ambiguity_detection': amb_data,
            'clarification_questions': cq_data,
            'consultant_guidance': cg_data,
            'system_architecture': arch_data_combined,
            'pdf_report': os.path.basename(pdf_path) if pdf_path else None,
            'diagram_file': os.path.basename(diagram_path) if diagram_path else None,
            'mermaid_code': mermaid_code,
            'processing_time': round(total_time, 2),
        }, to=sid)
        print(f'✅ Pipeline completed for session {sid} in {total_time:.1f}s')

    except Exception as e:
        print(f'❌ Pipeline error: {e}')
        import traceback
        traceback.print_exc()
        socketio.emit('pipeline_error', {'message': str(e)}, to=sid)


# Streaming configuration — optimized for speed
CHUNK_DURATION = 3  # 3s chunks for speaker diarization quality
CHUNK_SAMPLES = int(Config.SAMPLE_RATE * CHUNK_DURATION)
OVERLAP_DURATION = 0.3  # 300ms overlap for better word boundaries
OVERLAP_SAMPLES = int(Config.SAMPLE_RATE * OVERLAP_DURATION)
SILENCE_THRESHOLD = 0.008  # RMS threshold for voice activity
MIN_VOICE_RATIO = 0.05  # Minimum ratio of voiced frames in chunk


def audio_callback(indata, frames, time_info, status):
    """Callback for audio stream - collects audio data with minimal overhead."""
    if recording_state['is_recording']:
        chunk = indata.copy()
        recording_state['audio_data'].append(chunk)
        recording_state['all_audio_chunks'].append(chunk)


def has_voice_activity(audio_data, threshold=SILENCE_THRESHOLD):
    """Simple VAD: check if audio chunk contains speech above threshold."""
    if len(audio_data) == 0:
        return False
    rms = np.sqrt(np.mean(audio_data ** 2))
    # Also check percentage of frames above threshold
    voiced_frames = np.sum(np.abs(audio_data) > threshold)
    voice_ratio = voiced_frames / len(audio_data)
    return rms > threshold and voice_ratio > MIN_VOICE_RATIO


def clean_transcription_text(text):
    """Post-process transcription to remove common hallucination artifacts."""
    if not text:
        return text
    import re
    # Remove common ASR hallucinations on short/silent audio
    hallucination_patterns = [
        r'^\s*Thank you\.?\s*$',
        r'^\s*Thanks for watching\.?\s*$',
        r'^\s*Please subscribe\.?\s*$',
        r'^\s*Bye\.?\s*$',
        r'^\s*you$',
        r'^\s*\.+\s*$',
        r'^\s*,+\s*$',
        r'^\s*\.\.\.$',
        r'^\s*Sous-titres\s*$',
        r'^\s*Subtitles\s*$',
        r'^\s*MBC\s*$',
        r'^\s*Amara\.org\s*$',
    ]
    for pattern in hallucination_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return ''
    
    # Remove repeated single characters/words (stuttering artifacts)
    text = re.sub(r'\b(\w{1,2})\s+\1\b', r'\1', text)
    
    return text.strip()


def extract_speaker_segments(transcription_obj):
    """Extract speaker-labeled text segments from ElevenLabs transcription."""
    segments = []
    if not hasattr(transcription_obj, 'words') or not transcription_obj.words:
        if hasattr(transcription_obj, 'text') and transcription_obj.text:
            text = clean_transcription_text(transcription_obj.text.strip())
            if text:
                segments.append({'speaker': 'speaker_0', 'text': text})
        return segments

    current_speaker = None
    current_words = []

    for word in transcription_obj.words:
        word_type = getattr(word, 'type', 'word')
        if word_type != 'word':
            continue

        speaker = getattr(word, 'speaker_id', None) or getattr(word, 'speaker', None) or 'speaker_0'
        word_text = getattr(word, 'text', '')

        if speaker != current_speaker:
            if current_words:
                joined = ' '.join(current_words).strip()
                cleaned = clean_transcription_text(joined)
                if cleaned:
                    segments.append({'speaker': str(current_speaker), 'text': cleaned})
            current_speaker = speaker
            current_words = [word_text]
        else:
            current_words.append(word_text)

    if current_words:
        joined = ' '.join(current_words).strip()
        cleaned = clean_transcription_text(joined)
        if cleaned:
            segments.append({'speaker': str(current_speaker), 'text': cleaned})

    return segments


def get_effective_language():
    """Determine the best language to use for transcription based on accumulated votes."""
    # If user explicitly selected a language, always use it
    if recording_state['selected_language']:
        return recording_state['selected_language']
    
    # For first few chunks, use auto-detect
    if recording_state['chunk_count'] < 2:
        return None
    
    # After accumulating votes, use the most common detected language
    if recording_state['language_votes']:
        most_common = recording_state['language_votes'].most_common(1)[0]
        # Only lock in if we have strong consensus (>60% of votes)
        total_votes = sum(recording_state['language_votes'].values())
        if most_common[1] / total_votes > 0.6:
            return most_common[0]
    
    return None


def process_audio_chunks():
    """Background thread to process audio chunks and emit transcriptions."""
    print("🔄 Chunk processing thread started")
    
    while recording_state['is_recording']:
        try:
            if len(recording_state['audio_data']) > 0:
                total_samples = sum(chunk.shape[0] for chunk in recording_state['audio_data'])
                
                if total_samples >= CHUNK_SAMPLES:
                    # Concatenate collected audio
                    audio_chunk = np.concatenate(recording_state['audio_data'], axis=0)
                    recording_state['audio_data'] = []
                    
                    # Prepend overlap from previous chunk for better word boundaries
                    if recording_state['overlap_buffer'] is not None:
                        audio_with_context = np.concatenate([
                            recording_state['overlap_buffer'],
                            audio_chunk
                        ], axis=0)
                    else:
                        audio_with_context = audio_chunk
                    
                    # Save overlap for next chunk
                    if len(audio_chunk) > OVERLAP_SAMPLES:
                        recording_state['overlap_buffer'] = audio_chunk[-OVERLAP_SAMPLES:]
                    
                    # Voice activity detection — skip silent chunks
                    if not has_voice_activity(audio_chunk):
                        # Emit a keepalive so UI knows we're still listening
                        socketio.emit('chunk_status', {
                            'status': 'silence',
                            'timestamp': time.time()
                        })
                        continue
                    
                    # Save temporary chunk file
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                    temp_file = os.path.join(
                        Config.RECORDINGS_DIR,
                        f"temp_chunk_{timestamp}.wav"
                    )
                    
                    try:
                        sf.write(temp_file, audio_with_context, recording_state['sample_rate'])
                        
                        # Determine language with voting system
                        effective_lang = get_effective_language()
                        
                        # Map internal codes to ElevenLabs codes for the hint
                        lang_hint = None
                        if effective_lang:
                            lang_map = {'eng': 'eng', 'fra': 'fra', 'ara': 'ara',
                                        'en': 'eng', 'fr': 'fra', 'ar': 'ara', 'tn': 'ara'}
                            lang_hint = lang_map.get(effective_lang, effective_lang)
                        
                        recording_state['chunk_count'] += 1
                        chunk_num = recording_state['chunk_count']
                        
                        print(f"📝 Chunk #{chunk_num} ({len(audio_with_context)/Config.SAMPLE_RATE:.1f}s, lang={lang_hint or 'auto'})")
                        
                        result = stt.transcribe_file(
                            temp_file,
                            language=lang_hint,
                            diarize=True,  # Enable for speaker identification
                            tag_audio_events=False  # Disable for speed
                        )
                        
                        if result and result.get('text'):
                            chunk_text = clean_transcription_text(result['text'].strip())
                            detected_lang = result.get('detected_language', 'unknown')
                            
                            # Record language vote
                            if detected_lang and detected_lang != 'unknown':
                                recording_state['language_votes'][detected_lang] += 1
                                recording_state['detected_language'] = detected_lang
                            
                            # Extract speaker segments from this chunk
                            raw_transcription = result.get('transcription')
                            chunk_segments = extract_speaker_segments(raw_transcription) if raw_transcription else []
                            if not chunk_segments and chunk_text:
                                chunk_segments = [{'speaker': 'speaker_0', 'text': chunk_text}]
                            
                            if chunk_text:
                                recording_state['full_transcription'] += chunk_text + " "
                                recording_state['segments'].extend(chunk_segments)
                                
                                # Get language confidence if available
                                lang_confidence = result.get('language_confidence', None)
                                
                                socketio.emit('transcription_update', {
                                    'chunk': chunk_text,
                                    'full_text': recording_state['full_transcription'].strip(),
                                    'segments': recording_state['segments'],
                                    'language': detected_lang,
                                    'language_confidence': lang_confidence,
                                    'chunk_number': chunk_num,
                                    'timestamp': time.time()
                                })
                                
                                print(f"✅ Chunk #{chunk_num} ({len(chunk_segments)} segments): {chunk_text[:60]}...")
                        
                        # Clean up temp file immediately
                        os.unlink(temp_file)
                            
                    except Exception as e:
                        print(f"❌ Error processing chunk #{recording_state['chunk_count']}: {e}")
                        try:
                            os.unlink(temp_file)
                        except OSError:
                            pass
            
            time.sleep(0.02)  # 20ms polling — fast response
            
        except Exception as e:
            print(f"❌ Error in processing thread: {e}")
            time.sleep(0.2)
    
    print("🛑 Chunk processing thread stopped")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'message': 'ElevenLabs Streaming Transcription API is running'
    })


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    print(f"🔌 Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to transcription server'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    sid = request.sid
    print(f"🔌 Client disconnected: {sid}")
    # Clean up diagram chat session if exists
    if sid in diagram_chat_sessions:
        del diagram_chat_sessions[sid]
        print(f"🗑️  Cleaned up diagram chat session for {sid}")
    # Clean up requirements spec session if exists
    if sid in requirements_spec_sessions:
        del requirements_spec_sessions[sid]
        print(f"🗑️  Cleaned up requirements spec session for {sid}")


@socketio.on('start_recording')
def handle_start_recording(data=None):
    """Start streaming audio recording."""
    global recording_state
    
    if recording_state['is_recording']:
        emit('error', {'message': 'Recording already in progress'})
        return
    
    try:
        # Parse optional language hint from client
        selected_lang = None
        if data and isinstance(data, dict):
            selected_lang = data.get('language', None)
        
        # Reset recording state
        recording_state['audio_data'] = []
        recording_state['all_audio_chunks'] = []
        recording_state['full_transcription'] = ""
        recording_state['is_recording'] = True
        recording_state['start_time'] = time.time()
        recording_state['detected_language'] = None
        recording_state['language_votes'] = collections.Counter()
        recording_state['chunk_count'] = 0
        recording_state['overlap_buffer'] = None
        recording_state['selected_language'] = selected_lang
        recording_state['segments'] = []
        
        # Start audio stream with optimized buffer size
        recording_state['stream'] = sd.InputStream(
            samplerate=recording_state['sample_rate'],
            channels=Config.CHANNELS,
            dtype='float32',
            blocksize=1024,  # Smaller blocks for lower latency
            callback=audio_callback
        )
        recording_state['stream'].start()
        
        # Start processing thread
        recording_state['processing_thread'] = threading.Thread(
            target=process_audio_chunks,
            daemon=True
        )
        recording_state['processing_thread'].start()
        
        print(f"🎙️  Streaming recording started! (lang hint: {selected_lang or 'auto'})")
        emit('recording_started', {'status': 'recording'})
        
    except Exception as e:
        recording_state['is_recording'] = False
        emit('error', {'message': f'Failed to start recording: {str(e)}'})


@socketio.on('stop_recording')
def handle_stop_recording():
    """Stop recording and finalize transcription."""
    global recording_state
    
    if not recording_state['is_recording']:
        emit('error', {'message': 'No recording in progress'})
        return
    
    try:
        # Stop recording
        recording_state['is_recording'] = False
        
        if recording_state['stream']:
            recording_state['stream'].stop()
            recording_state['stream'].close()
            recording_state['stream'] = None
        
        elapsed_time = time.time() - recording_state['start_time']
        print(f"✅ Recording stopped! Duration: {elapsed_time:.1f}s")
        
        # Process any remaining audio chunks
        if len(recording_state['audio_data']) > 0:
            print("🔄 Processing final audio chunk...")
            try:
                audio_chunk = np.concatenate(recording_state['audio_data'], axis=0)
                recording_state['audio_data'] = []
                
                # Only process final chunk if it has speech
                if has_voice_activity(audio_chunk):
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                    temp_file = os.path.join(Config.RECORDINGS_DIR, f"temp_chunk_final_{timestamp}.wav")
                    sf.write(temp_file, audio_chunk, recording_state['sample_rate'])
                    
                    effective_lang = get_effective_language()
                    result = stt.transcribe_file(
                        temp_file, language=effective_lang,
                        diarize=False, tag_audio_events=False
                    )
                    if result and result.get('text'):
                        chunk_text = clean_transcription_text(result['text'].strip())
                        if chunk_text:
                            recording_state['full_transcription'] += chunk_text + " "
                            print(f"✅ Final chunk: {chunk_text[:50]}...")
                    
                    try:
                        os.unlink(temp_file)
                    except OSError:
                        pass
            except Exception as e:
                print(f"❌ Error processing final chunk: {e}")
        
        # Wait for processing thread to finish
        if recording_state['processing_thread']:
            recording_state['processing_thread'].join(timeout=3.0)
        
        # Save complete audio file
        if recording_state['all_audio_chunks']:
            audio_data = np.concatenate(recording_state['all_audio_chunks'], axis=0)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            audio_file = os.path.join(
                Config.RECORDINGS_DIR,
                f"recording_stream_{timestamp}.wav"
            )
            sf.write(audio_file, audio_data, recording_state['sample_rate'])
            print(f"💾 Complete audio saved: {audio_file}")
            
            # Re-transcribe full audio with diarization for consistent speaker IDs
            try:
                print("🔄 Re-transcribing full audio with speaker diarization...")
                effective_lang = get_effective_language()
                full_result = stt.transcribe_file(
                    audio_file,
                    language=effective_lang,
                    diarize=True,
                    tag_audio_events=False
                )
                if full_result and full_result.get('text'):
                    final_text = clean_transcription_text(full_result['text'].strip())
                    raw_transcription = full_result.get('transcription')
                    final_segments = extract_speaker_segments(raw_transcription) if raw_transcription else []
                    
                    if final_text:
                        recording_state['full_transcription'] = final_text
                    if final_segments:
                        recording_state['segments'] = final_segments
                    
                    print(f"✅ Final diarization complete: {len(final_segments)} segments")
            except Exception as e:
                print(f"⚠️ Final diarization failed, using streaming segments: {e}")
            
            # Save transcription
            if recording_state['full_transcription']:
                transcription_file = os.path.join(
                    Config.OUTPUT_DIR,
                    f"transcription_stream_{timestamp}.txt"
                )
                with open(transcription_file, 'w', encoding='utf-8') as f:
                    f.write(recording_state['full_transcription'])
                print(f"💾 Transcription saved: {transcription_file}")
        
        # Determine final detected language
        final_lang = recording_state.get('detected_language', 'unknown')
        if recording_state['language_votes']:
            final_lang = recording_state['language_votes'].most_common(1)[0][0]
        
        final_text = recording_state['full_transcription'].strip()

        emit('recording_completed', {
            'status': 'completed',
            'full_transcription': final_text,
            'segments': recording_state['segments'],
            'duration': round(elapsed_time, 1),
            'word_count': len(final_text.split()),
            'detected_language': final_lang,
            'chunks_processed': recording_state['chunk_count']
        })

        # Kick off the AI pipeline in background
        if final_text and len(final_text.split()) >= 3:
            client_sid = request.sid
            threading.Thread(
                target=run_pipeline_for_transcript,
                args=(final_text, client_sid),
                daemon=True,
            ).start()
            emit('pipeline_started', {'message': 'AI analysis pipeline started...'})
        
    except Exception as e:
        recording_state['is_recording'] = False
        print(f"❌ Error: {e}")
        emit('error', {'message': f'Failed to stop recording: {str(e)}'})


@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current recording status."""
    return jsonify({
        'is_recording': recording_state['is_recording'],
        'duration': time.time() - recording_state['start_time'] if recording_state['start_time'] else 0,
        'transcription': recording_state['full_transcription']
    })


@app.route('/api/reports/<filename>', methods=['GET'])
def download_report(filename):
    """Download a generated report or diagram file."""
    for d in [PipelineConfig.REPORTS_DIR, PipelineConfig.DIAGRAMS_DIR]:
        fpath = os.path.join(d, filename)
        if os.path.exists(fpath):
            return send_file(fpath, as_attachment=True)
    return jsonify({'error': 'File not found'}), 404


@socketio.on('run_pipeline')
def handle_run_pipeline(data=None):
    """Manually trigger pipeline on provided text."""
    text = ''
    if data and isinstance(data, dict):
        text = data.get('text', '')
    if not text:
        text = recording_state.get('full_transcription', '').strip()
    if not text or len(text.split()) < 3:
        emit('pipeline_error', {'message': 'No transcript text to analyse'})
        return
    client_sid = request.sid
    threading.Thread(
        target=run_pipeline_for_transcript,
        args=(text, client_sid),
        daemon=True,
    ).start()
    emit('pipeline_started', {'message': 'AI analysis pipeline started...'})


# ── Diagram Chat WebSocket Endpoints ──────────────────────────────────────────

@socketio.on('start_diagram_chat')
def handle_start_diagram_chat(data):
    """Initialize a diagram chat session with report context.
    
    Expected data: { report_content: str }
    Emits: diagram_chat_started, diagram_chat_message, diagram_mermaid_update
    """
    try:
        if not data or 'report_content' not in data:
            emit('diagram_chat_error', {'message': 'Missing report_content'})
            return
        
        report_content = data['report_content']
        if not report_content or len(report_content.strip()) < 10:
            emit('diagram_chat_error', {'message': 'Report content too short'})
            return
        
        # Capture sid before spawning thread (request context not available in threads)
        sid = request.sid

        # Create new chat session
        chat = DiagramChat()
        diagram_chat_sessions[sid] = chat
        
        print(f"🎨 Starting diagram chat for session {sid}")
        emit('diagram_chat_started', {'session_id': sid})
        
        # Get initial diagram from AI in background thread
        def get_initial_diagram():
            try:
                # Build system prompt with report context
                system_prompt = f"""
You are a software architecture diagram assistant. You help the user design 
and refine Mermaid diagrams based on a requirements analysis report.

You have already analysed the following report:

---
{report_content}
---

RULES:
1. When showing a diagram, ALWAYS wrap the Mermaid code in a ```mermaid code block.
2. After the code block, give a SHORT explanation of what the diagram shows.
3. When the user asks for modifications, produce the COMPLETE updated diagram 
   (do not show partial diffs).
4. Use clear, descriptive node labels — no single-character labels.
5. Use flowchart TD (top-down) by default unless the user asks otherwise.
6. Keep diagrams readable: avoid more than 15-20 nodes, use subgraphs for grouping.

Start by proposing an initial architecture diagram based on the report above.
"""
                chat.messages = [{'role': 'system', 'content': system_prompt}]
                
                initial_msg = (
                    "Based on the report above, propose an architecture diagram. "
                    "Show the Mermaid code and explain it briefly."
                )
                response = chat._chat(initial_msg)
                
                # Emit the AI's response
                socketio.emit('diagram_chat_message', {
                    'role': 'assistant',
                    'content': response,
                    'timestamp': time.time()
                }, to=sid)
                
                # If Mermaid code was extracted, emit it separately
                if chat.latest_mermaid:
                    socketio.emit('diagram_mermaid_update', {
                        'mermaid_code': chat.latest_mermaid,
                        'timestamp': time.time()
                    }, to=sid)
                
            except Exception as e:
                print(f"❌ Error getting initial diagram: {e}")
                socketio.emit('diagram_chat_error', {
                    'message': f'Failed to generate initial diagram: {str(e)}'
                }, to=sid)
        
        threading.Thread(target=get_initial_diagram, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error starting diagram chat: {e}")
        emit('diagram_chat_error', {'message': str(e)})


@socketio.on('send_diagram_message')
def handle_send_diagram_message(data):
    """Send a message to the diagram chat AI.
    
    Expected data: { message: str }
    Emits: diagram_chat_message, diagram_mermaid_update
    """
    try:
        # Capture sid before spawning thread
        sid = request.sid

        if sid not in diagram_chat_sessions:
            emit('diagram_chat_error', {'message': 'No active chat session. Start chat first.'})
            return
        
        if not data or 'message' not in data:
            emit('diagram_chat_error', {'message': 'Missing message'})
            return
        
        user_message = data['message'].strip()
        if not user_message:
            emit('diagram_chat_error', {'message': 'Empty message'})
            return
        
        chat = diagram_chat_sessions[sid]
        
        # Acknowledge receipt (don't echo user message — frontend already shows it)
        emit('diagram_chat_ack', {'status': 'received'})
        
        # Get AI response in background
        def get_ai_response():
            try:
                response = chat._chat(user_message)
                
                socketio.emit('diagram_chat_message', {
                    'role': 'assistant',
                    'content': response,
                    'timestamp': time.time()
                }, to=sid)
                
                # If Mermaid code was extracted, emit it
                if chat.latest_mermaid:
                    socketio.emit('diagram_mermaid_update', {
                        'mermaid_code': chat.latest_mermaid,
                        'timestamp': time.time()
                    }, to=sid)
                    
            except Exception as e:
                print(f"❌ Error in diagram chat: {e}")
                socketio.emit('diagram_chat_error', {
                    'message': f'AI error: {str(e)}'
                }, to=sid)
        
        threading.Thread(target=get_ai_response, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error sending diagram message: {e}")
        emit('diagram_chat_error', {'message': str(e)})


@socketio.on('render_diagram')
def handle_render_diagram(data=None):
    """Render the current diagram to an image file.
    
    Expected data: { format: 'png' | 'svg' } (optional, default 'png')
    Emits: diagram_rendered
    """
    try:
        # Capture sid before spawning thread
        sid = request.sid

        if sid not in diagram_chat_sessions:
            emit('diagram_chat_error', {'message': 'No active chat session'})
            return
        
        chat = diagram_chat_sessions[sid]
        
        if not chat.latest_mermaid:
            emit('diagram_chat_error', {'message': 'No diagram to render yet'})
            return
        
        fmt = 'png'
        if data and isinstance(data, dict):
            fmt = data.get('format', 'png')
        
        print(f"🖼️  Rendering diagram for session {sid} (format: {fmt})")
        
        # Render in background
        def render():
            try:
                img_path = chat._render_diagram()
                if img_path:
                    # Return just the filename for the /api/reports/<filename> endpoint
                    filename = os.path.basename(img_path)
                    socketio.emit('diagram_rendered', {
                        'image_url': f'/api/reports/{filename}',
                        'image_path': img_path,
                        'timestamp': time.time()
                    }, to=sid)
                else:
                    socketio.emit('diagram_chat_error', {
                        'message': 'Rendering failed. Check server logs.'
                    }, to=sid)
            except Exception as e:
                print(f"❌ Error rendering diagram: {e}")
                socketio.emit('diagram_chat_error', {
                    'message': f'Render error: {str(e)}'
                }, to=sid)
        
        threading.Thread(target=render, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error in render_diagram: {e}")
        emit('diagram_chat_error', {'message': str(e)})


# ── Requirements Specification Chat WebSocket Endpoints ───────────────────────

@socketio.on('start_requirements_spec')
def handle_start_requirements_spec(data):
    """Initialize a requirements specification session.
    
    Expected data: { report_content: str }
    Emits: spec_session_started, spec_question
    """
    try:
        if not data or 'report_content' not in data:
            emit('spec_error', {'message': 'Missing report_content'})
            return
        
        report_content = data['report_content']
        if not report_content or len(report_content.strip()) < 10:
            emit('spec_error', {'message': 'Report content too short'})
            return
        
        sid = request.sid
        
        # Create new spec session
        spec_chat = RequirementsSpecChat()
        requirements_spec_sessions[sid] = {
            'chat': spec_chat,
            'current_index': 0,
            'answers': {}
        }
        
        print(f"📋 Starting requirements spec for session {sid}")
        
        # Parse report and extract questions
        spec_chat.report_data = spec_chat.parse_report(report_content)
        spec_chat.questions = spec_chat.report_data.get("clarification_questions", [])
        
        if not spec_chat.questions:
            print(f"⚠️  No clarification questions found in report for session {sid}")
            emit('spec_error', {'message': 'No clarification questions found in the analysis report. Please re-run the pipeline to generate questions.'})
            return
        
        total_questions = len(spec_chat.questions)
        print(f"📋 Found {total_questions} clarification questions for session {sid}")
        emit('spec_session_started', {
            'session_id': sid,
            'total_questions': total_questions,
            'message': f'Found {total_questions} clarification questions'
        })
        
        # Send first question in background thread
        def send_first_question():
            try:
                session = requirements_spec_sessions.get(sid)
                if not session:
                    print(f"❌ Session {sid} not found when trying to send first question")
                    return
                
                question = session['chat'].questions[0]
                print(f"📋 Generating suggestions for question: {question.get('question', '')[:60]}...")
                
                # Generate suggestions
                project_context = session['chat'].report_data.get('summary', {}).get('summary', '')
                suggestions = session['chat'].generate_suggestions(question, project_context)
                
                print(f"✅ Generated {len(suggestions)} suggestions for first question")
                
                socketio.emit('spec_question', {
                    'question_id': question.get('id', 'N/A'),
                    'category': question.get('category', 'general'),
                    'priority': question.get('priority', 'should_ask'),
                    'question': question.get('question', ''),
                    'context': question.get('context', ''),
                    'suggestions': suggestions,
                    'progress': {'current': 1, 'total': total_questions}
                }, to=sid)
                
            except Exception as e:
                print(f"❌ Error sending first question: {e}")
                import traceback
                traceback.print_exc()
                socketio.emit('spec_error', {'message': f'Failed to generate first question: {str(e)}'}, to=sid)
        
        threading.Thread(target=send_first_question, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error starting requirements spec: {e}")
        emit('spec_error', {'message': str(e)})


@socketio.on('send_spec_answer')
def handle_send_spec_answer(data):
    """Process user's answer and send next question.
    
    Expected data: { answer: str, suggestions: list }
    Emits: spec_answer_recorded, spec_question, or spec_completed
    """
    try:
        sid = request.sid
        session = requirements_spec_sessions.get(sid)
        
        if not session:
            emit('spec_error', {'message': 'No active spec session'})
            return
        
        if not data or 'answer' not in data:
            emit('spec_error', {'message': 'Missing answer'})
            return
        
        answer = data.get('answer', '').strip()
        suggestions = data.get('suggestions', [])
        
        if not answer:
            emit('spec_error', {'message': 'Answer cannot be empty'})
            return
        
        # Process answer
        chat = session['chat']
        current_idx = session['current_index']
        current_question = chat.questions[current_idx]
        
        processed_answer = chat.process_answer(answer, suggestions)
        session['answers'][current_question['id']] = processed_answer
        chat.answers[current_question['id']] = processed_answer
        
        emit('spec_answer_recorded', {
            'question_id': current_question['id'],
            'answer': processed_answer
        })
        
        # Move to next question
        session['current_index'] += 1
        next_idx = session['current_index']
        
        if next_idx >= len(chat.questions):
            # All questions answered - generate spec file
            def generate_spec():
                try:
                    spec_file = chat.generate_spec_file()
                    
                    # Read the generated file
                    with open(spec_file, 'r', encoding='utf-8') as f:
                        spec_content = f.read()
                    
                    socketio.emit('spec_completed', {
                        'spec_file_path': spec_file,
                        'spec_content': spec_content,
                        'answers_summary': session['answers'],
                        'total_answered': len(session['answers'])
                    }, to=sid)
                    
                    print(f"✅ Requirements spec completed for session {sid}")
                    
                except Exception as e:
                    print(f"❌ Error generating spec: {e}")
                    socketio.emit('spec_error', {'message': str(e)}, to=sid)
            
            threading.Thread(target=generate_spec, daemon=True).start()
        else:
            # Send next question
            def send_next_question():
                try:
                    next_question = chat.questions[next_idx]
                    
                    # Generate suggestions
                    project_context = chat.report_data.get('summary', {}).get('summary', '')
                    suggestions = chat.generate_suggestions(next_question, project_context)
                    
                    socketio.emit('spec_question', {
                        'question_id': next_question.get('id', 'N/A'),
                        'category': next_question.get('category', 'general'),
                        'priority': next_question.get('priority', 'should_ask'),
                        'question': next_question.get('question', ''),
                        'context': next_question.get('context', ''),
                        'suggestions': suggestions,
                        'progress': {'current': next_idx + 1, 'total': len(chat.questions)}
                    }, to=sid)
                    
                except Exception as e:
                    print(f"❌ Error sending next question: {e}")
                    socketio.emit('spec_error', {'message': str(e)}, to=sid)
            
            threading.Thread(target=send_next_question, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error processing answer: {e}")
        emit('spec_error', {'message': str(e)})


@socketio.on('skip_spec_question')
def handle_skip_spec_question(data):
    """Skip the current question and move to next.
    
    Emits: spec_question or spec_completed
    """
    try:
        sid = request.sid
        session = requirements_spec_sessions.get(sid)
        
        if not session:
            emit('spec_error', {'message': 'No active spec session'})
            return
        
        chat = session['chat']
        current_idx = session['current_index']
        current_question = chat.questions[current_idx]
        
        # Record as skipped
        session['answers'][current_question['id']] = '[Skipped]'
        
        print(f"⏭️  Skipped question {current_question['id']}")
        
        # Move to next
        session['current_index'] += 1
        next_idx = session['current_index']
        
        if next_idx >= len(chat.questions):
            # All questions processed - generate spec
            def generate_spec():
                try:
                    # Copy non-skipped answers to chat
                    for q_id, ans in session['answers'].items():
                        if ans != '[Skipped]':
                            chat.answers[q_id] = ans
                    
                    spec_file = chat.generate_spec_file()
                    
                    with open(spec_file, 'r', encoding='utf-8') as f:
                        spec_content = f.read()
                    
                    socketio.emit('spec_completed', {
                        'spec_file_path': spec_file,
                        'spec_content': spec_content,
                        'answers_summary': session['answers'],
                        'total_answered': sum(1 for a in session['answers'].values() if a != '[Skipped]')
                    }, to=sid)
                    
                except Exception as e:
                    print(f"❌ Error generating spec: {e}")
                    socketio.emit('spec_error', {'message': str(e)}, to=sid)
            
            threading.Thread(target=generate_spec, daemon=True).start()
        else:
            # Send next question
            def send_next_question():
                try:
                    next_question = chat.questions[next_idx]
                    project_context = chat.report_data.get('summary', {}).get('summary', '')
                    suggestions = chat.generate_suggestions(next_question, project_context)
                    
                    socketio.emit('spec_question', {
                        'question_id': next_question.get('id', 'N/A'),
                        'category': next_question.get('category', 'general'),
                        'priority': next_question.get('priority', 'should_ask'),
                        'question': next_question.get('question', ''),
                        'context': next_question.get('context', ''),
                        'suggestions': suggestions,
                        'progress': {'current': next_idx + 1, 'total': len(chat.questions)}
                    }, to=sid)
                    
                except Exception as e:
                    print(f"❌ Error sending next question: {e}")
                    socketio.emit('spec_error', {'message': str(e)}, to=sid)
            
            threading.Thread(target=send_next_question, daemon=True).start()
        
    except Exception as e:
        print(f"❌ Error skipping question: {e}")
        emit('spec_error', {'message': str(e)})


@socketio.on('inject_spec_context')
def handle_inject_spec_context(data):
    """Inject the completed requirements spec into the AI chat session.

    Expected data: { spec_content: str }
    This adds the spec as a system message in the diagram chat so the AI
    has full context for subsequent questions.
    """
    try:
        sid = request.sid

        if not data or 'spec_content' not in data:
            emit('spec_error', {'message': 'Missing spec_content'})
            return

        spec_content = data['spec_content']
        if not spec_content or len(spec_content.strip()) < 10:
            return  # silently ignore very short / empty content

        chat = diagram_chat_sessions.get(sid)
        if chat:
            # Inject the full spec as a system message so future prompts see it
            chat.messages.append({
                'role': 'system',
                'content': (
                    "The user has completed an interactive Requirements Specification Q&A session. "
                    "Below is the full generated requirements specification. Use this as context "
                    "for all subsequent questions:\n\n"
                    f"{spec_content}"
                ),
            })
            print(f"📋 Injected requirements spec context into chat for session {sid} "
                  f"({len(spec_content)} chars)")
        else:
            print(f"⚠️  No active chat session for {sid} — spec context not injected")

    except Exception as e:
        print(f"❌ Error injecting spec context: {e}")


@app.route('/api/generate-specification', methods=['POST'])
def generate_specification_rest():
    """REST endpoint — same logic as the WebSocket handler but fetch-compatible."""
    data = request.get_json() or {}
    pipeline_results = data.get('pipeline_results', {})
    try:
        gen = SpecificationGenerator()
        diagram_path = None
        diagram_file = pipeline_results.get('diagram_file')
        if diagram_file:
            candidate = os.path.join(PipelineConfig.DIAGRAMS_DIR, diagram_file)
            if os.path.exists(candidate):
                diagram_path = candidate
        pdf_path = gen.generate(pipeline_results=pipeline_results, diagram_path=diagram_path)
        filename = os.path.basename(pdf_path)
        return jsonify({'filename': filename, 'download_url': f'/api/reports/{filename}'})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@socketio.on('generate_specification')
def handle_generate_specification(data):
    """Generate a Project Specification PDF from the pipeline results.

    Expected data: { pipeline_results: { ... } }
    Emits: specification_progress, specification_completed, specification_error
    """
    try:
        if not data or 'pipeline_results' not in data:
            emit('specification_error', {'message': 'Missing pipeline_results'})
            return

        pipeline_results = data['pipeline_results']
        sid = request.sid

        emit('specification_progress', {
            'status': 'generating',
            'message': 'Generating Project Specification PDF...',
        })

        def build_spec():
            try:
                gen = SpecificationGenerator()

                # Locate diagram image if available
                diagram_path = None
                diagram_file = pipeline_results.get('diagram_file')
                if diagram_file:
                    candidate = os.path.join(PipelineConfig.DIAGRAMS_DIR, diagram_file)
                    if os.path.exists(candidate):
                        diagram_path = candidate

                pdf_path = gen.generate(
                    pipeline_results=pipeline_results,
                    diagram_path=diagram_path,
                )
                filename = os.path.basename(pdf_path)
                socketio.emit('specification_completed', {
                    'filename': filename,
                    'download_url': f'/api/reports/{filename}',
                    'message': 'Project Specification PDF is ready!',
                }, to=sid)
                print(f'📋 Specification generated for session {sid}: {filename}')
            except Exception as e:
                print(f'❌ Specification generation error: {e}')
                import traceback
                traceback.print_exc()
                socketio.emit('specification_error', {
                    'message': f'Failed to generate specification: {str(e)}'
                }, to=sid)

        threading.Thread(target=build_spec, daemon=True).start()

    except Exception as e:
        print(f'❌ Error in generate_specification: {e}')
        emit('specification_error', {'message': str(e)})


if __name__ == '__main__':
    print("\n" + "="*70)
    print("🚀 ElevenLabs Streaming Transcription API Server")
    print("="*70)
    print("📡 Server starting on http://localhost:5001")
    print("🎙️  Ready for real-time transcription!")
    print("🔄 Streaming mode enabled")
    print("="*70 + "\n")
    
    Config.validate()
    socketio.run(app, debug=True, port=5001, host='0.0.0.0', allow_unsafe_werkzeug=True)
