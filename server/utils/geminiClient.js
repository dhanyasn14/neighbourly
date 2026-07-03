const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_TIMEOUT_MS = 30000;

function getGeminiConfig() {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  return {
    apiKey,
    model: String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  };
}

function normalizeSchema(textFormat) {
  if (!textFormat) {
    return null;
  }

  return textFormat.schema || textFormat;
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') {
    return data.output_text.trim();
  }

  const parts = [];

  for (const step of data?.steps || []) {
    for (const content of step.content || []) {
      if (typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }

  for (const candidate of data?.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (typeof part.text === 'string') {
        parts.push(part.text);
      }
    }
  }

  return parts.join('\n').trim();
}

async function createResponse({ instructions, input, textFormat, maxOutputTokens = 900 }) {
  const { apiKey, model, timeoutMs } = getGeminiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const schema = normalizeSchema(textFormat);

  const body = {
    model,
    system_instruction: instructions,
    input,
    generation_config: {
      max_output_tokens: maxOutputTokens,
      temperature: 0.2,
    },
  };

  if (schema) {
    body.response_format = {
      type: 'text',
      mime_type: 'application/json',
      schema,
    };
  }

  try {
    const response = await fetch(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.error?.message || 'Gemini request failed');
      err.status = response.status;
      err.details = data?.error;
      throw err;
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      const err = new Error('Gemini returned an empty response');
      err.status = 502;
      throw err;
    }

    return {
      text: outputText,
      model: data.model || model,
      usage: data.usageMetadata || data.usage || null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Gemini request timed out');
      timeoutErr.status = 504;
      throw timeoutErr;
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonOutput(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    const wrapped = new Error('AI response was not valid JSON');
    wrapped.status = 502;
    wrapped.cause = err;
    throw wrapped;
  }
}

module.exports = {
  createResponse,
  parseJsonOutput,
};
