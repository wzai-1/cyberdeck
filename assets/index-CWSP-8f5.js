var W=Object.defineProperty;var K=(t,e,a)=>e in t?W(t,e,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[e]=a;var u=(t,e,a)=>K(t,typeof e!="symbol"?e+"":e,a);import{A as q}from"./pixi-BgKmFI53.js";import{l as X,c as j,d as J,e as Q,f as Z,h as ee,s as te,i as ne,j as O,k as ae,m as _,p as H,n as ie,o as oe,C as se,q as re,r as le,u as ce,t as de,v as pe,w as B,x as ue,y as he,z as me,A as fe,D as ye}from"./game-D20Lkny5.js";import{M as ge,S as xe,a as be,G as ve,C as we,b as Ce,s as Se,l as Te}from"./ui-BDTs_LsS.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function a(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=a(i);fetch(i.href,o)}})();const D="cyberdeck_tutorial_v2";class Ee{constructor(e={}){u(this,"el",null);u(this,"spotlight",null);u(this,"textBox",null);u(this,"arrowEl",null);u(this,"tapHint",null);u(this,"steps",[]);u(this,"currentStep",0);u(this,"active",!1);u(this,"autoTimer",null);u(this,"callbacks");this.callbacks=e,this.buildSteps()}get isActive(){return this.active}start(){this.isDone()||(this.active=!0,this.currentStep=0,this.buildOverlay(),this.showStep(0))}onCardPlayed(){if(!this.active)return!1;const e=this.steps[this.currentStep];return e&&e.id==="highlight_hand"&&this.advance(),!1}onEndTurn(){if(!this.active)return!1;const e=this.steps[this.currentStep];return e&&e.id==="highlight_endturn"&&this.advance(),!1}onEnemyAttacked(){if(!this.active)return;const e=this.steps[this.currentStep];e?.id,e?.id==="enemy_attacked"&&this.advance()}hide(){this.autoTimer&&(clearTimeout(this.autoTimer),this.autoTimer=null),this.el&&this.el.parentNode&&this.el.parentNode.removeChild(this.el),this.el=null,this.active=!1}buildSteps(){this.steps=[{id:"highlight_hand",message:"YOUR CARDS — Click one to play it",hint:"[click a card to continue]",waitForAction:!0,getSpotlight:()=>{const e=window.innerWidth,a=window.innerHeight;return{x:e*.08,y:a*.62,w:e*.84,h:a*.3}}},{id:"card_played",message:"Nice! Attack cards deal damage to enemies",hint:"",waitForAction:!1,autoAdvanceMs:1800,getSpotlight:void 0},{id:"highlight_intent",message:"ENEMY INTENT — See what they plan to do next",hint:"[tap to continue]",waitForAction:!1,getSpotlight:()=>{const e=window.innerWidth,a=window.innerHeight;return{x:e*.3,y:a*.38,w:e*.4,h:a*.11}}},{id:"highlight_mana",message:"MANA ◆ — Each card costs diamonds to play",hint:"[tap to continue]",waitForAction:!1,getSpotlight:()=>{const e=window.innerWidth,a=window.innerHeight;return{x:e*.36,y:a*.49,w:e*.28,h:a*.065}}},{id:"highlight_endturn",message:"END TURN — Click when done. Enemy will then attack!",hint:"[click END TURN to continue]",waitForAction:!0,getSpotlight:()=>{const e=window.innerWidth,a=window.innerHeight;return{x:e-200,y:a*.8,w:175,h:55}}},{id:"enemy_attacked",message:"Enemy attacked! Block cards reduce incoming damage",hint:"",waitForAction:!1,autoAdvanceMs:2200,getSpotlight:void 0},{id:"complete",message:"You got it! HACK THE WORLD ▶",hint:"",waitForAction:!1,autoAdvanceMs:2e3,getSpotlight:void 0}]}buildOverlay(){if(this.el)return;const e=document.createElement("div");e.id="tutorial-overlay",e.style.cssText=`
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 7500;
    `;const a=document.createElement("div");a.id="tutorial-spotlight",a.style.cssText=`
      position: absolute;
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.72);
      pointer-events: none;
      transition: left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
    `,e.appendChild(a);const s=document.createElement("div");s.id="tutorial-arrow",s.style.cssText=`
      position: absolute;
      color: #00ffcc;
      font-size: 28px;
      pointer-events: none;
      text-shadow: 0 0 14px #00ffcc;
      transition: left 0.3s ease, top 0.3s ease;
    `,s.textContent="▼",e.appendChild(s);const i=document.createElement("div");i.id="tutorial-textbox",i.style.cssText=`
      position: absolute;
      background: rgba(4, 12, 22, 0.97);
      border: 2px solid #00ffcc;
      border-radius: 12px;
      padding: 14px 22px;
      color: #00ffcc;
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 1px;
      max-width: 420px;
      box-shadow: 0 0 30px rgba(0, 255, 204, 0.35);
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
    `;const o=document.createElement("div");o.id="tutorial-msg",i.appendChild(o);const l=document.createElement("div");l.id="tutorial-hint",l.style.cssText=`
      font-size: 11px;
      color: #336655;
      margin-top: 8px;
      letter-spacing: 2px;
    `,i.appendChild(l);const r=document.createElement("button");r.textContent="[SKIP TUTORIAL]",r.style.cssText=`
      display: block;
      margin-top: 10px;
      background: none;
      border: 1px solid #223344;
      color: #334455;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 1px;
    `,r.style.pointerEvents="auto",r.addEventListener("click",c=>{c.stopPropagation(),this.complete()}),i.appendChild(r),e.appendChild(i),document.body.appendChild(e),this.el=e,this.spotlight=a,this.textBox=i,this.arrowEl=s,this.tapHint=l,i.addEventListener("click",()=>{const c=this.steps[this.currentStep];!c||c.waitForAction||c.autoAdvanceMs||this.advance()})}showStep(e){if(this.autoTimer&&(clearTimeout(this.autoTimer),this.autoTimer=null),!this.el||!this.spotlight||!this.textBox||!this.arrowEl||!this.tapHint)return;if(e>=this.steps.length){this.complete();return}const a=this.steps[e],s=document.getElementById("tutorial-msg");s&&(s.textContent=a.message),this.tapHint.textContent=a.hint;const i=a.getSpotlight?.(),o=window.innerWidth,l=window.innerHeight;if(i){this.spotlight.style.display="block",this.spotlight.style.left=`${i.x}px`,this.spotlight.style.top=`${i.y}px`,this.spotlight.style.width=`${i.w}px`,this.spotlight.style.height=`${i.h}px`,this.arrowEl.style.display="block";const r=i.x+i.w*.5-14,c=i.y-38;this.arrowEl.style.left=`${Math.max(8,Math.min(o-30,r))}px`,this.arrowEl.style.top=`${Math.max(8,c)}px`;const w=i.y+i.h+16,Y=Math.max(8,Math.min(o-440,i.x+i.w*.5-210));this.textBox.style.left=`${Y}px`,this.textBox.style.top=w+120>l?`${Math.max(8,i.y-160)}px`:`${w}px`}else this.spotlight.style.display="none",this.arrowEl.style.display="none",this.textBox.style.left=`${o*.5-210}px`,this.textBox.style.top=`${l*.45}px`;a.autoAdvanceMs&&(this.autoTimer=setTimeout(()=>{this.advance()},a.autoAdvanceMs))}advance(){this.currentStep+=1,this.currentStep>=this.steps.length?this.complete():this.showStep(this.currentStep)}complete(){this.markDone(),this.el?(this.el.style.transition="opacity 0.5s ease",this.el.style.opacity="0",setTimeout(()=>{this.hide()},550)):this.hide(),this.callbacks.onComplete?.()}isDone(){try{return localStorage.getItem(D)==="done"}catch{return!1}}markDone(){try{localStorage.setItem(D,"done")}catch{}}}class ke{constructor(){u(this,"ctx",null);u(this,"masterGain",null);u(this,"sfxGain",null);try{this.ctx=new AudioContext,this.masterGain=this.ctx.createGain(),this.sfxGain=this.ctx.createGain(),this.sfxGain.connect(this.masterGain),this.masterGain.connect(this.ctx.destination),this.masterGain.gain.value=.6,this.sfxGain.gain.value=.8}catch{this.ctx=null}}isAvailable(){return this.ctx!==null}setMasterVolume(e){this.masterGain&&(this.masterGain.gain.value=Math.max(0,Math.min(1,e)))}setSfxVolume(e){this.sfxGain&&(this.sfxGain.gain.value=Math.max(0,Math.min(1,e)))}applySettings(e){this.setMasterVolume(e.masterVolume),this.setSfxVolume(e.sfxVolume)}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}play(e){!this.ctx||!this.sfxGain||Re[e]?.(this.ctx,this.sfxGain)}cardPlay(){this.play("cardPlay")}cardHover(){this.play("cardHover")}dealDamage(){this.play("dealDamage")}gainShield(){this.play("gainShield")}playerHurt(){this.play("playerHurt")}victory(){this.play("victory")}defeat(){this.play("defeat")}buttonClick(){this.play("buttonClick")}phaseChange(){this.play("phaseChange")}}function m(t,e,a,s,i,o,l){const r=t.createGain();r.connect(e),r.gain.setValueAtTime(i,t.currentTime),r.gain.exponentialRampToValueAtTime(.001,t.currentTime+o);const c=t.createOscillator();c.type=a,c.frequency.setValueAtTime(s,t.currentTime),l!==void 0&&c.frequency.exponentialRampToValueAtTime(l,t.currentTime+o),c.connect(r),c.start(t.currentTime),c.stop(t.currentTime+o)}function Ae(t,e,a,s){const i=Math.ceil(t.sampleRate*s),o=t.createBuffer(1,i,t.sampleRate),l=o.getChannelData(0);for(let w=0;w<i;w++)l[w]=Math.random()*2-1;const r=t.createBufferSource();r.buffer=o;const c=t.createGain();c.gain.setValueAtTime(a,t.currentTime),c.gain.exponentialRampToValueAtTime(.001,t.currentTime+s),r.connect(c),c.connect(e),r.start(t.currentTime)}const Re={cardPlay(t,e){m(t,e,"sine",220,.3,.1,440)},cardHover(t,e){m(t,e,"sine",880,.06,.05)},dealDamage(t,e){m(t,e,"sawtooth",100,.5,.15,40),m(t,e,"square",80,.2,.15,30)},gainShield(t,e){m(t,e,"triangle",1200,.25,.1,800)},playerHurt(t,e){Ae(t,e,.6,.2),m(t,e,"sawtooth",120,.4,.2,60)},victory(t,e){[261.63,329.63,392,523.25].forEach((s,i)=>{const o=t.createGain();o.connect(e);const l=t.currentTime+i*.12;o.gain.setValueAtTime(0,l),o.gain.linearRampToValueAtTime(.3,l+.02),o.gain.exponentialRampToValueAtTime(.001,l+.22);const r=t.createOscillator();r.type="sine",r.frequency.value=s,r.connect(o),r.start(l),r.stop(l+.25)})},defeat(t,e){m(t,e,"sawtooth",180,.5,.5,40),m(t,e,"square",90,.25,.5,20)},buttonClick(t,e){m(t,e,"sine",600,.2,.08,400)},phaseChange(t,e){m(t,e,"sine",220,.3,.4,440),m(t,e,"sine",330,.2,.4,660),m(t,e,"triangle",110,.4,.4,220)}},g=new q({resizeTo:window,backgroundAlpha:0}),I=document.getElementById("app");I&&I.appendChild(g.view);document.addEventListener("visibilitychange",()=>{document.hidden?g.ticker.stop():g.ticker.start()});function Le(){const t=document.createElement("div");t.style.cssText=`
    position: fixed; top: 0; left: 0; right: 0;
    background: rgba(4,10,20,0.95);
    border-bottom: 2px solid #ffaa00;
    color: #ffaa00;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    text-align: center;
    padding: 10px 16px;
    z-index: 9500;
    letter-spacing: 2px;
  `,t.textContent="⚠ BEST EXPERIENCED ON DESKTOP — tap to dismiss",t.addEventListener("click",()=>{t.parentNode&&t.parentNode.removeChild(t)}),document.body.appendChild(t)}/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)&&Le();window.addEventListener("error",t=>{if(document.getElementById("system-error-screen"))return;const a=document.createElement("div");a.id="system-error-screen",a.style.cssText=`
    position: fixed; inset: 0;
    background: #050008;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    z-index: 99999;
    color: #ff0044;
  `,a.innerHTML=`
    <div style="font-size:36px;font-weight:bold;letter-spacing:4px;margin-bottom:18px">SYSTEM ERROR</div>
    <div style="font-size:13px;color:#884455;margin-bottom:28px;max-width:480px;text-align:center">${t.message??"UNKNOWN FAULT"}</div>
    <button onclick="location.reload()" style="
      background:#0a0012; border:2px solid #ff0044; color:#ff0044;
      font-family:'Courier New',monospace; font-size:16px; font-weight:bold;
      padding:12px 32px; cursor:pointer; border-radius:8px; letter-spacing:2px;
    ">[ RESTART ]</button>
  `,document.body.appendChild(a)});const v=new Ee({onComplete:()=>{}}),d=new ke;let T=X();document.addEventListener("pointerdown",()=>d.resume(),{once:!0});const A="cyberdeck_save";function Me(){try{return localStorage.getItem(A)!==null}catch{return!1}}function y(t){try{localStorage.setItem(A,JSON.stringify(t))}catch{}}function Ne(){try{const t=localStorage.getItem(A);return t?JSON.parse(t):null}catch{return null}}function R(){try{localStorage.removeItem(A)}catch{}}let n,b=0,z=0,G=0,x=!1;function C(t){const e=le(T,n,t);for(const a of e){const s=ce(T,a);if(s.newlyUnlocked){T=s.achievements,de(T);const i=T.find(o=>o.id===a);i&&De(i)}}}function De(t){const e=document.createElement("div");e.style.cssText=`
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(4,12,22,0.97);
    border: 2px solid #ffaa00;
    border-radius: 10px;
    padding: 12px 18px;
    color: #ffaa00;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 9999;
    box-shadow: 0 0 20px rgba(255,170,0,0.4);
    transform: translateX(120%);
    transition: transform 0.35s ease;
    max-width: 280px;
  `,e.innerHTML=`
    <div style="font-size:10px;color:#665500;margin-bottom:4px">ACHIEVEMENT UNLOCKED</div>
    <div style="font-weight:bold">${t.name}</div>
    <div style="font-size:11px;color:#886600;margin-top:2px">${t.description}</div>
  `,document.body.appendChild(e),requestAnimationFrame(()=>{e.style.transform="translateX(0)"}),setTimeout(()=>{e.style.transition="transform 0.4s ease, opacity 0.4s ease",e.style.transform="translateX(120%)",e.style.opacity="0",setTimeout(()=>{document.body.contains(e)&&document.body.removeChild(e)},450)},3500)}function Ie(){if(x)return;x=!0;const t=document.createElement("div");t.id="pause-overlay",t.style.cssText=`
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.78);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 8000;
    font-family: 'Courier New', monospace;
  `;const e=document.createElement("div");e.style.cssText=`
    background: rgba(5,17,26,0.98);
    border: 2px solid #00ffcc;
    border-radius: 14px;
    padding: 32px 48px;
    text-align: center;
    box-shadow: 0 0 40px rgba(0,255,204,0.3);
    min-width: 280px;
  `;const a=document.createElement("div");a.textContent="// PAUSED //",a.style.cssText="color: #00ffcc; font-size: 22px; font-weight: bold; margin-bottom: 24px; letter-spacing: 4px;",e.appendChild(a);const s=(i,o,l)=>{const r=document.createElement("button");r.textContent=i,r.style.cssText=`
      display: block; width: 100%; margin: 8px 0;
      background: rgba(5,17,26,0.9);
      border: 2px solid ${o}; border-radius: 8px;
      color: ${o}; font-family: 'Courier New', monospace;
      font-size: 15px; font-weight: bold; cursor: pointer;
      padding: 10px 0; letter-spacing: 2px;
    `,r.addEventListener("click",l),e.appendChild(r)};s("[ RESUME ]","#00ffcc",()=>{document.body.removeChild(t),x=!1}),s("[ SETTINGS ]","#ffaa00",()=>{document.body.removeChild(t),x=!1,L.show()}),s("[ ABANDON RUN ]","#ff4466",()=>{document.body.removeChild(t),x=!1,R(),p("main_menu"),E.render()}),s("[ MAIN MENU ]","#aa66ff",()=>{document.body.removeChild(t),x=!1,y(n),p("main_menu"),E.render()}),t.appendChild(e),document.body.appendChild(t),d.buttonClick()}window.addEventListener("keydown",t=>{if(x){if(t.key==="Escape"){const e=document.getElementById("pause-overlay");e&&(document.body.removeChild(e),x=!1)}return}if(t.key==="Escape"&&n&&(n.phase==="player_turn"||n.phase==="enemy_turn")){Ie();return}if(!(!n||n.phase!=="player_turn")){if(t.key>="1"&&t.key<="5"){const e=parseInt(t.key)-1;if(e<n.hand.length){const a=n.hand[e];(n.player.mana>=a.cost||n.zeroCostTurn)&&(d.resume(),d.cardPlay(),n=H(n,a.id),V(),h.render(n),v.onCardPlayed())}return}if(t.key==="e"||t.key==="E"){v.onEndTurn();const e=n.player.hp;n=_(n);const a=Math.max(0,e-n.player.hp);b+=a,a>0&&d.playerHurt(),N(),h.render(n),v.onEnemyAttacked()}}});function V(){if(n.phase==="card_reward"){const t=n.enemy.type==="SYSTEM_OVERLORD";C({isWinCombat:!0,isWinBoss:t,combatDamageTaken:b}),d.victory()}n.phase==="lose"&&N()}function N(){n.phase==="lose"&&(R(),$(),d.defeat())}function $(){const t=ue(n.playerClass,n.runStats.floorsCleared,n.runStats.goldEarned,n.player.maxHp,Math.max(1,n.player.hp),n.runStats.startTime),e=he(),{entries:a}=me(t,e);fe(a)}function p(t){E.hide(),f.hide(),S.hide(),h.hide(),k.hide(),L.hide(),t==="main_menu"?E.show():t==="map"?f.show():t==="shop"?S.show():t==="game"?h.show():k.show()}function Pe(){return{currentFloor:0,currentNode:1,nodes:ye().nodes.map(e=>e.map(a=>({...a,visited:!1})))}}function M(t,e,a){return{...t,currentFloor:e+1,currentNode:a}}function U(t){const e=ie(),a=se[t],s=oe(t,B),i=O();return{...e,phase:"map",playerClass:t,player:{...e.player,hp:a.hp,maxHp:a.hp,mana:a.maxMana,maxMana:a.maxMana,gold:100},relics:[i.id],fireproofUsed:!1,totalCardsPlayed:0,overclockDouble:!1,cardsPlayedThisTurn:0,firstAttackThisTurn:!0,combatInvisible:!1,lastPlayerCardDamage:0,bossPhase:1,mapState:Pe(),hand:[],deck:s,discard:[],combatLog:["NEURAL LINK ESTABLISHED",`CLASS: ${t}`,`RELIC: ${i.name}`,"SELECT YOUR ENTRY POINT"]}}function Oe(t){let e=t;if(e.relics.includes("neuro_chip")&&(e={...e,player:{...e.player,mana:e.player.mana+1},combatLog:[...e.combatLog,"NEURO-CHIP: +1 MANA"]}),e.relics.includes("ghost_protocol")&&(e={...e,combatInvisible:!0,combatLog:[...e.combatLog,"GHOST PROTOCOL: INVISIBLE"]}),e.relics.includes("virus_scanner")&&e.enemy.shield>0){const a=Math.max(0,e.enemy.shield-5);e={...e,enemy:{...e.enemy,shield:a},combatLog:[...e.combatLog,"VIRUS SCANNER: ENEMY -5 SHIELD"]}}return e}const E=new ge(g,{onNewRun:()=>{d.buttonClick(),p("class_select"),k.render()},onDailyChallenge:()=>{d.buttonClick();const t=j(),e=t.split("-").reduce((l,r)=>l*100+parseInt(r),0),a=J(t),s=re(e),i=pe(e);let o=U(i);o=Q(o,s,B),o={...o,isDaily:!0,dailyModifiers:s,combatLog:[...o.combatLog,`DAILY HACK: ${a}`,`MODIFIERS: ${s.join(", ")}`]},n=o,b=0,y(n),f.render(n),p("map")},onContinue:()=>{d.buttonClick();const t=Ne();t&&(n=t,b=0,n.phase==="map"?(f.render(n),p("map")):n.phase==="player_turn"||n.phase==="enemy_turn"?(h.render(n),p("game")):(f.render(n),p("map")))},onSettings:()=>{d.buttonClick(),L.show()},onAbout:()=>{d.buttonClick(),_e()},hasSave:Me}),k=new we(g,{onClassSelect:t=>{d.buttonClick(),n=U(t),b=0,y(n),f.render(n),p("map")}}),f=new be(g,{onNodeSelect:(t,e)=>{d.buttonClick();const a=n.mapState,s=a.nodes[t][e],i={...a,nodes:a.nodes.map((o,l)=>o.map((r,c)=>l===t&&c===e?{...r,visited:!0}:r))};if(z=t,G=e,s.type==="combat"){const o=Z(t),l=ee(o,t),r=[...n.deck,...n.discard,...n.hand];b=0;let c={...n,enemy:l,hand:[],deck:r,discard:[],mapState:i,bossPhase:1,combatInvisible:!1,lastPlayerCardDamage:0,combatLog:[`ENTERING SECTOR ${t+1}`,`TARGET ACQUIRED: ${o}`],zeroCostTurn:!1,hitsTakenThisCombat:0,uniqueCardsPlayedThisCombat:[],invincibleThisTurn:!1,extraTurn:!1,darkPatternActive:!1,adminOverrideTurnsLeft:0,pendingPersistenceCard:void 0};c=te(c),c=Oe(c),n=c,h.animateDrawCards(n.hand.length),h.render(n),p("game"),v.start()}else if(s.type==="shop"){const o=ne(),l=O(n.relics);n={...n,phase:"shop",mapState:M(i,t,e),shopInventory:o,shopRelic:l.id},y(n),S.render(n),p("shop")}else n={...n,phase:"map",player:{...n.player,hp:Math.min(n.player.maxHp,n.player.hp+25)},mapState:M(i,t,e),combatLog:[...n.combatLog,"REST: +25 HP RESTORED"]},y(n),f.render(n)}}),S=new Ce(g,{onBuy:t=>{if(!n.shopInventory)return;const e=n.shopInventory.find(a=>a.id===t);!e||n.player.gold<50||(d.buttonClick(),n={...n,player:{...n.player,gold:n.player.gold-50},deck:[...n.deck,e],shopInventory:n.shopInventory.filter(a=>a.id!==t),combatLog:[...n.combatLog,`PURCHASED: ${e.name}`]},C({}),y(n),S.render(n))},onBuyRelic:t=>{!n.shopRelic||n.shopRelic!==t||n.player.gold<80||n.relics.includes(t)||(d.buttonClick(),n={...n,player:{...n.player,gold:n.player.gold-80},relics:[...n.relics,t],shopRelic:void 0,combatLog:[...n.combatLog,`RELIC ACQUIRED: ${t.toUpperCase()}`]},C({}),y(n),S.render(n))},onLeave:()=>{if(d.buttonClick(),n={...n,phase:"map",shopInventory:void 0,shopRelic:void 0},n.mapState&&n.mapState.currentFloor>=5){n={...n,phase:"win"},F(),h.render(n),p("game");return}y(n),f.render(n),p("map")}}),h=new ve(g,{onCardClick:(t,e)=>{if(n.phase!=="player_turn")return;const a=n.hand.find(s=>s.id===t);a&&(n.player.mana<a.cost&&!n.zeroCostTurn||(d.resume(),d.cardPlay(),h.animateCardPlay(a,e,()=>{n=H(n,t),V(),h.render(n),v.onCardPlayed()})))},onEndTurn:()=>{v.onEndTurn();const t=n.player.hp;n=_(n);const e=Math.max(0,t-n.player.hp);b+=e,e>0&&d.playerHurt(),N(),h.render(n),v.onEnemyAttacked()},onSelectCardReward:t=>{if(n=ae(n,t),C({}),n.phase==="win"&&n.mapState){const e=M(n.mapState,z,G);if(e.currentFloor>=5){F(),h.render(n);return}const a=n.relics.includes("gold_chip")?40:30;n={...n,phase:"map",mapState:e,player:{...n.player,gold:n.player.gold+a},runStats:{...n.runStats,floorsCleared:n.runStats.floorsCleared+1,goldEarned:n.runStats.goldEarned+a},combatLog:[...n.combatLog,`+${a} CREDITS EARNED${n.relics.includes("gold_chip")?" (GOLD CHIP)":""}`]},C({}),y(n),f.render(n),p("map")}else h.render(n)},onPlayAgain:()=>{R(),p("main_menu"),E.render()}}),L=new xe(g,{onClose:t=>{Se(t),d.applySettings({masterVolume:t.masterVolume/100,sfxVolume:t.sfxVolume/100}),L.hide()}});function F(){C({isWinRun:!0,combatDamageTaken:b}),d.victory(),R(),$()}function _e(){const t=document.createElement("div");t.style.cssText=`
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.82);
    display: flex; align-items: center; justify-content: center;
    z-index: 8000; font-family: 'Courier New', monospace;
    cursor: pointer;
  `,t.innerHTML=`
    <div style="background:rgba(5,17,26,0.98);border:2px solid #aa66ff;border-radius:14px;
         padding:32px 44px;max-width:440px;box-shadow:0 0 40px rgba(170,102,255,0.3);">
      <div style="color:#aa66ff;font-size:20px;font-weight:bold;margin-bottom:12px;letter-spacing:3px">// CYBERDECK //</div>
      <div style="color:#556677;font-size:12px;line-height:1.7">
        A cyberpunk roguelike deckbuilder.<br>
        Build your deck, hack the system, defeat the boss.<br><br>
        <span style="color:#00ffcc">Sprint 8</span> — UX Overhaul<br>
        <span style="color:#336677">v0.8.0</span>
      </div>
      <div style="color:#334455;font-size:11px;margin-top:16px">[CLICK TO CLOSE]</div>
    </div>
  `,t.addEventListener("click",()=>document.body.removeChild(t)),document.body.appendChild(t)}const P=Te();d.applySettings({masterVolume:P.masterVolume/100,sfxVolume:P.sfxVolume/100});p("main_menu");window.addEventListener("resize",()=>{n&&(n.phase==="map"?f.render(n):n.phase==="shop"?S.render(n):n.phase==="class_select"?k.render():h.render(n))});
