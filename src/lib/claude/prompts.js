export function buildSystemPrompt() {
  return `You are a helpful assistant that analyzes movie content to help people decide if a film is appropriate to watch with their grandmother. You always respond with valid JSON only — no markdown, no preamble, no code fences.`
}

/**
 * Step 1 / Step 2: IMDb Parent's Guide Sex & Nudity → structured JSON.
 * @param {string} movieTitle
 */
export function buildUserPrompt(movieTitle) {
  return `Search IMDb's Parent's Guide for the movie "${movieTitle}".
Find the "Sex & Nudity" section specifically (user-submitted parental guide entries on IMDb).

Then return a JSON object with exactly these fields:
{
  "movie_title": "official title as found on IMDb",
  "imdb_severity": "None | Mild | Moderate | Severe",
  "grandma_score": <integer 1-10, where 10 = totally fine, 1 = absolutely not>,
  "grandma_safe": <true if score >= 7, false otherwise>,
  "content_flags": <array from: "kissing", "making_out", "implied_sex", "sex_scene", "prolonged_sex_scene", "nudity_brief", "nudity_extensive", "suggestive_dialogue", "none">,
  "longest_scene_estimate": "none | brief | under 1 min | 1-3 min | extended (3+ min)",
  "raw_descriptions": <array of the actual verbatim user-submitted descriptions from IMDb Parent's Guide Sex & Nudity section>,
  "summary": "<one plain-English sentence describing what's in the movie sexually>",
  "verdict": "<funny, opinionated — grandma-voice or worried grandchild voice — 1-2 sentences>",
  "movie_found": <true/false>
}

Scoring guide:
- 10: Nothing. A handshake. A peck on the cheek.
- 8-9: Some kissing, maybe a make-out. Grandma has seen worse.
- 6-7: Implied sex or fade-to-black. She'll suspect something.
- 4-5: Brief nudity or a short sex scene. She may shift uncomfortably.
- 2-3: Prolonged sex scene or significant nudity. You will both pretend it's not happening.
- 1: Do not do this to your grandmother.

If you cannot find the Parent's Guide or the Sex & Nudity section, set movie_found to false, raw_descriptions to [], and explain in summary. Still return valid JSON only.`
}
