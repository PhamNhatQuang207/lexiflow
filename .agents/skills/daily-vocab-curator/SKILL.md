---
name: daily-vocab-curator
description: Daily English vocabulary curator and manager for the LexiFlow web app. Use this skill when the user asks to add new daily words, curate a topic or CEFR level (A1-C1), check their study progress, or update today's Daily Study Plan / Word of the Day on the web app.
---

# Daily Vocab Curator Skill (LexiFlow MCP)

This skill enables any AI agent to manage and update the **LexiFlow** English vocabulary web app (`http://localhost:5173`) in real time.

All changes made through the **LexiFlow MCP Server** (`mcp/lexiflow-mcp-server.mjs`) write to `data/lexiflow-db.json` and hot-sync immediately to the student's open browser tab via `/api/db`.

## Available MCP Tools (and CLI Equivalents)

If the `lexiflow-mcp` MCP server is connected, call these tools directly. You can also invoke them from the terminal via `node mcp/lexiflow-mcp-server.mjs <tool_name> '<json_args>'`:

1. **`get_daily_status`**
   - Inspect total words, due words today, current study streak, word counts across CEFR levels (`A1`, `A2`, `B1`, `B2`, `C1`) and topics (`family`, `work`, `travel`, `daily`, `food`, `feelings`, `study`), plus words the student is currently struggling with.
   - CLI:
     ```bash
     node mcp/lexiflow-mcp-server.mjs get_daily_status
     ```

2. **`list_words`**
   - Filter words by `level` (`A1`–`C1`), `topic`, `status` (`new`, `learning`, `review`, `mastered`), `dueOnly`, or `search`.
   - CLI:
     ```bash
     node mcp/lexiflow-mcp-server.mjs list_words '{"level":"B1","topic":"travel"}'
     ```

3. **`add_words`**
   - Add new vocabulary words with friendly definitions, natural example sentences, IPA phonetics, collocations, and memory tips.
   - CLI:
     ```bash
     node mcp/lexiflow-mcp-server.mjs add_words '{"words":[{"word":"boarding pass","phonetic":"/ˈbɔː.dɪŋ ˌpɑːs/","partOfSpeech":"noun","cefr":"A2","deckId":"travel","definition":"A card or ticket that a passenger must show before getting on an airplane.","example":"Please keep your passport and boarding pass ready at the gate.","synonyms":["flight ticket"],"collocations":["print a boarding pass","mobile boarding pass"],"mnemonic":"The pass that lets you board the plane."}]}'
     ```

4. **`update_word`**
   - Edit an existing word's definition, example, level, topic, or reschedule its SRS `dueDate` / `srsStatus`.
   - CLI:
     ```bash
     node mcp/lexiflow-mcp-server.mjs update_word '{"wordLookup":"itinerary","updates":{"bookmarked":true}}'
     ```

5. **`delete_words`**
   - Remove words by `ids` or headwords (`words`).

6. **`manage_topic`**
   - Create or update a topic set (`id`, `name`, `subtitle`, `description`, `category`, `accentColor`).

7. **`publish_daily_briefing`**
   - Update the **Today's Study Plan & Word of the Day** card at the top of the student's web app.
   - CLI:
     ```bash
     node mcp/lexiflow-mcp-server.mjs publish_daily_briefing '{"title":"Today'\''s Study Plan: Travel & Airport English","message":"We added new A2 & B1 travel words for you today. Practice saying the examples out loud!","focusLevel":"B1","focusDeckId":"travel","wordOfTheDay":"itinerary"}'
     ```

## Daily Routine Workflow for the Agent

When asked to prepare or update the web app for today's English session:
1. Run `get_daily_status` to check the student's streak, due count, and struggling words.
2. Add 3–5 fresh, practical words (`add_words`) tailored to the student's requested CEFR level (`A1`–`C1`) and everyday topic—always using clear, non-academic definitions and natural conversational examples.
3. Call `publish_daily_briefing` with an encouraging daily note, a recommended focus level/topic, and a featured `wordOfTheDay`.
