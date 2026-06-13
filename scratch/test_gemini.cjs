const fs = require('fs');
const path = require('path');

// Load env
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const geminiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const geminiApiKey = geminiKeyMatch ? geminiKeyMatch[1].trim() : null;

if (!geminiApiKey) {
  console.error('GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const systemPrompt = `You are Klaivo. Rewrite this answer more simply. Return valid JSON with exactly this schema:
{
  "simple_version": "2-3 sentences. Plain language. Use an analogy here. The student should feel the fog lift.",
  "what_you_must_know": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "full_answer": "The simplified/expanded explanation.",
  "common_misconceptions": "2-3 sentences."
}

Return ONLY valid JSON.`;

const userMessage = `Topic: Photosynthesis\nMode: understand\nLevel: secondary\nExisting answer:\nPhotosynthesis is a process used by plants and other organisms to convert light energy into chemical energy.\n\nRewrite simpler.`;

const maxTokens = 1000;

async function run() {
  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    );

    console.log('Status:', geminiResponse.status);
    const text = await geminiResponse.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
