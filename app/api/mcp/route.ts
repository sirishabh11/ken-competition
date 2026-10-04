import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { z } from 'zod';

const handler = createMcpHandler((server) => {
  server.registerTool(
    'gnani_transcribe_audio',
    {
      description: 'Transcribe a short cook or household voice note using Gnani STT. Provide the audio as base64; clips must be at most 60 seconds.',
      inputSchema: z.object({
        audio_base64: z.string().min(1).describe('Audio file bytes encoded as base64, without a data: URL prefix.'),
        mime_type: z.string().default('audio/ogg').describe('Audio MIME type, for example audio/ogg, audio/mpeg, or audio/wav.'),
        file_name: z.string().default('voice-note.ogg'),
        language_code: z.string().default('hi-IN').describe('BCP-47 language code, for example hi-IN, en-IN, or ta-IN.'),
      }),
    },
    async ({ audio_base64, mime_type, file_name, language_code }) => {
      const apiKey = process.env.GNANI_API_KEY_ID;
      if (!apiKey) {
        return { isError: true, content: [{ type: 'text', text: 'Server setup error: GNANI_API_KEY_ID is not set in Vercel.' }] };
      }
      try {
        const bytes = Buffer.from(audio_base64.replace(/^data:[^,]+,/, ''), 'base64');
        const form = new FormData();
        form.append('audio_file', new Blob([bytes], { type: mime_type }), file_name);
        form.append('language_code', language_code);
        const response = await fetch('https://api.vachana.ai/stt/v3', {
          method: 'POST',
          headers: { 'X-API-Key-ID': apiKey },
          body: form,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return { isError: true, content: [{ type: 'text', text: `Gnani STT returned HTTP ${response.status}: ${JSON.stringify(payload)}` }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: `STT request failed: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
      }
    },
  );

  server.registerTool(
    'gnani_speak_text',
    {
      description: 'Convert text to speech with Gnani Timbre. Returns audio bytes encoded as base64 for a downstream audio or WhatsApp step.',
      inputSchema: z.object({
        text: z.string().min(1).max(5000),
        voice: z.string().default('Nalini'),
        language: z.string().default('hi-IN'),
        speed: z.number().min(0.5).max(2).default(1),
      }),
    },
    async ({ text, voice, language, speed }) => {
      const apiKey = process.env.GNANI_API_KEY_ID;
      if (!apiKey) {
        return { isError: true, content: [{ type: 'text', text: 'Server setup error: GNANI_API_KEY_ID is not set in Vercel.' }] };
      }
      try {
        const response = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key-ID': apiKey },
          body: JSON.stringify({
            text,
            voice,
            model: 'timbre-v2.5',
            language,
            speed,
            audio_config: { sample_rate: 48000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' },
          }),
        });
        if (!response.ok) {
          const message = await response.text();
          return { isError: true, content: [{ type: 'text', text: `Gnani TTS returned HTTP ${response.status}: ${message.slice(0, 1000)}` }] };
        }
        const audio = Buffer.from(await response.arrayBuffer()).toString('base64');
        return {
          content: [{ type: 'text', text: JSON.stringify({ mime_type: response.headers.get('content-type') || 'audio/wav', audio_base64: audio }) }],
        };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: `TTS request failed: ${error instanceof Error ? error.message : 'Unknown error'}` }] };
      }
    },
  );
});

const verifyToken = async (_request: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  const expected = process.env.MEALYN_MCP_TOKEN;
  if (!expected || !bearerToken || bearerToken !== expected) return undefined;
  return { token: bearerToken, scopes: ['gnani:use'], clientId: 'agenticorg' };
};

const securedHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ['gnani:use'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export const runtime = 'nodejs';
export const maxDuration = 60;
export { securedHandler as GET, securedHandler as POST };
