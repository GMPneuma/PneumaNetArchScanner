# Design: token-based access points

## Target and scope

Foundry VTT 12 with the Cyberpunk RED Core system. This target is confirmed by the user; runtime compatibility still requires testing.

Use normal Actor and Token documents, placement, movement, artwork, and configuration wherever possible. No journal entries or pages per AP, and no separate AP placement layer. Custom visibility and effects must apply only to module-tagged AP tokens.

This document records the user's design and the first implementation. Features below are written in v0.5.0. Automated and isolated browser checks pass; live Foundry 12 validation remains pending (see validation.md).

## 1. Access point templates

Create reusable template Actors inside an Actor folder named "Pneuma NET Architecture Scanner".

Types: Computer, Camera, Turret, Door Controller, Alarm Panel, and Generic.

Each template has appropriate token artwork and a prepopulated type. Dragging a template onto the scene creates an independently configured AP. Placed AP name, type, and discovery state must not change other APs sharing that template.

Creation is idempotent: preserve templates and GM edits. Templates use the native Cyberpunk RED container Actor data model and createDocuments, with no character skills or inventory. Types classify AP markers; this scope does not simulate cameras, turrets, or door control.

## 2. AP token controls

Keep normal token placement, dragging, and configuration. For AP tokens only, simplify the right-click token HUD by hiding most character/combat controls.

Add an AP configuration action opening a compact form:
- Name, prepopulated from the placed token.
- Type, prepopulated from the template and selected from the template types.
- NET Architecture, selecting an existing system netarch Item.
- Architecture color, shared by APs connected to that Architecture and their pulses.

Retained controls: standard token configuration, plus module Edit AP, Reveal/Hide discovery, and Pulse/Stop actions. Native combat/status/attribute controls are hidden on the AP HUD only. Normal character tokens are unaffected.

## 3. Scanner workflow

When a Netrunner executes the system's Scanner ability, present the GM with discovery controls. Inspect the actual system roll/message flow before choosing the integration point. Avoid opening duplicate dialogs when more than one GM is connected.

The panel provides:
- The scanning Netrunner and check result when available.
- AP names, types, discovery state, and distances from the scanning token.
- Per-row reveal-to-Netrunner, reveal-to-all, pulse-count, pulse-forever, and show-AP-name checkboxes, with an inline Edit button.
- Matching bulk checkboxes and Apply to selected; native mixed-state dashes, with untouched properties preserved.
- A GM-entered radius for choosing nearby APs.
- Reveal and pulse audience controls.

Radius filters the list around the scanning token in scene distance units. Zero lists all APs; Select All then selects every visible AP. Bulk Apply affects selected APs within that filter. This is a GM selection aid, not a fixed Scanner range or an automatic success threshold. Reveal choices replace the current audience and are mutually exclusive. Unchecking hides the AP. Pulse choices are mutually exclusive; unchecking stops the effect. Name visibility is independent and never reveals a hidden AP.

If the scanning Actor has multiple tokens or no usable token location, request a token choice before calculating radius. Do not silently measure from a different character.

The supplied Scanner rule leaves discoveries to GM discretion. Do not introduce automatic DVs, line-of-sight requirements, Architecture content disclosure, or connection rules.

## 4. Manual GM reveal

A GM can right-click an AP token and reveal it through its simplified HUD without running Scanner. Support hiding discovery again.

For a private manual reveal, require a Netrunner recipient unless one has been explicitly selected. Do not guess or silently broaden the audience.

## 5. Global reveal style

Provide a world setting choosing:
- Above fog: show the discovered AP artwork without revealing surrounding terrain.
- Vision circle: expose a small area around the AP.

Provide a separate GM-configured vision-circle radius in scene distance units. Proposed default: 0.5 m on scenes measured in meters, based on the prior workflow. Scanner selection radius and vision-circle radius are distinct settings.

Above-fog token rendering is not a standard token configuration switch and requires a prototype. Do not assume forcing token visibility alone bypasses fog masking.

A normal shared Ambient Light with Provides Vision cannot by itself satisfy private vision circles. Reuse Foundry vision rendering where feasible, but any private vision source must be restricted to authorized clients. Never create a shared light for a private reveal.

Test whether temporary vision leaves explored fog behind. Turning off a source must not be described as erasing already explored terrain; do not globally reset player fog to hide an AP.

## 6. Pulse effect

Provide a visible on-scene pulse centered on discovered APs.

The AP list chooses finite pulses or continuous looping per AP or selection. Number of pulses, pulse duration, and audience remain world settings. The global repetition mode is not needed. HUD/API finite pulses use the configured count.

Provide GM actions to pulse revealed APs and stop active pulses. Pulse must not reveal an undiscovered AP or expose surrounding terrain in above-fog mode.

Finite pulses stop after the configured number of repetitions and uncheck in an open panel. Continuous pulses persist until stopped, with rendering cleaned up on scene changes and token deletion. Late joins and reloads must not restart completed finite pulses.

The animation is a ring expanding and fading around the AP in its Architecture color.

## 7. Audience

Reveal and pulse each support:
- All players, plus GM.
- Only the scanning/selected Netrunner's controlling player(s), plus GM.

Use separate reveal and pulse audience selections so either can be private. Resolve actual user ownership; merely giving a player control of the AP is not an appropriate way to grant discovery.

Pulse audience must be intersected with users who have discovered that AP. An all-player pulse setting must not disclose an AP revealed only to a Netrunner.

Store per-AP discovery and recipient state independently from the shared Actor. Native AP tokens remain hidden and have native sight/light disabled. AP reveal/hide controls update discovery flags; a client-local presentation displays token artwork to permitted viewers. This avoids globally unhiding a private AP. The GM continues to manipulate the native token. Hiding discovery clears its recipients and pulse.

## NET Architecture association and colors

The user's added requirement is implemented as a selector of existing world and embedded netarch Items, referenced by UUID. No extra journal or duplicate Architecture is created. Names and Architecture details remain GM-facing; player labels show AP names. Colors use a stable palette with a GM-editable world override shared by every AP referencing that Architecture. Architecture permissions are not changed.

## Implementation decisions

- Native token documents remain the AP data and GM interaction surface. Player artwork is drawn in Foundry's interface canvas group to avoid fog masking.
- Vision circles use configured PointLightSource instances on each permitted client, inserted through initializeLightSources. No persistent or shared Ambient Light documents are created.
- Completed Scanner roll cards receive source Actor/token/scene/result flags. Only the active GM automatically opens a window; GM chat buttons can reopen it.
- Private recipients are the selected Netrunner's player owners at reveal time, including offline users. Later discoveries add recipients; hiding resets them.
- Finite and looping pulse state stores its start time, duration, audience, and count. Scene teardown removes graphics, light sources, and ticker callbacks.

## Implementation sequence

1. Inspect Foundry 12 token HUD/rendering and the installed Cyberpunk RED Scanner flow and Actor data.
2. Prototype above-fog token presentation and the vision-circle mode with private audiences.
3. Implement template provisioning and the simplified AP HUD.
4. Integrate the GM Scanner selection panel and manual reveal controls.
5. Implement pulse effects, settings, and lifecycle handling.

## Acceptance checks

Use GM, Netrunner-player, and unrelated-player sessions:
- Hidden and undiscovered APs remain concealed.
- Public discovery reaches all players; private discovery reaches only intended recipients.
- Above-fog mode exposes only AP artwork and the intended label.
- Vision circles use the configured radius and obey recipient restrictions.
- An unrelated player receives neither a private marker, private vision, nor a private pulse.
- Finite pulses stop, continuous pulses loop until stopped, and both clean up correctly.
- Reloads, scene changes, moving tokens, and token deletion do not leave stale graphics.
- Individual reveal, all-scene reveal, and radius filtering have clear scopes.
- AP edits do not modify other placed APs or duplicate Actor templates.
- Normal token controls, vision, permissions, and Scanner roll behavior remain intact.

## References

- [Foundry module development](https://foundryvtt.com/article/module-development/)
- [Tokens](https://foundryvtt.com/article/tokens/)
- [Lighting](https://foundryvtt.com/article/lighting/)
