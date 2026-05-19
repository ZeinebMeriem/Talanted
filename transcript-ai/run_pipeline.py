#!/usr/bin/env python3
"""Run the full AI pipeline — ingest, analyse, diagram, PDF.

Usage:
    python3 run_pipeline.py                          # uses largest transcript in outputs/
    python3 run_pipeline.py <path/to/transcript.txt>  # uses only the given file
"""
import sys
import os
sys.path.insert(0, ".")

from pipeline.orchestrator import PipelineOrchestrator

if __name__ == "__main__":
    pipe = PipelineOrchestrator()

    transcript_file = None
    if len(sys.argv) > 1:
        transcript_file = sys.argv[1]
        if not os.path.isfile(transcript_file):
            print(f"❌ File not found: {transcript_file}")
            sys.exit(1)
        print(f"📄 Targeting single transcript: {transcript_file}")

    results = pipe.run(transcript_file=transcript_file)

    # Print final outputs
    print("\n📊 Final Outputs:")
    for key, val in results.get("outputs", {}).items():
        if isinstance(val, str):
            print(f"   {key}: {val}")
        elif isinstance(val, dict):
            if "image_file" in val:
                print(f"   {key}: {val.get('image_file', val.get('mmd_file'))}")
            elif "processing_time" in val:
                print(f"   {key}: completed in {val['processing_time']}s")

    if results.get("errors"):
        print("\n⚠️  Errors:")
        for e in results["errors"]:
            print(f"   - {e}")
