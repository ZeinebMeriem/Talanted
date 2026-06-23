# Scribe AI — Presentation Speech

> **Speaker:** Mortadha JEMAI
> **Team:** NeuralCoders (6 members)
> **Project:** AI Assistant for Requirements Clarification & Analysis

---

## Slide 1 — Title

> *"Good morning everyone. My name is Mortadha, and on behalf of the NeuralCoders team, I'm very happy to present to you today our project: **Scribe AI** — an AI-powered assistant for requirements clarification and analysis.*
>
> *The idea behind this project is simple but powerful: what if we could turn a raw conversation between a consultant and a client into a complete, structured requirements specification — automatically?"*

---

## Slide 2 — The Team

> *"Let me start by introducing the team. We are six computer science students working together on this project:*
>
> *Myself — Mortadha JEMAI, Elyes DAROUICH, Mohamed Ali MAALEJ, Nour El Houda SAKHRI, Yassine EL AMRI, and Seif Allah KAROUI.*
>
> *Each of us contributed to different parts of the system, from the AI pipeline to the frontend to the report generation. It's been a great team effort."*

---

## Slide 3 — Problem Statement

> *"Now, let's talk about why this project matters.*
>
> *In the Software Development Life Cycle, the requirements analysis stage is arguably the most critical phase for the success of any project. And the data backs this up — as you can see from this chart, a bug that costs just one unit to fix during requirements analysis can cost up to **100 to 1000 times more** to fix once the system is in production.*
>
> *Yet in practice, requirements analysis is often done manually — a consultant sits with a client, takes notes, tries to capture everything, and then writes up a document later. This process is slow, error-prone, and things inevitably get lost in translation.*
>
> *Ambiguities slip through, important details are missed, and by the time someone notices, the project has already gone down the wrong path. So the question we asked ourselves is: can AI help us do this better?"*

---

## Slide 4 — Current State Analysis

> *"Before building anything, we looked at what's already out there — and honestly, no existing tool solves this problem end-to-end.*
>
> *Microsoft 365 Copilot with Teams can transcribe and summarize meetings, but it doesn't extract structured requirements or guide the consultant on what questions to ask.*
>
> *Dovetail AI is great for qualitative research and extracting themes, but it doesn't work with live meetings and doesn't offer real-time guidance.*
>
> *Jama Connect Advisor focuses on requirements quality scoring, but it can't take a raw conversation as input — it needs already-written requirements.*
>
> *So you can see the gap: **no existing tool combines live conversation analysis with intelligent, real-time requirements guidance.** And that's exactly the space we decided to fill."*

---

## Slide 5 — Proposed Solution

> *"Our solution is **Scribe AI** — an AI assistant that sits with the consultant during a client meeting and handles the entire journey from voice to structured specification.*
>
> *Here's the flow: the system listens to the conversation in real time — and it supports multiple languages including English, French, and even Tunisian dialect. It transcribes everything, identifies who's speaking — the client or the consultant — and then runs our AI pipeline to extract requirements, detect ambiguities, generate clarification questions, and even propose a system architecture.*
>
> *But it doesn't stop at analysis. The consultant can then interact with the AI assistant to refine diagrams, answer clarification questions, and ultimately generate a complete project specification — a 'cahier des charges' — as a professional PDF. All from a single conversation."*

---

## Slide 6 — Added Value

> *"So what makes our solution stand out?*
>
> *It's **end-to-end** — from live voice to polished PDF, no manual steps. It's **multilingual and speaker-aware**, handling English, French, and Tunisian dialect while distinguishing client from consultant automatically.*
>
> *The AI is **context-aware** using RAG, so it references the full conversation for every analysis. It actively **detects ambiguities** and helps resolve them through interactive Q&A. It even **generates system architecture and diagrams** — sequence diagrams, DB schemas, API designs — all from the conversation.*
>
> *And importantly, it's **privacy-first** — everything runs locally, no data leaves your machine. All of this means catching issues early and avoiding those costly late-stage requirement errors we talked about."*

---

## Slide 7 — System Architecture

> *"Now let's look at how the system is built.*
>
> *We have a three-layer architecture. At the top, the **Interaction Layer** — a React TypeScript frontend built with Vite and Socket.IO for real-time communication. This is what the consultant sees and interacts with, including waveform visualization during recording.*
>
> *In the middle, the **Realtime and API layer** — powered by Flask with Socket.IO for the streaming server on port 5001, and FastAPI for the pipeline orchestration on port 8080. These handle recording, transcription, and all the WebSocket-based interactive features.*
>
> *At the bottom, the **Intelligence and Reasoning layer** — this is where the magic happens. We have Ollama running Qwen 2.5 as our local LLM, ChromaDB as our vector store for RAG, a JSON validator to ensure structured outputs, and ReportLab for PDF generation.*
>
> *Everything communicates through WebSockets for the real-time features and REST APIs for file operations."*

---

## Slide 8 — Technology Stack

> *"Here's a quick overview of our tech stack:*
>
> *On the frontend, React 19 with Vite for fast development, Framer Motion for smooth animations, and Mermaid.js for rendering diagrams right in the browser.*
>
> *On the backend, Flask handles the streaming API and Socket.IO connections, while FastAPI runs the AI pipeline. Everything is in Python.*
>
> *For AI and ML, we use **Qwen 2.5 with 3 billion parameters**, running locally via Ollama. Now, why this specific model? We actually went through a process of trial and error here. We first tried **Qwen 3 with 4 billion parameters**, but it turned out to be very resource-intensive — it was slow and heavy on our machines. Then we tried a smaller model, but it simply wasn't smart enough to handle the complex structured JSON outputs we needed. So **Qwen 2.5:3b turned out to be the sweet spot** — it's fast, lightweight, produces reliable structured output, and most importantly, it runs entirely on-premise so all meeting data stays private and there are zero API costs.*
>
> *For speech-to-text, we use ElevenLabs Scribe v2, which supports 99 languages with speaker diarization built in. And for reports, ReportLab generates professional PDFs."*

---

## Slide 9 — AI Pipeline

> *"This is the core engine of the project. After transcription, the pipeline runs sequentially: it starts with **Context Analysis** to identify speakers and the project context, then **ingests the transcript into ChromaDB** for RAG so the model 'remembers' everything.*
>
> *From there, it extracts **requirements**, generates a **meeting summary**, detects **ambiguities**, produces **clarification questions**, and offers **consultant guidance** with risk analysis and tech stack recommendations. It also proposes a **system architecture** and generates **Mermaid diagrams**.*
>
> *But the real power comes after: the consultant enters an **Interactive Diagram Chat** to refine architecture with the AI, and then a **Requirements Spec Q&A** where the AI walks through each clarification question with suggestions — and compiles everything into a Cahier des Charges PDF.*
>
> *Each step feeds the next through RAG context, so the model builds progressively deeper understanding."*

---

## Slide 10 — Core Feature: Real-Time Transcription

> *"Let me show you our real-time transcription feature.*
>
> *We use ElevenLabs Scribe v2, which is a state-of-the-art speech-to-text API supporting 99 languages. The system streams audio in chunks — 3-second windows with overlap for better word boundaries — and includes a voice activity detection so we don't waste processing time on silence.*
>
> *It automatically identifies speakers through diarization, so we know who said what. And as you can see in the UI, there's a waveform visualization giving real-time audio feedback.*
>
> *The system also has a language auto-detection with a voting mechanism across chunks, so even in a multilingual conversation mixing French, English, and Tunisian dialect, it adapts and captures everything accurately."*

---

## Slide 11 — Core Feature: Context-Aware AI Analysis

> *"Once we have the transcript, this is where Qwen comes in.*
>
> *The AI doesn't just read the text — it analyzes the conversation in context. It identifies the key points being discussed, the risks that the consultant should be aware of, and the ambiguities that need to be resolved.*
>
> *What makes this powerful is the RAG architecture. The transcript is chunked and stored in ChromaDB, and for each analysis task, the most relevant chunks are retrieved and injected into the prompt. This means the model always has the right context, even for long conversations.*
>
> *The output is always structured JSON — and we built a repair mechanism to handle cases where the LLM produces slightly malformed JSON. There's also a hallucination filter to catch and remove any requirements that the model might have fabricated."*

---

## Slide 12 — Core Feature: System Architecture Conception

> *"This is something we added that goes beyond the original specification — the system doesn't just analyze requirements, it actually **proposes a full system architecture** based on the conversation.*
>
> *It recommends an architecture style — microservices, monolithic, or otherwise — defines the system layers with their components and technologies, proposes a database schema with entities, fields, types, and relationships, and even designs API endpoints.*
>
> *All of this is generated from the conversation and included in both the analysis report and the final specification PDF."*

---

## Slide 13 — Interactive Diagram Refinement

> *"Now, the automated pipeline gives us a great starting point, but the real power comes from the interactive features.*
>
> *Through the Diagram Chat, the consultant can have a back-and-forth conversation with the AI about the sequence diagrams and architecture. Want to add a microservice? Change the database? Add an authentication flow? Just tell the AI, and it updates the Mermaid diagram in real-time.*
>
> *This is important because the final architecture should reflect the consultant's expertise and decisions — the AI proposes, but the human decides."*

---

## Slide 14 — Interactive Features: The AI Assistant Popup

> *"Here's our AI Assistant popup — it's a multi-tab floating panel that brings everything together.*
>
> *The **Chat tab** is for free-form conversation with the AI — refining diagrams, asking questions about the analysis, or exploring alternatives.*
>
> *The **Requirements Specification tab** is where the interactive Q&A happens. The AI presents each clarification question from the analysis, complete with numbered suggestions that the consultant can click to select, or they can type their own custom answer. There's a progress bar showing how far along you are, and questions are categorized by type — functional, non-functional, technical, timeline — with priority badges.*
>
> *And the **Specification tab** lets the consultant generate the final 'Cahier des Charges' PDF with one click, combining all the pipeline results with the Q&A answers into a professional, client-ready document."*

---

## Slide 15 — Conclusion

> *"To wrap up — Scribe AI automates the complete journey from a live voice conversation to a structured, professional requirements specification.*
>
> *It uses a local LLM — Qwen 2.5 — with RAG for context-aware analysis, keeping all data private and processing costs at zero. It doesn't just passively analyze — it actively collaborates with the consultant through interactive Q&A and diagram refinement.*
>
> *The result? Two deliverables from a single conversation: an internal Analysis Report and a client-facing Cahier des Charges. No more lost notes, no more missed ambiguities, no more requirements errors discovered too late.*
>
> *For future perspectives, we're looking at multi-meeting memory — so the AI can track how requirements evolve across multiple sessions — and integration with project management tools like Jira and Trello.*
>
> *Thank you."*

---

## Slide 16 — Thank You

> *"Thank you all for your attention. We're now happy to answer any questions you may have."*

---

## Bonus: Demo Video Narration

> *If narrating over the demo video, use these talking points:*

> *"Let me now show you a quick demo of the system in action.*
>
> *Here, we have a real conversation between a consultant and a client. The system is listening and transcribing in real-time — you can see the waveform and the text appearing as they speak.*
>
> *Once the recording is done, the AI pipeline kicks in automatically. You can see the progress notifications — context analysis, requirements extraction, ambiguity detection, and so on — each step building on the previous one.*
>
> *Now the pipeline is complete. Let's open the AI Assistant popup. In the Chat tab, we can see the full analysis and the generated sequence diagram. The consultant can discuss it with the AI — for example, asking to add a component or change the flow.*
>
> *Let's switch to the Requirements Specification tab. Here, the AI is presenting the clarification questions that were flagged during the ambiguity detection. Each question comes with numbered suggestions — the consultant can click one, or type a custom answer. This is the interactive part that makes Scribe AI more than just an analysis tool — it's a collaborative assistant.*
>
> *As the consultant answers each question, the progress bar advances. Once all questions are answered, the system compiles everything and generates the final Cahier des Charges — a complete project specification PDF, ready to hand to the client.*
>
> *And that's Scribe AI — from voice to specification, powered by local AI."*
