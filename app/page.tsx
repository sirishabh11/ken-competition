export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>Mealyn Gnani adapter</h1>
      <p>MCP endpoint: <code>/api/mcp</code></p>
      <p>Tools: <code>gnani_transcribe_audio</code> and <code>gnani_speak_text</code>.</p>
    </main>
  );
}
