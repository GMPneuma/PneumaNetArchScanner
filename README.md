# Pneuma's NetArch Scanner

## Testing build: 0.8.8-beta.1

This branch requires **libWrapper** and uses its registrations for AP double-clicks and native Scanner roll cards. It is intended for compatibility testing with Item Piles; the reported conflict has not yet been reproduced in a live world.

Install through the testing manifest listed below and enable libWrapper. The beta uses the same module ID as stable: it replaces the installed code and keeps existing settings and APs. It does not run alongside stable.

To return to stable, reinstall using https://github.com/GMPneuma/PneumaNetArchScanner/releases/latest/download/module.json (Foundry may require uninstalling the beta module first to downgrade; keep the world and its data). Testing updates follow the testing manifest; stable users remain on the stable manifest.

Suggested checks: reload with Item Piles enabled; double-click an AP to open AP properties; double-click an Item Pile to open its normal interface; double-click an ordinary token; roll Scanner and use its reveal button. Report any conflict warning with Foundry, Cyberpunk RED, Item Piles, and libWrapper versions.

Access point tokens and GM discovery controls for **Foundry VTT 12 + Cyberpunk RED Core**.

Version **0.5.0**, first public release. Automated and isolated browser checks pass; a live Foundry v12 world test is still required. The manifest targets Foundry 12; live Foundry verification remains pending.

## Installation

Install using this manifest URL: https://raw.githubusercontent.com/GMPneuma/PneumaNetArchScanner/testing/module.json

For manual installation, copy `dist/pneuma-net-arch-scanner/` into your Foundry user data `Data/modules/` directory. Restart Foundry if needed, then enable **Pneuma's NetArch Scanner** in a Cyberpunk RED world.

The first active GM automatically receives an Actor folder named **Pneuma NetArch Scanner**, containing six reusable templates: **Computer, Camera, Turret, Door Controller, and Alarm Panel**.

Templates use the system's native container Actor type. Existing templates and GM edits are preserved; missing templates are recreated on a later GM startup.

## Prepare a scene

1. Drag a template Actor onto the map. Each placed AP starts undiscovered.
2. Right-click the AP and choose **Edit access point**.
3. Set its **Name**, **Type**, and optional **NET Architecture**.
4. Choose an Architecture color. Every AP linked to that Architecture uses the same color, including pulse rings.

The Architecture list includes world NET Architecture Items and embedded Architecture Items. Import compendium-only Architectures into the world first. Linking an Architecture does not share its contents or change its permissions. Players see AP names; the GM's list also shows the linked Architecture.

APs retain native token placement, movement, and configuration. Their HUD replaces character/combat actions with AP editing, reveal, hide, pulse, and stop controls. Changing a built-in type updates its icon; custom artwork is preserved.

## Use Scanner

When a Netrunner completes the system's **Scanner** ability roll, the active GM gets a discovery window. The normal roll, modifiers, critical handling, and chat card remain unchanged. The GM window includes a fresh rendering of that original chat card, including dice, modifiers, and total. Reopening from chat restores the corresponding card; a new Scanner roll replaces it. GM chat cards gain **Manage Scanner discoveries** to reopen the controls.

The GM can also open the window from the broadcast icon on the token toolbar or by right-clicking an AP and choosing **Reveal access point**.

- Select the Netrunner token for distances and private recipients. Only scene tokens with an embedded Netrunner role appear. Enable Show only player-owned tokens to exclude NPCs without a non-GM owner; offline player owners are included. Ambiguous origins require a choice.
- Set a **Selection radius** in scene units. Zero lists all APs. Distance follows the scene’s grid rules, center-to-center; this is a selection aid, not a Scanner rules limit.
- Each AP has an inline Edit button and five checkboxes: **Reveal to Netrunner**, **Reveal to all**, **Pulse N times**, **Pulse forever**, and **Show AP name**. Row changes apply immediately.
- Reveal options are mutually exclusive; unchecking the active reveal hides the AP and stops its pulse. Pulse options are mutually exclusive; unchecking stops the pulse.
- Tick APs or use **Select All Shown**, adjust the matching checkboxes in **Apply to selected**, then click **Apply**. A dash indicates mixed states. Untouched reveal or pulse options remain unchanged.
- To affect every AP, set radius to zero and choose **Select All Shown**. Bulk operations affect only selected APs within the current filter.

Only one active GM automatically gets the window for a new roll. Other GMs can open it manually. No automatic detection DV, connection range, or Architecture-content disclosure is added.

## Visibility, audiences, and pulses

| World setting | Behavior |
| --- | --- |
| AP reveal style | AP artwork above fog, or a small vision circle around the AP |
| Vision-circle radius | Defaults to 0.5 scene units: half a meter on a meter-based scene |
| Default Scanner selection radius | Initial filter in the GM window; separate from the vision radius |
| Default reveal audience | All players, or selected Netrunner's player owners; GM always included |
| Default pulse audience | Independently choose all players or Netrunner owners, plus GM |
| Pulse when revealing | Automatically start a pulse on reveal |
| Number of pulses | Finite pulse count (1–20), reflected in row and bulk labels |
| Seconds per pulse | Defaults to 1.4 seconds; repetition is chosen in the AP list |
| Open GM controls after a Scanner roll | Enable or disable the automatic GM window |

The Scanner window sets the reveal audience directly and uses the configured pulse audience. Private actions require a selected Netrunner with player ownership; offline owners are included. Pulses only appear to users who have discovered the AP, even if the pulse audience is everyone. Reveal and pulse can be applied together; starting a pulse alone requires every selected AP to be revealed.

Scanner checkbox changes replace the reveal audience, so switching from all players to Netrunner immediately makes the AP private. The macro reveal API retains its additive behavior for compatibility. Default reveal audience and automatic pulse settings apply to that API; HUD/API finite pulses use the configured count. The Scanner checkboxes use Number of pulses from the module settings or start a loop. Labels update to match the count; already-running pulses retain their original count. Finished finite pulses automatically uncheck in an open Scanner window.

**Show AP name** is a separate checkbox in each row and the bulk controls. New APs start with player labels off; the GM can still see their names. Enabling a name only displays it to the AP's permitted viewers and never reveals a hidden AP. Existing APs retain their previous label preference until changed. The former global name-label setting is replaced by these controls.

Finite pulses retain their start time and do not restart after a reload. Continuous pulses resume when the scene is viewed again until stopped. Hiding an AP stops its pulse.

Above-fog mode does not uncover terrain. Vision-circle mode uses client-local Foundry light sources with vision enabled and walls respected. Sources exist only for permitted viewers; there are no shared Ambient Light documents. As with normal Foundry vision, explored terrain may remain in fog history after a circle is removed.

**Use the AP reveal/hide controls to manage discoveries.** Native AP tokens remain hidden and have native sight/light disabled; the module shows their artwork to permitted viewers. This keeps tokens concealed if the module is disabled. The native Hidden checkbox and token light settings are not discovery controls.

## Development

Node.js 22 or newer. Build and automated tests require no package dependencies.

```sh
npm run check
npm test
npm run build
```

The build validates the manifest, imports, and assets, then replaces only its own generated `dist/pneuma-net-arch-scanner/` folder. Do not store custom files in that output folder.

There are no runtime module dependencies. The implementation uses Foundry's Actor, Token, Application, FormApplication, PIXI, and light-source APIs. Scanner integration decorates `CPRChat.RenderRollCard` after the native result is created; this entry point was checked against Cyberpunk RED v0.92.4 source.

GM macro entry point:

```js
const scanner = game.modules.get("pneuma-net-arch-scanner").api;
scanner.openScanner();
// Also available: edit(tokenDocument), reveal(documents, options),
// hide(documents), pulse(documents, options), stopPulses(documents), ensureTemplates().
```

See [design notes](docs/design.md) and [validation and in-world checks](docs/validation.md).



Generic APs use the broadcast logo without identifying the device. Select All Shown / Clear Selection apply to the filtered list. APs removed by the radius filter lose their selection, while their reveal, pulse, and name settings remain unchanged.

Generic artwork: Font Awesome Free 6.7.2 by Fonticons, Inc., https://fontawesome.com (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/). The tower-broadcast SVG is recolored white for Architecture tinting.

## Scene color and AP types

For a scene with one network, leave APs **Undefined Scene NetArch** and set **Undefined Scene NetArch Color** in the Scanner window. This color belongs only to that scene and applies to its unassigned markers, pulses, and list swatches. APs assigned to a NET Architecture retain that Architecture's color. No NET Architecture item is required for the unassigned color.

Under **Configure Settings → Pneuma's NetArch Scanner → Manage Types**, the GM can add and rename types, choose image files, and enable or disable types. New enabled types receive template Actors. Existing placed APs and edited Actor templates are preserved. Disabled types remain valid on existing APs but are excluded from new assignments.
Enable **Show 'Reveal to all' option** in module settings to display that column and its bulk checkbox; disable it to hide them. Existing discoveries remain unchanged.
