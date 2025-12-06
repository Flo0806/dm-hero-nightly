---
"@dm-hero/app": minor
---

feat(ai): enhance DALL-E prompts with structured entity data and safety-filter handling

- Add structured entity data support for richer DALL-E prompts (NPC, Location, Item, Faction, Player, Session)
- Change default style from fantasy-art to realistic with anti-3D/CGI instructions
- Add 16:9 format (1792x1024) for session cover images
- Add GPT-4 safety-filter-friendly rephrasing for session prompts
- Add custom description field for session cover image generation
- Add meaningful error messages for safety filter rejections
- Add unsaved changes warning for image generation across all entity dialogs
- Disable dialog buttons during image generation
