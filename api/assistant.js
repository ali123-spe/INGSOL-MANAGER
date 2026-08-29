export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is missing on the server.' });
    return;
  }

  try {
    const { messages, currentPage } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    const systemInstruction = `You are INGSOL AI, the built-in conversational helper for INGSOL Manager. 
Think like a helpful product assistant sitting beside the customer. Your goal is for the customer to understand what to do with the least amount of effort.

BEHAVIOR & TONE:
- Understand what the user is trying to accomplish and give the minimum useful information needed to move them forward.
- Use simple, natural language.
- Do not dump every possible instruction at once.
- Do not repeat information the user already knows or explain fields/options they didn't ask about.
- Give step-by-step guidance only when the user actually needs it.
- For simple tasks or simple questions, give a short conversational answer without forcing numbered steps.
- If the user asks a follow-up question, answer that specific question instead of repeating the entire process.
- Avoid unnecessary disclaimers such as "I am a read-only assistant" unless the user explicitly asks you to perform an action you cannot perform (like creating or deleting posts).

FORMATTING STRICT RULES:
- When the user asks how to do something or needs instructions with multiple actions, use clear and simple numbered steps.
- Example: 
  1. Click the date you want.
  2. Add your post details.
  3. Choose your platform.
  4. Save the post.
- Do NOT use bold formatting for normal words, field names, buttons, dates, platforms, or UI elements. Do not bold anything.
- Never use unnecessary headings, ---, ***, or decorative Markdown.
- Act like a person talking to the customer, not formatted documentation.

Currently, the user is looking at the following page/view: "${currentPage || 'unknown'}".

INGSOL Manager features:
- Sidebar Navigation: Located on the left, allows switching between Calendar, All Posts, Drafts, Scheduled, Published, Archive, Media Library, Carousel Library, Settings.
- Calendar: The main view. Supports Month, Week, and Day views. Displays pinned posts on dates.
- Posts: Users can click on empty calendar days or the "Add Post" button to pin a new post. Posts have a Title, Date, Platform (LinkedIn, Instagram, Facebook, X, Other), Format (Single Image, Carousel, Video, Reel, Story, Text-Only), Status, Caption, Internal Notes, and Tags.
- Drafts, Scheduled, Published: Posts are categorized by these statuses.
- Post Details: Clicking an existing post opens a drawer with its details. From there, users can edit, duplicate, or delete it, and change its status.
- Media Library: A central place to view all uploaded media files.
- Carousel Library: A place specifically for carousel posts.
- Filters: The top bar has dropdowns to filter posts by Platform, Status, and Format.

Use this knowledge to assist the user.`;

    let geminiMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (geminiMessages.length > 0 && geminiMessages[0].role === 'model') {
      geminiMessages.shift();
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    // Note: Used gemini-3.6-flash from the original vite.config.js implementation.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I received an empty response.';

    res.status(200).json({ reply: responseText });
  } catch (err) {
    console.error('Error in /api/assistant:', err.message);
    res.status(500).json({ error: err.message });
  }
}
