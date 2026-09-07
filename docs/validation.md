# Validation and remaining in-world checks

## Completed checks

- 69 automated tests pass, including checkbox audience replacement, mixed bulk states, unchanged-property preservation, per-AP name controls, configured pulse-count labels and expiration, atomic validation, and existing discovery, Scanner, template, and presentation coverage.
- JavaScript syntax, relative imports, manifest identity/version/Foundry target, templates, and all six SVG asset references pass validation.
- Source and built module payloads pass the same validation.
- An isolated browser harness exercised the actual module forms and PIXI 7.4.3 artwork/pulse rendering. It checked radius filtering, selected-only updates, private recipients, Name/Type/Architecture edits, HTML escaping, stale-selection replacement, finite pulse completion, continuous looping, and exclusion of an unrelated player.
- Screenshots of the GM forms and player pulse display were inspected for layout and rendering.

These checks use test doubles for Foundry documents and the light-source manager. The browser harness is not a running Foundry world. Neither those tests nor the version target constitute verification of live Foundry fog rendering.

## Source compatibility evidence

- Local Cyberpunk RED development checkout with a Foundry 12 manifest: `4caab3a75`.
- Public Cyberpunk RED `v0.92.4` `src/modules/chat/cpr-chat.js`: `CPRChat.RenderRollCard` returns the created ChatMessage and preserves the native roll pipeline.
- The system's Cyberdeck interface roll sets `ability` to the canonical ability identifier, including `scanner`, and records Actor and Token context in `entityData`.
- Foundry 12 type declarations: `InterfaceCanvasGroup` is above other canvas groups; `initializeLightSources` allows module-managed sources; the configured PointLightSource accepts `sourceId`, vision/radius data, and the initialize/add/destroy lifecycle.

The installed local Foundry data contains Cyberpunk RED v0.88.2 targeting Foundry 11, so it was not used as a v12 runtime test environment. No live world data was modified.

## Foundry 12 acceptance pass

Use a GM, a Netrunner player, and an unrelated player in the same test scene. Enable normal token vision and fog exploration.

1. Enable the module and confirm one Actor folder and six AP templates. Reload as GM; confirm no duplicates and preserve an edited template name.
2. Drag each template onto the scene. Confirm only the GM sees undiscovered APs. Check native movement/configuration and the AP-only HUD. Ordinary character HUDs must remain unchanged.
3. Edit one AP's name/type and assign an existing NET Architecture. Assign another AP to the same Architecture and change its color. Confirm matching colors, independent names/types, and unchanged Item permissions.
4. Roll Scanner from the normal Cyberpunk RED sheet. Confirm the normal roll result and chat card, one automatic GM window, the correct Actor/token origin, and a working GM chat button.
5. Select a radius and reveal one nearby AP using its checkbox. Confirm other APs stay hidden. Select several APs, confirm mixed-state dashes, and use Apply to selected. Confirm filtered-out APs and untouched reveal/pulse properties remain unchanged. Set radius to zero and select all to affect the whole scene.
6. With above-fog mode, reveal an AP in unexplored terrain. Confirm permitted players see its artwork and label while the terrain, neighboring tokens, and Architecture contents remain concealed.
7. Hide that AP and privately reveal it to the Netrunner. Confirm the unrelated player sees no marker or pulse, including after reloading, changing token selection, and switching scenes.
8. Switch to vision-circle mode with a 0.5 m radius. Confirm the circle's true radius, wall handling, light behavior, and recipient isolation. Check the behavior with no controlled player token and with different token vision modes.
9. Hide or delete the AP; confirm its live circle is removed without resetting unrelated exploration. Previously explored terrain may remain explored, matching normal Foundry behavior.
10. Pulse a public AP privately, and a private AP with the all-player pulse setting. Confirm the pulse is limited by both audiences.
11. Verify the configured pulse count, automatic checkbox reset, name visibility, and stop behavior. Reload after finite pulses finish; they must not restart. Verify continuous loops across scene changes and that Hide/Stop ends them.
12. Move, rotate, resize, and delete an AP; confirm artwork and local light sources do not remain at old positions. Check gridless and non-default scene distances if used in play.
13. Open two GM sessions and roll Scanner. Confirm only the active GM automatically receives the window; the other GM can use the chat button.
14. Disable the module in a test world and confirm the underlying AP tokens stay hidden from players.

Record the exact Foundry and Cyberpunk RED versions and any active vision/HUD modules when reporting a failure.



- Scanner card preview: tested message identity, native getHTML rendering, listener retention in an isolated browser, missing/invisible messages, and stale asynchronous results. Live system styling still requires Foundry 12 verification.
- Renderer API reference: https://foundryvtt.com/api/v12/classes/client.ChatMessage.html#getHTML

- Isolated browser checks cover scene-color saving and swatches, adding/saving a custom type, provisioning its template, and disabling it. Unit tests cover per-scene isolation, assigned Architecture precedence, permissions, and disabled-type preservation.

- Grid measurement delegates to Foundry 12 Scene.grid.measurePath; tested consistent display/filter behavior and native token centers. API: https://foundryvtt.com/api/v12/classes/foundry.grid.BaseGrid.html#measurePath
