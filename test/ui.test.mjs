import test from "node:test";
import assert from "node:assert/strict";
import { environment, makeScene, makeToken } from "./helpers.mjs";
import { apData } from "../src/scripts/model.js";

globalThis.Application = class {
  static get defaultOptions() { return {}; }
  constructor(options = {}) { this.options = { ...this.constructor.defaultOptions, ...options }; this.element = { find: () => ({ prop: () => {} }) }; }
  render() { this.rendered = true; return this; }
  bringToTop() { assert.ok(this.element[0]?.isConnected, "Cannot raise a window before its element exists"); this.raised = (this.raised ?? 0) + 1; }
  async close() { this.rendered = false; }
};
globalThis.FormApplication = class extends Application { constructor(object, options) { super(options); this.object = object; } };
const { openScanner, ScannerPanel } = await import("../src/scripts/ui.js");

test("right-click selection replaces stale selections from an earlier Scanner window", async () => {
  environment(); const scene = makeScene("manual"); const a = makeToken(scene, "a"), b = makeToken(scene, "b");
  const panel = openScanner({ scene, selected: [a.id] }); panel.radius = 4;
  openScanner({ scene, selected: [b.id] });
  assert.deepEqual([...panel.selected], [b.id]); assert.equal(panel.radius, 0);
  await panel.close();
});
test("a new ambiguous Scanner result does not inherit the last Netrunner", async () => {
  environment(); const scene = makeScene("ambiguous"); const runner = makeToken(scene, "runner", { ap: false });
  const panel = openScanner({ scene, runnerId: runner.id, result: 14 });
  panel.selected.add("old-ap");
  openScanner({ scene, runnerId: "", result: 15 });
  assert.equal(panel.runnerId, ""); assert.equal(panel.selected.size, 0);
  await panel.close();
});
test("bulk Apply excludes checked APs outside the current radius", async () => {
  environment(); const scene = makeScene("radius"); const runner = makeToken(scene, "runner", { ap: false });
  const near = makeToken(scene, "near", { x: 100 }), far = makeToken(scene, "far", { x: 1000 });
  const panel = new ScannerPanel({ scene, runnerId: runner.id, selected: [near.id, far.id] });
  panel.radius = 5; panel.getData(); panel.bulkChanges = { reveal: "all" };
  await panel.handleAction("apply");
  assert.equal(apData(near).discovery.revealed, true);
  assert.equal(apData(far).discovery.revealed, false);
});
test("zero radius allows selecting all scene APs for bulk Apply", async () => {
  environment(); const scene = makeScene("all"); const runner = makeToken(scene, "runner", { ap: false });
  const near = makeToken(scene, "near", { x: 100 }), far = makeToken(scene, "far", { x: 1000 });
  const panel = new ScannerPanel({ scene, runnerId: runner.id }); panel.radius = 0;
  await panel.handleAction("select-visible");
  panel.bulkChanges = { reveal: "all" };
  await panel.handleAction("apply");
  assert.equal(apData(near).discovery.revealed, true);
  assert.equal(apData(far).discovery.revealed, true);
});

test("filtering clears hidden selections permanently without changing AP state", () => {
  environment(); const scene=makeScene(), runner=makeToken(scene,"runner",{ap:false});
  const near=makeToken(scene,"near",{x:100}), far=makeToken(scene,"far",{x:1000});
  apData(far).showName=true; apData(far).discovery={revealed:true,public:true,users:[]};
  apData(far).pulse={loop:true};
  const before=structuredClone(apData(far));
  const panel=new ScannerPanel({scene,runnerId:runner.id,selected:[near.id,far.id]});
  panel.bulkChanges={reveal:"hidden"}; panel.radius=5; panel.getData();
  assert.deepEqual([...panel.selected],[near.id]);
  assert.deepEqual(panel.bulkChanges,{});
  panel.radius=0; panel.getData();
  assert.equal(panel.selected.has(far.id),false);
  assert.deepEqual(apData(far),before);
});

test("opening Scanner waits for a connected window before bringing it to the front", async () => {
  environment(); const scene=makeScene("render-lifecycle");
  const panel=openScanner({scene});
  assert.equal(panel.raised, undefined);
  panel.element[0]={isConnected:true};
  openScanner({scene});
  assert.equal(panel.raised,1);
  panel.element[0].isConnected=false;
  openScanner({scene});
  assert.equal(panel.raised,1);
  await panel.close();
});

test("GM panel embeds a fresh native card without the reopen button", async () => {
  environment(); const scene=makeScene(); let removed=false, calls=0;
  const card={querySelectorAll:selector=>{assert.equal(selector,".pneuma-open-scanner");return [{remove:()=>{removed=true;}}];}};
  const message={visible:true,getHTML:async()=>{calls++;return [card];}};
  game.messages=new Map([["roll",message]]);
  const panel=new ScannerPanel({scene,messageId:"roll",result:14});
  const host={isConnected:true,replaceChildren:value=>{host.card=value;}};
  await panel.renderRollCard({querySelector:()=>host});
  assert.equal(calls,1); assert.equal(host.card,card); assert.equal(removed,true);
  assert.equal(panel.getData().hasRollCard,true);
});

test("late chat rendering cannot overwrite a newer Scanner roll", async () => {
  environment(); const scene=makeScene(); let finish;
  const message={visible:true,getHTML:()=>new Promise(resolve=>{finish=resolve;})};
  game.messages=new Map([["old",message]]);
  const panel=new ScannerPanel({scene,messageId:"old"});
  const host={isConnected:true,replaceChildren:()=>assert.fail("Stale card inserted")};
  const pending=panel.renderRollCard({querySelector:()=>host});
  panel.messageId="new"; finish([{}]); await pending;
});

test("missing or hidden messages show a fallback without rendering their contents", async () => {
  environment(); const scene=makeScene(); game.messages=new Map();
  const panel=new ScannerPanel({scene,messageId:"missing"});
  const host={isConnected:true};
  await panel.renderRollCard({querySelector:()=>host});
  assert.match(host.textContent,/no longer available/);
  game.messages.set("missing",{visible:false,getHTML:()=>assert.fail("Hidden message rendered")});
  await panel.renderRollCard({querySelector:()=>host});
  assert.match(host.textContent,/no longer available/);
});

test("a new Scanner roll replaces the previous card reference", async () => {
  environment(); const scene=makeScene("card-replacement");
  const panel=openScanner({scene,result:14,messageId:"first"});
  openScanner({scene,result:17,messageId:"second"});
  assert.equal(panel.messageId,"second"); assert.equal(panel.result,17);
  openScanner({scene,result:9});
  assert.equal(panel.messageId,null); assert.equal(panel.getData().hasRollCard,false);
  await panel.close();
});

test("Netrunner dropdown filters roles and optionally player ownership, including offline owners", () => {
  environment(); const scene=makeScene();
  const player=makeToken(scene,"player-runner",{ap:false});
  const npc=makeToken(scene,"npc-runner",{ap:false,owners:[]});
  const offline=makeToken(scene,"offline-runner",{ap:false,owners:["offline"]});
  const solo=makeToken(scene,"solo",{ap:false}); solo.actor.items.clear();
  solo.actor.items.set("solo",{id:"solo",type:"role",name:"Solo"});
  const fake=makeToken(scene,"Netrunner",{ap:false}); fake.actor.items.clear();
  fake.actor.items.set("skill",{id:"skill",type:"skill",name:"Netrunner"});
  makeToken(scene,"ap");
  const panel=new ScannerPanel({scene,runnerId:npc.id});
  assert.deepEqual(panel.getData().runners.map(r=>r.id),[player.id,npc.id,offline.id]);
  panel.playerOwnedOnly=true;
  assert.deepEqual(panel.getData().runners.map(r=>r.id),[player.id,offline.id]);
  assert.equal(panel.runnerId,""); assert.equal(panel.runner,null);
  panel.playerOwnedOnly=false;
  assert.ok(panel.getData().runners.some(r=>r.id===npc.id));
});

test("Netrunner list follows token additions and embedded role changes", () => {
  environment(); const scene=makeScene(); const panel=new ScannerPanel({scene});
  assert.equal(panel.getData().runners.length,0);
  const runner=makeToken(scene,"new-runner",{ap:false});
  runner.actor.items.get("netrunner-role").name=" NETRUNNER ";
  assert.equal(panel.getData().runners[0].id,runner.id);
  runner.actor.items.clear();
  assert.equal(panel.getData().runners.length,0);
});

test("Show Reveal to all controls visibility without changing existing discoveries", () => {
  const {values}=environment(); const scene=makeScene(), ap=makeToken(scene);
  apData(ap).discovery={revealed:true,public:true,users:[]};
  const panel=new ScannerPanel({scene,selected:[ap.id]});
  assert.ok(panel.getData().rows[0].controls.some(option=>option.key==="all"));
  panel.bulkChanges={reveal:"all",pulse:"loop"};
  values.set("showRevealAll",false);
  const data=panel.getData();
  assert.equal(data.showRevealAll,false);
  assert.equal(data.rows[0].controls.some(option=>option.key==="all"),false);
  assert.equal(data.bulkControls.some(option=>option.key==="all"),false);
  assert.deepEqual(panel.bulkChanges,{pulse:"loop"});
  assert.equal(apData(ap).discovery.public,true);
  values.set("showRevealAll",true);
  assert.ok(panel.getData().bulkControls.some(option=>option.key==="all"));
});

test("displayed distances and selection filtering share the scene grid measurement", () => {
  environment(); const scene=makeScene(), runner=makeToken(scene,"runner",{ap:false});
  const ap=makeToken(scene,"ap",{x:300,y:400});
  scene.grid.measurePath=()=>({distance:8,euclidean:10});
  const panel=new ScannerPanel({scene,runnerId:runner.id,selected:[ap.id]}); panel.radius=9;
  assert.equal(panel.getData().rows[0].distanceText,"8.0");
  assert.deepEqual(panel.selectedDocuments(),[ap]);
  scene.grid.measurePath=()=>({distance:14,euclidean:10});
  assert.equal(panel.getData().rows[0].visible,false);
  assert.equal(panel.selected.size,0);
});
