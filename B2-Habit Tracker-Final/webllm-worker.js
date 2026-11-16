// webllm-worker.js — handles the WebLLM (MLC AI) engine off the main thread.
// This is the alternative "no API key" engine some people know by name —
// best suited for chat/quick questions (see the note on its tile in
// Settings). Workout-plan PDF/text analysis stays on the Transformers.js
// engine (ai-worker.js) for reliability.
import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => { handler.onmessage(msg); };
