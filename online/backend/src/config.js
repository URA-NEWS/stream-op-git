const MIN_SECRET_LENGTH = 24;

const REQUIRED_GROUPS = {
  core: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_API_TOKEN', 'JOB_TOKEN'],
  scene: ['SCENE_READ_TOKEN'],
  twitcasting: ['TWITCASTING_USER_ID', 'TWITCASTING_CLIENT_ID', 'TWITCASTING_CLIENT_SECRET'],
  ai: ['LLM_PROVIDER', 'LLM_API_KEY'],
  voice: ['TTS_PROVIDER'],
};

const OPTIONAL_GROUPS = {
  app: ['APP_BASE_URL', 'PUBLIC_CONTROL_BASE_URL'],
  ai: ['LLM_MODEL'],
  voice: ['TTS_BASE_URL', 'TTS_API_KEY', 'TTS_VOICE', 'TTS_SPEAKER_ID'],
};

function present(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function secretReady(name) {
  return String(process.env[name] || '').trim().length >= MIN_SECRET_LENGTH;
}

function missingFrom(names) {
  return names.filter(name => !present(name));
}

function weakSecrets(names) {
  return names.filter(name => present(name) && !secretReady(name));
}

function groupState(names) {
  return names.every(name => present(name));
}

export function publicConfigState() {
  return {
    supabase: groupState(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']),
    twitcasting: groupState(REQUIRED_GROUPS.twitcasting),
    llm: groupState(REQUIRED_GROUPS.ai),
    tts: present('TTS_PROVIDER') && (present('TTS_API_KEY') || process.env.TTS_PROVIDER === 'none'),
    sceneToken: present('SCENE_READ_TOKEN'),
  };
}

export function readinessReport(database = 'not_checked') {
  const missing = Object.fromEntries(
    Object.entries(REQUIRED_GROUPS).map(([group, names]) => [group, missingFrom(names)]),
  );
  const optionalMissing = Object.fromEntries(
    Object.entries(OPTIONAL_GROUPS).map(([group, names]) => [group, missingFrom(names)]),
  );
  const weak = weakSecrets(['ADMIN_API_TOKEN', 'JOB_TOKEN', 'SCENE_READ_TOKEN']);
  const criticalMissing = [...missing.core, ...missing.scene];
  const integrationMissing = [...missing.twitcasting, ...missing.ai, ...missing.voice];
  const ready = criticalMissing.length === 0 && integrationMissing.length === 0 && weak.length === 0 && database === 'ready';

  const nextActions = [];
  if (missing.core.length) nextActions.push('Add core backend secrets in Railway or Render variables.');
  if (missing.scene.length) nextActions.push('Add SCENE_READ_TOKEN, then append it to the OBS scene URL as ?token=...');
  if (missing.twitcasting.length) nextActions.push('Add TwitCasting app credentials and user id.');
  if (missing.ai.length) nextActions.push('Add LLM provider and API key for non-mechanical replies.');
  if (missing.voice.length) nextActions.push('Choose a TTS provider; use TTS_PROVIDER=none only for silent testing.');
  if (weak.length) nextActions.push('Regenerate ADMIN_API_TOKEN, JOB_TOKEN, and SCENE_READ_TOKEN as 24+ character random values.');
  if (database !== 'ready') nextActions.push('Verify Supabase schema, service role key, and database connectivity.');

  return {
    ready,
    database,
    configured: publicConfigState(),
    missing,
    optionalMissing,
    weakSecrets: weak,
    nextActions,
  };
}
