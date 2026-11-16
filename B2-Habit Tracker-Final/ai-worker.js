// B² local AI worker — runs Transformers.js (Xenova/Hugging Face) fully
// on-device, in a background thread, with zero API key and zero server.
// Broader compatibility than WebLLM: falls back to WASM/CPU when WebGPU
// isn't available (most phones), instead of refusing to run at all.
import { pipeline, TextStreamer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3";

let generator = null;
let currentModelId = null;

async function detectDevice() {
  try {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch (e) { /* fall through to wasm */ }
  return "wasm";
}

async function loadModel(modelId) {
  if (generator && currentModelId === modelId) {
    postMessage({ type: "ready", modelId });
    return;
  }
  generator = null;
  const device = await detectDevice();
  postMessage({ type: "status", text: device === "webgpu" ? "Using GPU acceleration…" : "Using CPU (WASM) — works everywhere, a bit slower" });
  try {
    generator = await pipeline("text-generation", modelId, {
      dtype: "q4",
      device,
      progress_callback: (data) => {
        if (data.status === "progress") {
          const pct = typeof data.progress === "number" ? Math.round(data.progress) : (data.total ? Math.round((data.loaded / data.total) * 100) : 0);
          postMessage({ type: "progress", pct, file: data.file || "" });
        } else if (data.status) {
          postMessage({ type: "status", text: data.status });
        }
      },
    });
    currentModelId = modelId;
    postMessage({ type: "ready", modelId });
  } catch (err) {
    postMessage({ type: "error", message: (err && err.message) || String(err) });
  }
}

async function generate(id, messages, maxTokens) {
  if (!generator) {
    postMessage({ type: "error", id, message: "Model not loaded yet." });
    return;
  }
  try {
    let acc = "";
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token) => {
        acc += token;
        postMessage({ type: "token", id, text: token, acc });
      },
    });
    const output = await generator(messages, {
      max_new_tokens: maxTokens || 600,
      temperature: 0.7,
      do_sample: true,
      top_p: 0.9,
      repetition_penalty: 1.15,
      streamer,
    });
    let finalText = acc;
    try {
      const last = output[0].generated_text;
      if (Array.isArray(last)) finalText = last[last.length - 1].content;
    } catch (e) { /* fall back to streamed acc */ }
    postMessage({ type: "done", id, text: finalText });
  } catch (err) {
    postMessage({ type: "error", id, message: (err && err.message) || String(err) });
  }
}

onmessage = async (e) => {
  const { type } = e.data;
  if (type === "load") await loadModel(e.data.modelId);
  else if (type === "generate") await generate(e.data.id, e.data.messages, e.data.maxTokens);
};
