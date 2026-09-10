# Changelog

## 0.8.8-beta.1 — Testing only

- Require libWrapper and replace direct token double-click and Scanner roll-card overrides with MIXED and WRAPPER registrations.
- Keep initial-load AP behavior and chain other handlers for ordinary tokens and native roll cards.
- Use a separate testing manifest with the existing module ID; stable remains 0.8.7.
- Item Piles compatibility needs live-world confirmation.

## 0.8.7

- Declare verified Foundry VTT 12 compatibility to resolve the Compatibility Unknown status.
- Move the emergency Hide All AP's button into the scene title card.

## 0.8.6

- Add a red Hide All AP's emergency button to Scanner controls.
- Clear all discoveries, name reveals, and pulses on the panel's scene, regardless of selection or distance filter. Other scenes are unchanged.

## 0.8.5

- Rename the Scanner roll-card action to Reveal Access Points to Netrunner.
- Give the action a solid green button style with white text, a border, and hover and keyboard-focus feedback.

## 0.8.4

- Keep previous recipients when revealing an AP to another Netrunner. Unchecking removes only the selected Netrunner, preserving access through shared owners.
- Remove UID suffixes from displayed token names and use the selected token name in the reveal heading, with truncation and a full-name tooltip.
- Treat an empty distance filter as zero and narrow the Netrunner dropdown.
- Match AP controls, dynamic labels, and row highlights to the green card; give the selected counter a dark green background.

## 0.8.3

- Show the generic AP icon to players while the AP name is hidden. Revealing the name also reveals the actual token artwork; hiding it restores the generic icon.
- Preserve actual token artwork and the GM view, with regression coverage for switching visibility.

## 0.8.2

- Rename Unassigned NetArch labels to Undefined Scene NetArch.
- Apply saved pulse speed changes to active pulses while preserving their progress and count; expired pulses stay stopped.

## 0.8.1

- Fix AP double-click properties after page reload by installing the handler before initial scene token callbacks are bound.
- Preserve normal container double-click behavior; add a regression test for initial scene loading.

## 0.8.0

- Rename the module to Pneuma's NetArch Scanner.
- Refine Scanner layout with Payouts-style sections, fixed headers and aligned bulk controls.
- Correct selected Netrunner recipients and displayed discovery names.
- Improve AP artwork contrast with one border and a translucent background.
- Default unassigned APs to pure red and enable the player-owned token filter by default.
- Enable appended numbers on AP actor prototype tokens and open AP properties on GM double-click.
- Group reveal style and vision radius settings; disable radius for above-fog mode.
- Remove default audience settings; pulses follow AP visibility.
- Rename the default Actor folder to Pneuma NetArch Scanner and preserve templates moved to other folders.
- Add a settings button to restore missing default AP templates without duplicating existing actors.

## 0.5.0 — Initial development version

- Six reusable AP Actor templates with native token placement and a simplified AP HUD.
- Name, type, NET Architecture association, and shared Architecture colors.
- Native Scanner roll integration and manual GM discovery controls.
- Inline reveal, pulse, and name-visibility checkboxes with matching bulk controls and mixed-state indicators.
- Public and Netrunner-only discoveries, with above-fog artwork or local vision circles.
- Configurable finite-pulse and looping scene controls with independent audience settings; repetition mode is selected inline.
- Automated tests and build validation; live Foundry v12 verification remains pending.
