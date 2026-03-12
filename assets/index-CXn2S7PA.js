var Q=Object.defineProperty;var Z=(e,n,a)=>n in e?Q(e,n,{enumerable:!0,configurable:!0,writable:!0,value:a}):e[n]=a;var R=(e,n,a)=>Z(e,typeof n!="symbol"?n+"":n,a);import{A as ee}from"./pixi-BgKmFI53.js";import{l as te,c as ne,d as ae,e as oe,f as re,h as ie,s as se,i as le,j as H,k as ce,m as B,p as U,n as de,o as pe,C as ue,q as me,r as fe,u as he,t as ye,v as ge,w as F,x as be,y as xe,z as Ce,A as ve,D as Te}from"./game-D20Lkny5.js";import{M as Se,S as Ee,a as Re,G as we,C as ke,b as Ae,s as Le,l as Ne}from"./ui-zaa-4mcV.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function a(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(r){if(r.ep)return;r.ep=!0;const o=a(r);fetch(r.href,o)}})();class Ie{constructor(){R(this,"ctx",null);R(this,"masterGain",null);R(this,"sfxGain",null);try{this.ctx=new AudioContext,this.masterGain=this.ctx.createGain(),this.sfxGain=this.ctx.createGain(),this.sfxGain.connect(this.masterGain),this.masterGain.connect(this.ctx.destination),this.masterGain.gain.value=.6,this.sfxGain.gain.value=.8}catch{this.ctx=null}}isAvailable(){return this.ctx!==null}setMasterVolume(n){this.masterGain&&(this.masterGain.gain.value=Math.max(0,Math.min(1,n)))}setSfxVolume(n){this.sfxGain&&(this.sfxGain.gain.value=Math.max(0,Math.min(1,n)))}applySettings(n){this.setMasterVolume(n.masterVolume),this.setSfxVolume(n.sfxVolume)}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}play(n){!this.ctx||!this.sfxGain||Me[n]?.(this.ctx,this.sfxGain)}cardPlay(){this.play("cardPlay")}cardHover(){this.play("cardHover")}dealDamage(){this.play("dealDamage")}gainShield(){this.play("gainShield")}playerHurt(){this.play("playerHurt")}victory(){this.play("victory")}defeat(){this.play("defeat")}buttonClick(){this.play("buttonClick")}phaseChange(){this.play("phaseChange")}}function m(e,n,a,i,r,o,l){const s=e.createGain();s.connect(n),s.gain.setValueAtTime(r,e.currentTime),s.gain.exponentialRampToValueAtTime(.001,e.currentTime+o);const d=e.createOscillator();d.type=a,d.frequency.setValueAtTime(i,e.currentTime),l!==void 0&&d.frequency.exponentialRampToValueAtTime(l,e.currentTime+o),d.connect(s),d.start(e.currentTime),d.stop(e.currentTime+o)}function De(e,n,a,i){const r=Math.ceil(e.sampleRate*i),o=e.createBuffer(1,r,e.sampleRate),l=o.getChannelData(0);for(let N=0;N<r;N++)l[N]=Math.random()*2-1;const s=e.createBufferSource();s.buffer=o;const d=e.createGain();d.gain.setValueAtTime(a,e.currentTime),d.gain.exponentialRampToValueAtTime(.001,e.currentTime+i),s.connect(d),d.connect(n),s.start(e.currentTime)}const Me={cardPlay(e,n){m(e,n,"sine",220,.3,.1,440)},cardHover(e,n){m(e,n,"sine",880,.06,.05)},dealDamage(e,n){m(e,n,"sawtooth",100,.5,.15,40),m(e,n,"square",80,.2,.15,30)},gainShield(e,n){m(e,n,"triangle",1200,.25,.1,800)},playerHurt(e,n){De(e,n,.6,.2),m(e,n,"sawtooth",120,.4,.2,60)},victory(e,n){[261.63,329.63,392,523.25].forEach((i,r)=>{const o=e.createGain();o.connect(n);const l=e.currentTime+r*.12;o.gain.setValueAtTime(0,l),o.gain.linearRampToValueAtTime(.3,l+.02),o.gain.exponentialRampToValueAtTime(.001,l+.22);const s=e.createOscillator();s.type="sine",s.frequency.value=i,s.connect(o),s.start(l),s.stop(l+.25)})},defeat(e,n){m(e,n,"sawtooth",180,.5,.5,40),m(e,n,"square",90,.25,.5,20)},buttonClick(e,n){m(e,n,"sine",600,.2,.08,400)},phaseChange(e,n){m(e,n,"sine",220,.3,.4,440),m(e,n,"sine",330,.2,.4,660),m(e,n,"triangle",110,.4,.4,220)}},g=new ee({resizeTo:window,backgroundAlpha:0}),V=document.getElementById("app");V&&V.appendChild(g.view);document.addEventListener("visibilitychange",()=>{document.hidden?g.ticker.stop():g.ticker.start()});function Pe(){const e=document.createElement("div");e.style.cssText=`
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
  `,e.textContent="⚠ BEST EXPERIENCED ON DESKTOP — tap to dismiss",e.addEventListener("click",()=>{e.parentNode&&e.parentNode.removeChild(e)}),document.body.appendChild(e)}/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)&&Pe();window.addEventListener("error",e=>{if(document.getElementById("system-error-screen"))return;const a=document.createElement("div");a.id="system-error-screen",a.style.cssText=`
    position: fixed; inset: 0;
    background: #050008;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    z-index: 99999;
    color: #ff0044;
  `,a.innerHTML=`
    <div style="font-size:36px;font-weight:bold;letter-spacing:4px;margin-bottom:18px">SYSTEM ERROR</div>
    <div style="font-size:13px;color:#884455;margin-bottom:28px;max-width:480px;text-align:center">${e.message??"UNKNOWN FAULT"}</div>
    <button onclick="location.reload()" style="
      background:#0a0012; border:2px solid #ff0044; color:#ff0044;
      font-family:'Courier New',monospace; font-size:16px; font-weight:bold;
      padding:12px 32px; cursor:pointer; border-radius:8px; letter-spacing:2px;
    ">[ RESTART ]</button>
  `,document.body.appendChild(a)});const $="cyberdeck_tutorial";function O(){try{return localStorage.getItem($)==="done"}catch{return!1}}function I(){try{localStorage.setItem($,"done")}catch{}}const D=["STEP 1/4 — CLICK A CARD TO PLAY IT","STEP 2/4 — CARDS COST MANA (◆ diamonds)","STEP 3/4 — CLICK END TURN WHEN DONE","STEP 4/4 — BLOCK REDUCES INCOMING DAMAGE"];let S=0,f=null;function K(e){if(O()||e>=D.length){M(),I();return}f&&f.parentNode&&f.parentNode.removeChild(f);const n=document.createElement("div");f=n,n.style.cssText=`
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: rgba(4,12,22,0.97);
    border: 2px solid #00ffcc;
    border-radius: 10px;
    padding: 12px 20px;
    color: #00ffcc;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    z-index: 7000;
    box-shadow: 0 0 24px rgba(0,255,204,0.3);
    letter-spacing: 2px;
    display: flex; align-items: center; gap: 16px;
  `;const a=document.createElement("span");a.textContent=D[e]??"";const i=document.createElement("button");i.textContent="[SKIP]",i.style.cssText=`
    background: none; border: 1px solid #336655; color: #336655;
    font-family: 'Courier New', monospace; font-size: 12px;
    cursor: pointer; padding: 4px 10px; border-radius: 4px;
  `,i.addEventListener("click",()=>{M(),I(),S=99}),n.appendChild(a),n.appendChild(i),document.body.appendChild(n)}function M(){f&&f.parentNode&&f.parentNode.removeChild(f),f=null}function z(){O()||(S+=1,S<D.length?K(S):(M(),I()))}function Oe(){O()||(S=0,K(0))}const c=new Ie;let T=te();document.addEventListener("pointerdown",()=>c.resume(),{once:!0});const k="cyberdeck_save";function Ge(){try{return localStorage.getItem(k)!==null}catch{return!1}}function y(e){try{localStorage.setItem(k,JSON.stringify(e))}catch{}}function Ve(){try{const e=localStorage.getItem(k);return e?JSON.parse(e):null}catch{return null}}function A(){try{localStorage.removeItem(k)}catch{}}let t,x=0,Y=0,q=0,b=!1;function C(e){const n=fe(T,t,e);for(const a of n){const i=he(T,a);if(i.newlyUnlocked){T=i.achievements,ye(T);const r=T.find(o=>o.id===a);r&&ze(r)}}}function ze(e){const n=document.createElement("div");n.style.cssText=`
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
  `,n.innerHTML=`
    <div style="font-size:10px;color:#665500;margin-bottom:4px">ACHIEVEMENT UNLOCKED</div>
    <div style="font-weight:bold">${e.name}</div>
    <div style="font-size:11px;color:#886600;margin-top:2px">${e.description}</div>
  `,document.body.appendChild(n),requestAnimationFrame(()=>{n.style.transform="translateX(0)"}),setTimeout(()=>{n.style.transition="transform 0.4s ease, opacity 0.4s ease",n.style.transform="translateX(120%)",n.style.opacity="0",setTimeout(()=>{document.body.contains(n)&&document.body.removeChild(n)},450)},3500)}function _e(){if(b)return;b=!0;const e=document.createElement("div");e.id="pause-overlay",e.style.cssText=`
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.78);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 8000;
    font-family: 'Courier New', monospace;
  `;const n=document.createElement("div");n.style.cssText=`
    background: rgba(5,17,26,0.98);
    border: 2px solid #00ffcc;
    border-radius: 14px;
    padding: 32px 48px;
    text-align: center;
    box-shadow: 0 0 40px rgba(0,255,204,0.3);
    min-width: 280px;
  `;const a=document.createElement("div");a.textContent="// PAUSED //",a.style.cssText="color: #00ffcc; font-size: 22px; font-weight: bold; margin-bottom: 24px; letter-spacing: 4px;",n.appendChild(a);const i=(r,o,l)=>{const s=document.createElement("button");s.textContent=r,s.style.cssText=`
      display: block; width: 100%; margin: 8px 0;
      background: rgba(5,17,26,0.9);
      border: 2px solid ${o}; border-radius: 8px;
      color: ${o}; font-family: 'Courier New', monospace;
      font-size: 15px; font-weight: bold; cursor: pointer;
      padding: 10px 0; letter-spacing: 2px;
    `,s.addEventListener("click",l),n.appendChild(s)};i("[ RESUME ]","#00ffcc",()=>{document.body.removeChild(e),b=!1}),i("[ SETTINGS ]","#ffaa00",()=>{document.body.removeChild(e),b=!1,L.show()}),i("[ ABANDON RUN ]","#ff4466",()=>{document.body.removeChild(e),b=!1,A(),p("main_menu"),E.render()}),i("[ MAIN MENU ]","#aa66ff",()=>{document.body.removeChild(e),b=!1,y(t),p("main_menu"),E.render()}),e.appendChild(n),document.body.appendChild(e),c.buttonClick()}window.addEventListener("keydown",e=>{if(b){if(e.key==="Escape"){const n=document.getElementById("pause-overlay");n&&(document.body.removeChild(n),b=!1)}return}if(e.key==="Escape"&&t&&(t.phase==="player_turn"||t.phase==="enemy_turn")){_e();return}if(!(!t||t.phase!=="player_turn")){if(e.key>="1"&&e.key<="5"){const n=parseInt(e.key)-1;if(n<t.hand.length){const a=t.hand[n];(t.player.mana>=a.cost||t.zeroCostTurn)&&(c.resume(),c.cardPlay(),t=U(t,a.id),W(),u.render(t))}return}if(e.key==="e"||e.key==="E"){const n=t.player.hp;t=B(t);const a=Math.max(0,n-t.player.hp);x+=a,a>0&&c.playerHurt(),G(),u.render(t)}}});function W(){if(t.phase==="card_reward"){const e=t.enemy.type==="SYSTEM_OVERLORD";C({isWinCombat:!0,isWinBoss:e,combatDamageTaken:x}),c.victory()}t.phase==="lose"&&G()}function G(){t.phase==="lose"&&(A(),X(),c.defeat())}function X(){const e=be(t.playerClass,t.runStats.floorsCleared,t.runStats.goldEarned,t.player.maxHp,Math.max(1,t.player.hp),t.runStats.startTime),n=xe(),{entries:a}=Ce(e,n);ve(a)}function p(e){E.hide(),h.hide(),v.hide(),u.hide(),w.hide(),L.hide(),e==="main_menu"?E.show():e==="map"?h.show():e==="shop"?v.show():e==="game"?u.show():w.show()}function He(){return{currentFloor:0,currentNode:1,nodes:Te().nodes.map(n=>n.map(a=>({...a,visited:!1})))}}function P(e,n,a){return{...e,currentFloor:n+1,currentNode:a}}function j(e){const n=de(),a=ue[e],i=pe(e,F),r=H();return{...n,phase:"map",playerClass:e,player:{...n.player,hp:a.hp,maxHp:a.hp,mana:a.maxMana,maxMana:a.maxMana,gold:100},relics:[r.id],fireproofUsed:!1,totalCardsPlayed:0,overclockDouble:!1,cardsPlayedThisTurn:0,firstAttackThisTurn:!0,combatInvisible:!1,lastPlayerCardDamage:0,bossPhase:1,mapState:He(),hand:[],deck:i,discard:[],combatLog:["NEURAL LINK ESTABLISHED",`CLASS: ${e}`,`RELIC: ${r.name}`,"SELECT YOUR ENTRY POINT"]}}function Be(e){let n=e;if(n.relics.includes("neuro_chip")&&(n={...n,player:{...n.player,mana:n.player.mana+1},combatLog:[...n.combatLog,"NEURO-CHIP: +1 MANA"]}),n.relics.includes("ghost_protocol")&&(n={...n,combatInvisible:!0,combatLog:[...n.combatLog,"GHOST PROTOCOL: INVISIBLE"]}),n.relics.includes("virus_scanner")&&n.enemy.shield>0){const a=Math.max(0,n.enemy.shield-5);n={...n,enemy:{...n.enemy,shield:a},combatLog:[...n.combatLog,"VIRUS SCANNER: ENEMY -5 SHIELD"]}}return n}const E=new Se(g,{onNewRun:()=>{c.buttonClick(),p("class_select"),w.render()},onDailyChallenge:()=>{c.buttonClick();const e=ne(),n=e.split("-").reduce((l,s)=>l*100+parseInt(s),0),a=ae(e),i=me(n),r=ge(n);let o=j(r);o=oe(o,i,F),o={...o,isDaily:!0,dailyModifiers:i,combatLog:[...o.combatLog,`DAILY HACK: ${a}`,`MODIFIERS: ${i.join(", ")}`]},t=o,x=0,y(t),h.render(t),p("map")},onContinue:()=>{c.buttonClick();const e=Ve();e&&(t=e,x=0,t.phase==="map"?(h.render(t),p("map")):t.phase==="player_turn"||t.phase==="enemy_turn"?(u.render(t),p("game")):(h.render(t),p("map")))},onSettings:()=>{c.buttonClick(),L.show()},onAbout:()=>{c.buttonClick(),Ue()},hasSave:Ge}),w=new ke(g,{onClassSelect:e=>{c.buttonClick(),t=j(e),x=0,y(t),h.render(t),p("map")}}),h=new Re(g,{onNodeSelect:(e,n)=>{c.buttonClick();const a=t.mapState,i=a.nodes[e][n],r={...a,nodes:a.nodes.map((o,l)=>o.map((s,d)=>l===e&&d===n?{...s,visited:!0}:s))};if(Y=e,q=n,i.type==="combat"){const o=re(e),l=ie(o,e),s=[...t.deck,...t.discard,...t.hand];x=0;let d={...t,enemy:l,hand:[],deck:s,discard:[],mapState:r,bossPhase:1,combatInvisible:!1,lastPlayerCardDamage:0,combatLog:[`ENTERING SECTOR ${e+1}`,`TARGET ACQUIRED: ${o}`],zeroCostTurn:!1,hitsTakenThisCombat:0,uniqueCardsPlayedThisCombat:[],invincibleThisTurn:!1,extraTurn:!1,darkPatternActive:!1,adminOverrideTurnsLeft:0,pendingPersistenceCard:void 0};d=se(d),d=Be(d),t=d,u.animateDrawCards(t.hand.length),u.render(t),p("game"),Oe()}else if(i.type==="shop"){const o=le(),l=H(t.relics);t={...t,phase:"shop",mapState:P(r,e,n),shopInventory:o,shopRelic:l.id},y(t),v.render(t),p("shop")}else t={...t,phase:"map",player:{...t.player,hp:Math.min(t.player.maxHp,t.player.hp+25)},mapState:P(r,e,n),combatLog:[...t.combatLog,"REST: +25 HP RESTORED"]},y(t),h.render(t)}}),v=new Ae(g,{onBuy:e=>{if(!t.shopInventory)return;const n=t.shopInventory.find(a=>a.id===e);!n||t.player.gold<50||(c.buttonClick(),t={...t,player:{...t.player,gold:t.player.gold-50},deck:[...t.deck,n],shopInventory:t.shopInventory.filter(a=>a.id!==e),combatLog:[...t.combatLog,`PURCHASED: ${n.name}`]},C({}),y(t),v.render(t))},onBuyRelic:e=>{!t.shopRelic||t.shopRelic!==e||t.player.gold<80||t.relics.includes(e)||(c.buttonClick(),t={...t,player:{...t.player,gold:t.player.gold-80},relics:[...t.relics,e],shopRelic:void 0,combatLog:[...t.combatLog,`RELIC ACQUIRED: ${e.toUpperCase()}`]},C({}),y(t),v.render(t))},onLeave:()=>{if(c.buttonClick(),t={...t,phase:"map",shopInventory:void 0,shopRelic:void 0},t.mapState&&t.mapState.currentFloor>=5){t={...t,phase:"win"},J(),u.render(t),p("game");return}y(t),h.render(t),p("map")}}),u=new we(g,{onCardClick:(e,n)=>{if(t.phase!=="player_turn")return;const a=t.hand.find(i=>i.id===e);a&&(t.player.mana<a.cost&&!t.zeroCostTurn||(c.resume(),c.cardPlay(),u.animateCardPlay(a,n,()=>{t=U(t,e),W(),u.render(t),z()})))},onEndTurn:()=>{const e=t.player.hp;t=B(t);const n=Math.max(0,e-t.player.hp);x+=n,n>0&&c.playerHurt(),G(),u.render(t),z()},onSelectCardReward:e=>{if(t=ce(t,e),C({}),t.phase==="win"&&t.mapState){const n=P(t.mapState,Y,q);if(n.currentFloor>=5){J(),u.render(t);return}const a=t.relics.includes("gold_chip")?40:30;t={...t,phase:"map",mapState:n,player:{...t.player,gold:t.player.gold+a},runStats:{...t.runStats,floorsCleared:t.runStats.floorsCleared+1,goldEarned:t.runStats.goldEarned+a},combatLog:[...t.combatLog,`+${a} CREDITS EARNED${t.relics.includes("gold_chip")?" (GOLD CHIP)":""}`]},C({}),y(t),h.render(t),p("map")}else u.render(t)},onPlayAgain:()=>{A(),p("main_menu"),E.render()}}),L=new Ee(g,{onClose:e=>{Le(e),c.applySettings({masterVolume:e.masterVolume/100,sfxVolume:e.sfxVolume/100}),L.hide()}});function J(){C({isWinRun:!0,combatDamageTaken:x}),c.victory(),A(),X()}function Ue(){const e=document.createElement("div");e.style.cssText=`
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.82);
    display: flex; align-items: center; justify-content: center;
    z-index: 8000; font-family: 'Courier New', monospace;
    cursor: pointer;
  `,e.innerHTML=`
    <div style="background:rgba(5,17,26,0.98);border:2px solid #aa66ff;border-radius:14px;
         padding:32px 44px;max-width:440px;box-shadow:0 0 40px rgba(170,102,255,0.3);">
      <div style="color:#aa66ff;font-size:20px;font-weight:bold;margin-bottom:12px;letter-spacing:3px">// CYBERDECK //</div>
      <div style="color:#556677;font-size:12px;line-height:1.7">
        A cyberpunk roguelike deckbuilder.<br>
        Build your deck, hack the system, defeat the boss.<br><br>
        <span style="color:#00ffcc">Sprint 5</span> — Commercial Ready<br>
        <span style="color:#336677">v0.5.0</span>
      </div>
      <div style="color:#334455;font-size:11px;margin-top:16px">[CLICK TO CLOSE]</div>
    </div>
  `,e.addEventListener("click",()=>document.body.removeChild(e)),document.body.appendChild(e)}const _=Ne();c.applySettings({masterVolume:_.masterVolume/100,sfxVolume:_.sfxVolume/100});p("main_menu");window.addEventListener("resize",()=>{t&&(t.phase==="map"?h.render(t):t.phase==="shop"?v.render(t):t.phase==="class_select"?w.render():u.render(t))});
