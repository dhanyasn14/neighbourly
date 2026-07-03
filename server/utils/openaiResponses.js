const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const DEFAULT_TIMEOUT_MS = 30000;

function getOpenAiConfig() {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();

  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.code = 'OPENAI_NOT_CONFIGURED';
    throw err;
  }

  return {
    apiKey,
    model: String(process.env.OPENAI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  };
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string') {
    return data.output_text.trim();
  }

  const parts = [];

  for (const item of data?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }

  return parts.join('\n').trim();
}

async function createResponse({ instructions, input, textFormat, maxOutputTokens = 900 }) {
  const { apiKey, model, timeoutMs } = getOpenAiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const body = {
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
    store: false,
  };

  if (textFormat) {
    body.text = { format: textFormat };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.error?.message || 'OpenAI request failed');
      err.status = response.status;
      err.details = data?.error;
      throw err;
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      const err = new Error('OpenAI returned an empty response');
      err.status = 502;
      throw err;
    }

    return {
      text: outputText,
      model: data.model || model,
      usage: data.usage || null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('OpenAI request timed out');
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
