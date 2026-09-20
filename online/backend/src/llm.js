export async function generateText(prompt) {
  const provider = process.env.LLM_PROVIDER || '';
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  if (!provider || !apiKey) throw new Error('llm_not_configured');
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.75, max_tokens: 180 }),
    });
    if (!response.ok) throw new Error(`llm_http_${response.status}`);
    const data = await response.json();
    return String(data.choices?.[0]?.message?.content || '').trim();
  }
  throw new Error('unsupported_llm_provider');
}

export function cleanReply(text, maxChars = 180) {
  const cleaned = String(text || '').replace(/[\r\n]+/g, ' ').replace(/^返答[:：]\s*/, '').trim();
  if (!cleaned) return '';
  return cleaned.length > maxChars ? cleaned.slice(0, maxChars - 1) + '…' : cleaned;
}
