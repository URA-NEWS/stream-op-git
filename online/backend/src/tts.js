export async function synthesizeSpeech(text) {
  const provider = process.env.TTS_PROVIDER || '';
  if (!provider) throw new Error('tts_not_configured');

  if (provider === 'none') {
    return { audio_url: null, duration_ms: Math.max(2200, Math.min(12000, text.length * 130)), provider: 'none' };
  }

  const apiKey = process.env.TTS_API_KEY || '';
  if (!apiKey) throw new Error('tts_api_key_missing');

  if (provider === 'voicevox-proxy') {
    const baseUrl = process.env.TTS_BASE_URL || '';
    if (!baseUrl) throw new Error('tts_base_url_missing');
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ text, speaker_id: Number(process.env.TTS_SPEAKER_ID || 11), voice: process.env.TTS_VOICE || '玄野武宏' }),
    });
    if (!response.ok) throw new Error(`tts_http_${response.status}`);
    return response.json();
  }

  throw new Error('unsupported_tts_provider');
}
