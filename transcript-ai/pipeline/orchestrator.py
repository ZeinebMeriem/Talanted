"""Processing Orchestrator — coordinates the full pipeline sequentially.

Sequence:
  1. Ingest transcripts → ChromaDB
  2. Retrieve context (RAG)
  3. Qwen: Requirements analysis
  4. Qwen: Meeting summary
  5. Qwen: Ambiguity detection & warnings
  6. Qwen: Clarification question generation
  7. Qwen: Consultant guidance
  8. Qwen: Diagram generation
  9. Render Mermaid diagram
  10. Generate PDF report (all sections combined)

Each step completes before the next starts to avoid overloading the model.
"""
from __future__ import annotations

import time
from typing import Dict, Optional

from pipeline.pipeline_config import PipelineConfig
from pipeline.rag_controller import RAGController
from pipeline.report_generator import ReportGenerator
from pipeline.diagram_generator import DiagramGenerator
from pipeline.preprocessing import load_all_transcripts
from pipeline.diagram_chat import DiagramChat


class PipelineOrchestrator:
    """Full pipeline orchestrator — sequential execution for reliability."""

    def __init__(self):
        print("\n" + "=" * 70)
        print("🚀 Initialising AI Processing Pipeline")
        print("=" * 70)
        t0 = time.time()
        self.rag = RAGController()
        self.reporter = ReportGenerator()
        self.diagrammer = DiagramGenerator()
        print(f"✅ Pipeline ready in {time.time() - t0:.1f}s\n")

    # ── Full pipeline run ─────────────────────────────────────────────

    def run(
        self,
        transcript_text: Optional[str] = None,
        transcript_dir: Optional[str] = None,
        transcript_file: Optional[str] = None,
        tasks: Optional[list] = None,
        interactive_diagram: bool = False,
    ) -> Dict:
        """Execute the full pipeline.

        Args:
            transcript_text: Raw transcript to analyse (optional)
            transcript_dir: Directory of transcript files (optional)
            transcript_file: Path to a single transcript file to analyse (optional)
            tasks: List of tasks to run. Default: all.

        Returns:
            Combined results dict with all outputs.
        """
        tasks = tasks or ["requirements", "summary", "ambiguity_detection", "clarification_questions", "consultant_guidance", "system_architecture", "diagram"]
        results = {
            "steps_completed": [],
            "errors": [],
            "outputs": {},
        }
        pipeline_start = time.time()

        # ── Step 1: Ingest ────────────────────────────────────────────
        print("\n📌 Step 1: Ingesting transcripts into ChromaDB")
        print("-" * 50)
        try:
            ingest_stats = self.rag.ingest(transcript_dir)
            results["ingest_stats"] = ingest_stats
            results["steps_completed"].append("ingest")
            print(f"   ✅ {ingest_stats['total_chunks']} chunks indexed from {ingest_stats['files_processed']} files")
        except Exception as e:
            msg = f"Ingest failed: {e}"
            results["errors"].append(msg)
            print(f"   ❌ {msg}")

        # Get the transcript to analyse
        if not transcript_text:
            if transcript_file:
                # Load only the specified file
                from pipeline.preprocessing import load_transcript
                loaded = load_transcript(transcript_file)
                transcript_text = loaded["text"]
                print(f"   📄 Using transcript: {loaded['source']} ({loaded['word_count']} words)")
            else:
                # Fallback: Use the most recent/largest transcript
                transcripts = load_all_transcripts(transcript_dir)
                if transcripts:
                    best = max(transcripts, key=lambda t: t["word_count"])
                    transcript_text = best["text"]
                    print(f"   📄 Using transcript: {best['source']} ({best['word_count']} words)")
                else:
                    results["errors"].append("No transcripts found")
                    return results

        # Also ingest the current transcript if it's new live text
        if transcript_text:
            self.rag.ingest_text(transcript_text, source="current_session")

        # ── Step 0: Conversation Context Analysis ─────────────────────
        print("\n📌 Step 0: Analyzing conversation context (identifying speakers & project)")
        print("-" * 50)
        try:
            # Call the conversation context analysis on the LLM
            context_result = self.rag.llm.analyze_conversation_context(transcript_text)
            results["outputs"]["conversation_context"] = context_result
            results["steps_completed"].append("conversation_context")
            
            # Display key findings
            if context_result:
                project_type = context_result.get('project_context', {}).get('project_type', 'Unknown')
                industry = context_result.get('project_context', {}).get('industry', 'Unknown')
                n_features = len(context_result.get('key_entities', {}).get('desired_features', []))
                n_pain_points = len(context_result.get('client_pain_points', []))
                print(f"   ✅ Context analyzed: {project_type} in {industry}")
                print(f"   📊 {n_features} features, {n_pain_points} pain points identified")
        except Exception as e:
            msg = f"Conversation context analysis failed: {e}"
            results["errors"].append(msg)
            print(f"   ⚠️  {msg}")
            print("   Continuing without conversation context...")

        # ── Step 2: Requirements Analysis ─────────────────────────────
        if "requirements" in tasks:
            print("\n📌 Step 2: Extracting requirements (Qwen + RAG)")
            print("-" * 50)
            try:
                req_result = self.rag.analyse(transcript_text, task="requirements")
                results["outputs"]["requirements"] = req_result
                results["steps_completed"].append("requirements")
                n_fr = len(req_result.get("analysis", {}).get("functional_requirements", []))
                n_nfr = len(req_result.get("analysis", {}).get("non_functional_requirements", []))
                print(f"   ✅ {n_fr} functional + {n_nfr} non-functional requirements extracted")
            except Exception as e:
                msg = f"Requirements analysis failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 3: Meeting Summary ───────────────────────────────────
        if "summary" in tasks:
            print("\n📌 Step 3: Generating meeting summary (Qwen + RAG)")
            print("-" * 50)
            try:
                sum_result = self.rag.analyse(transcript_text, task="summary")
                results["outputs"]["summary"] = sum_result
                results["steps_completed"].append("summary")
                print(f"   ✅ Summary generated ({sum_result.get('processing_time', '?')}s)")
            except Exception as e:
                msg = f"Summary generation failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 4: Ambiguity Detection ───────────────────────────────
        if "ambiguity_detection" in tasks:
            print("\n📌 Step 4: Detecting ambiguities & warnings (Qwen + RAG)")
            print("-" * 50)
            try:
                amb_result = self.rag.analyse(transcript_text, task="ambiguity_detection")
                results["outputs"]["ambiguity_detection"] = amb_result
                results["steps_completed"].append("ambiguity_detection")
                amb_data = amb_result.get("analysis", {})
                n_amb = len(amb_data.get("ambiguities", []))
                n_warn = len(amb_data.get("warnings", []))
                score = amb_data.get("completeness_score", "N/A")
                print(f"   ✅ {n_amb} ambiguities detected, {n_warn} warnings raised")
                print(f"   📊 Completeness score: {score}")
            except Exception as e:
                msg = f"Ambiguity detection failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 5: Clarification Questions ───────────────────────────
        if "clarification_questions" in tasks:
            print("\n📌 Step 5: Generating clarification questions (Qwen + RAG)")
            print("-" * 50)
            try:
                cq_result = self.rag.analyse(transcript_text, task="clarification_questions")
                results["outputs"]["clarification_questions"] = cq_result
                results["steps_completed"].append("clarification_questions")
                cq_data = cq_result.get("analysis", {})
                n_q = len(cq_data.get("questions", []))
                print(f"   ✅ {n_q} clarification questions generated")
            except Exception as e:
                msg = f"Clarification questions generation failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 6: Consultant Guidance ───────────────────────────────
        if "consultant_guidance" in tasks:
            print("\n📌 Step 6: Generating consultant guidance (Qwen + RAG)")
            print("-" * 50)
            try:
                cg_result = self.rag.analyse(transcript_text, task="consultant_guidance")
                results["outputs"]["consultant_guidance"] = cg_result
                results["steps_completed"].append("consultant_guidance")
                cg_data = cg_result.get("analysis", {})
                n_insights = len(cg_data.get("key_insights", []))
                n_risks = len(cg_data.get("risk_areas", []))
                print(f"   ✅ {n_insights} insights, {n_risks} risk areas identified")
            except Exception as e:
                msg = f"Consultant guidance generation failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 6b: System Architecture Conception ──────────────────
        if "system_architecture" in tasks:
            print("\n📌 Step 6b: Generating system architecture conception (Qwen + RAG)")
            print("-" * 50)
            try:
                arch_result = self.rag.analyse(transcript_text, task="system_architecture")
                results["outputs"]["system_architecture"] = arch_result
                results["steps_completed"].append("system_architecture")
                arch_data = arch_result.get("analysis", {})
                n_layers = len(arch_data.get("system_layers", []))
                n_endpoints = len(arch_data.get("api_endpoints", []))
                n_entities = len(arch_data.get("database_schema", []))
                arch_style = arch_data.get("architecture_style", "N/A")
                print(f"   ✅ Architecture: {arch_style}")
                print(f"   📊 {n_layers} layers, {n_endpoints} API endpoints, {n_entities} DB entities")
            except Exception as e:
                msg = f"System architecture generation failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 7: Diagram Generation ────────────────────────────────
        diagram_path = None
        if "diagram" in tasks:
            print("\n📌 Step 7: Generating system diagram (Qwen → Mermaid)")
            print("-" * 50)
            try:
                diag_result = self.rag.analyse(transcript_text, task="diagram")
                results["outputs"]["diagram_analysis"] = diag_result

                # Render the mermaid code
                render_result = self.diagrammer.render_from_analysis(diag_result)
                results["outputs"]["diagram_files"] = render_result
                diagram_path = render_result.get("image_file")
                results["steps_completed"].append("diagram")
                print(f"   ✅ Diagram rendered: {render_result.get('method', 'unknown')}")
            except Exception as e:
                msg = f"Diagram generation failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Step 8: PDF Report ────────────────────────────────────────
        print("\n📌 Step 8: Generating PDF report")
        print("-" * 50)
        try:
            # Build combined analysis for the report
            combined_analysis = {}
            for task_name in ["requirements", "summary"]:
                if task_name in results["outputs"]:
                    combined_analysis.update(
                        results["outputs"][task_name].get("analysis", {})
                    )

            # Add ambiguity detection data
            if "ambiguity_detection" in results["outputs"]:
                amb_data = results["outputs"]["ambiguity_detection"].get("analysis", {})
                combined_analysis["ambiguities"] = amb_data.get("ambiguities", [])
                combined_analysis["warnings"] = amb_data.get("warnings", [])
                combined_analysis["completeness_score"] = amb_data.get("completeness_score", None)
                combined_analysis["severity_summary"] = amb_data.get("severity_summary", {})
                combined_analysis["overall_assessment"] = amb_data.get("overall_assessment", "")

            # Add clarification questions data
            if "clarification_questions" in results["outputs"]:
                cq_data = results["outputs"]["clarification_questions"].get("analysis", {})
                combined_analysis["clarification_questions"] = cq_data.get("questions", [])
                combined_analysis["recommended_meeting_agenda"] = cq_data.get("recommended_meeting_agenda", [])

            # Add consultant guidance data
            if "consultant_guidance" in results["outputs"]:
                cg_data = results["outputs"]["consultant_guidance"].get("analysis", {})
                combined_analysis["client_intent_summary"] = cg_data.get("client_intent_summary", "")
                combined_analysis["key_insights"] = cg_data.get("key_insights", [])
                combined_analysis["inconsistencies"] = cg_data.get("inconsistencies", [])
                combined_analysis["hidden_requirements"] = cg_data.get("hidden_requirements", [])
                combined_analysis["risk_areas"] = cg_data.get("risk_areas", [])
                combined_analysis["recommended_next_steps"] = cg_data.get("recommended_next_steps", [])
                combined_analysis["stakeholder_analysis"] = cg_data.get("stakeholder_analysis", [])
                combined_analysis["technology_stack_recommendation"] = cg_data.get("technology_stack_recommendation", {})

            # Add diagram data
            if "diagram_analysis" in results["outputs"]:
                diag_data = results["outputs"]["diagram_analysis"].get("analysis", {})
                combined_analysis["mermaid_code"] = diag_data.get("mermaid_code", "")
                combined_analysis["diagram_description"] = diag_data.get("description", "")

            # Add system architecture data
            if "system_architecture" in results["outputs"]:
                arch_data = results["outputs"]["system_architecture"].get("analysis", {})
                combined_analysis["system_architecture"] = arch_data

            # Merge metadata from all tasks
            all_sources = set()
            total_time = 0
            total_chunks = 0
            for output in results["outputs"].values():
                if isinstance(output, dict):
                    all_sources.update(output.get("context_sources", []))
                    total_time += output.get("processing_time", 0)
                    total_chunks += output.get("context_chunks_used", 0)

            report_data = {
                "analysis": combined_analysis,
                "context_sources": list(all_sources),
                "context_chunks_used": total_chunks,
                "processing_time": round(total_time, 2),
            }

            pdf_path = self.reporter.generate(
                analysis=report_data,
                task="requirements",  # primary layout
                transcript_text=transcript_text,
                diagram_path=diagram_path,
            )
            results["outputs"]["pdf_report"] = pdf_path
            results["steps_completed"].append("pdf_report")
        except Exception as e:
            msg = f"PDF generation failed: {e}"
            results["errors"].append(msg)
            print(f"   ❌ {msg}")

        # ── Step 9: Markdown Report + Interactive Diagram Chat ─────────
        md_content = None
        if "pdf_report" in results["steps_completed"]:
            print("\n📌 Step 9: Generating Markdown report copy")
            print("-" * 50)
            try:
                md_content, md_path = self.reporter.generate_markdown(
                    analysis=report_data,
                    task="requirements",
                    transcript_text=transcript_text,
                )
                results["outputs"]["md_report"] = md_path
                results["steps_completed"].append("md_report")
            except Exception as e:
                msg = f"Markdown report failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        if interactive_diagram and md_content:
            print("\n📌 Step 9b: Interactive Diagram Chat")
            print("-" * 50)
            try:
                chat = DiagramChat()
                chat.start(md_content)
                if chat.latest_mermaid:
                    results["outputs"]["interactive_diagram_mermaid"] = chat.latest_mermaid
                    results["steps_completed"].append("interactive_diagram")
            except Exception as e:
                msg = f"Interactive diagram chat failed: {e}"
                results["errors"].append(msg)
                print(f"   ❌ {msg}")

        # ── Summary ───────────────────────────────────────────────────
        total_elapsed = time.time() - pipeline_start
        results["total_time"] = round(total_elapsed, 2)

        print("\n" + "=" * 70)
        print("🏁 Pipeline Complete!")
        print(f"   Steps completed: {', '.join(results['steps_completed'])}")
        if results["errors"]:
            print(f"   Errors: {len(results['errors'])}")
        print(f"   Total time: {total_elapsed:.1f}s")
        if results["outputs"].get("pdf_report"):
            print(f"   📄 Report: {results['outputs']['pdf_report']}")
        if results["outputs"].get("md_report"):
            print(f"   📝 Markdown: {results['outputs']['md_report']}")
        print("=" * 70 + "\n")

        return results

    # ── Individual task runners ────────────────────────────────────────

    def ingest_only(self, directory: Optional[str] = None) -> Dict:
        """Just ingest transcripts without analysis."""
        return self.rag.ingest(directory)

    def analyse_only(self, text: str, task: str = "requirements") -> Dict:
        """Run a single analysis task on provided text.
        
        This will automatically run conversation context analysis first
        if it hasn't been done yet, to provide better context for the task.
        """
        # Run conversation context analysis if not already done
        if self.rag.llm.conversation_context is None:
            print("🔍 Running conversation context analysis first...")
            try:
                self.rag.llm.analyze_conversation_context(text)
            except Exception as e:
                print(f"⚠️  Context analysis failed: {e}")
                print("   Continuing without context...")
        
        return self.rag.analyse(text, task=task)

    def diagram_only(self, description: str) -> Dict:
        """Generate a diagram from a description."""
        mermaid_code = self.rag.generate_diagram(description)
        return self.diagrammer.render(mermaid_code)

    def stats(self) -> Dict:
        """Pipeline stats."""
        return self.rag.stats()