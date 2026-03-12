import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for node environment
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});
// Mock window.dispatchEvent
vi.stubGlobal('window', {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

// Re-import after mocks are set up
import { en } from '../i18n/en';
import { zh } from '../i18n/zh';

describe('i18n translations', () => {

  // ---- English string tests ------------------------------------------------

  describe('en.ts completeness', () => {
    it('has all UI keys', () => {
      const uiKeys = ['ui.hp', 'ui.shield', 'ui.mana', 'ui.turn', 'ui.floor', 'ui.endTurn', 'ui.deck', 'ui.discard'];
      for (const key of uiKeys) {
        expect(en[key], `Missing en key: ${key}`).toBeTruthy();
      }
    });

    it('has all menu keys', () => {
      const menuKeys = ['menu.newRun', 'menu.continue', 'menu.settings', 'menu.dailyHack'];
      for (const key of menuKeys) {
        expect(en[key], `Missing en key: ${key}`).toBeTruthy();
      }
    });

    it('has all combat keys', () => {
      const combatKeys = [
        'combat.youWin', 'combat.youLose', 'combat.playAgain',
        'combat.intent.attack', 'combat.intent.defend', 'combat.intent.charging',
      ];
      for (const key of combatKeys) {
        expect(en[key], `Missing en key: ${key}`).toBeTruthy();
      }
    });

    it('has all class keys', () => {
      expect(en['classes.hacker']).toBe('HACKER');
      expect(en['classes.warrior']).toBe('WARRIOR');
      expect(en['classes.ghost']).toBe('GHOST');
    });

    it('has all 60 card name keys', () => {
      const cardKeys = [
        'card.strike', 'card.block', 'card.hack', 'card.firewall', 'card.overclock',
        'card.glitch', 'card.reboot', 'card.doubleTap', 'card.ironWall', 'card.dataMine',
        'card.surge', 'card.patch', 'card.bitFlip', 'card.overclock2', 'card.shieldBash',
        'card.sacrifice', 'card.recycle', 'card.momentum', 'card.fortify', 'card.drain',
        'card.duplicate', 'card.overload', 'card.static', 'card.retaliate',
        'card.neuralLink', 'card.zeroDay', 'card.ghostProtocol', 'card.cascade',
        'card.memoryLeak', 'card.systemCrash', 'card.killSwitch',
        'card.timeWarp', 'card.entropy', 'card.dataSteal', 'card.corruption',
        'card.lastStand', 'card.coreDump', 'card.feedback', 'card.bifrost',
        'card.encrypt', 'card.persistence', 'card.emp', 'card.killCascade', 'card.overclock3',
        'card.godMode', 'card.overclockMax', 'card.singularity',
        'card.adminOverride', 'card.neuralStorm', 'card.fullReboot', 'card.backdoor',
        'card.quantumState', 'card.darkPattern', 'card.ghostInMachine', 'card.zeroDayEx',
        'card.infiniteLoop', 'card.godProtocol',
        'card.curseWound', 'card.curseParasite', 'card.curseVirus', 'card.curseCorruption',
      ];
      for (const key of cardKeys) {
        expect(en[key], `Missing en card key: ${key}`).toBeTruthy();
      }
    });

    it('has all card description keys', () => {
      const descKeys = [
        'card.desc.strike', 'card.desc.block', 'card.desc.hack', 'card.desc.firewall',
        'card.desc.godMode', 'card.desc.singularity', 'card.desc.godProtocol',
        'card.desc.curseWound', 'card.desc.curseCorruption',
      ];
      for (const key of descKeys) {
        expect(en[key], `Missing en desc key: ${key}`).toBeTruthy();
      }
    });

    it('has all enemy name keys', () => {
      const enemyKeys = [
        'enemy.virus_exe', 'enemy.spam_bot', 'enemy.firewall_sys', 'enemy.trojan',
        'enemy.corrupted_ai', 'enemy.rootkit', 'enemy.ransomware', 'enemy.deepfake',
        'enemy.system_overlord', 'enemy.elite_firewall', 'enemy.elite_ai', 'enemy.elite_worm',
      ];
      for (const key of enemyKeys) {
        expect(en[key], `Missing en enemy key: ${key}`).toBeTruthy();
      }
    });

    it('has all relic keys', () => {
      const relicIds = [
        'neuro_chip', 'fireproof', 'overclock_core', 'ghost_protocol', 'virus_scanner',
        'data_backup', 'neural_feedback', 'memory_cache', 'gold_chip', 'berserker_mode',
      ];
      for (const id of relicIds) {
        expect(en[`relic.${id}.name`], `Missing en relic name: ${id}`).toBeTruthy();
        expect(en[`relic.${id}.desc`], `Missing en relic desc: ${id}`).toBeTruthy();
      }
    });

    it('has all 15 achievement keys', () => {
      const achIds = [
        'first_blood', 'untouchable', 'big_spender', 'collector', 'legendary_pull',
        'flawless', 'speed_runner', 'glass_cannon', 'hoarder', 'overkill',
        'true_hacker', 'iron_warrior', 'ghost_runner', 'death_defied', 'completionist',
      ];
      for (const id of achIds) {
        expect(en[`achievement.${id}.name`], `Missing en achievement name: ${id}`).toBeTruthy();
        expect(en[`achievement.${id}.desc`], `Missing en achievement desc: ${id}`).toBeTruthy();
      }
    });
  });

  // ---- Chinese string tests ------------------------------------------------

  describe('zh.ts completeness', () => {
    it('has all UI keys in Chinese', () => {
      const uiKeys = ['ui.hp', 'ui.shield', 'ui.mana', 'ui.turn', 'ui.floor', 'ui.endTurn', 'ui.deck', 'ui.discard'];
      for (const key of uiKeys) {
        expect(zh[key], `Missing zh key: ${key}`).toBeTruthy();
      }
    });

    it('returns Chinese for shield', () => {
      expect(zh['ui.shield']).toBe('护甲');
    });

    it('returns Chinese for mana', () => {
      expect(zh['ui.mana']).toBe('法力');
    });

    it('returns Chinese end turn', () => {
      expect(zh['ui.endTurn']).toContain('结束回合');
    });

    it('has all 60 card names in Chinese', () => {
      const cardKeys = [
        'card.strike', 'card.block', 'card.hack', 'card.firewall', 'card.overclock',
        'card.glitch', 'card.reboot', 'card.doubleTap', 'card.ironWall', 'card.dataMine',
        'card.surge', 'card.patch', 'card.bitFlip', 'card.overclock2', 'card.shieldBash',
        'card.sacrifice', 'card.recycle', 'card.momentum', 'card.fortify', 'card.drain',
        'card.duplicate', 'card.overload', 'card.static', 'card.retaliate',
        'card.neuralLink', 'card.zeroDay', 'card.ghostProtocol', 'card.cascade',
        'card.memoryLeak', 'card.systemCrash', 'card.killSwitch',
        'card.timeWarp', 'card.entropy', 'card.dataSteal', 'card.corruption',
        'card.lastStand', 'card.coreDump', 'card.feedback', 'card.bifrost',
        'card.encrypt', 'card.persistence', 'card.emp', 'card.killCascade', 'card.overclock3',
        'card.godMode', 'card.overclockMax', 'card.singularity',
        'card.adminOverride', 'card.neuralStorm', 'card.fullReboot', 'card.backdoor',
        'card.quantumState', 'card.darkPattern', 'card.ghostInMachine', 'card.zeroDayEx',
        'card.infiniteLoop', 'card.godProtocol',
        'card.curseWound', 'card.curseParasite', 'card.curseVirus', 'card.curseCorruption',
      ];
      for (const key of cardKeys) {
        expect(zh[key], `Missing zh card key: ${key}`).toBeTruthy();
      }
    });

    it('has Chinese card names for specific cards', () => {
      expect(zh['card.strike']).toBe('攻击');
      expect(zh['card.block']).toBe('格挡');
      expect(zh['card.hack']).toBe('入侵');
      expect(zh['card.firewall']).toBe('防火墙');
      expect(zh['card.overclock']).toBe('超频');
      expect(zh['card.glitch']).toBe('故障');
      expect(zh['card.reboot']).toBe('重启');
      expect(zh['card.doubleTap']).toBe('双击');
      expect(zh['card.ironWall']).toBe('铁壁');
      expect(zh['card.dataMine']).toBe('数据挖掘');
      expect(zh['card.zeroDay']).toBe('零日漏洞');
      expect(zh['card.ghostProtocol']).toBe('幽灵协议');
      expect(zh['card.memoryLeak']).toBe('内存泄漏');
      expect(zh['card.systemCrash']).toBe('系统崩溃');
      expect(zh['card.killSwitch']).toBe('终止开关');
      expect(zh['card.godMode']).toBe('神模式');
      expect(zh['card.overclockMax']).toBe('超频极限');
      expect(zh['card.singularity']).toBe('奇点');
    });

    it('has all enemy names in Chinese', () => {
      const enemyKeys = [
        'enemy.virus_exe', 'enemy.spam_bot', 'enemy.firewall_sys', 'enemy.trojan',
        'enemy.corrupted_ai', 'enemy.rootkit', 'enemy.ransomware', 'enemy.deepfake',
        'enemy.system_overlord', 'enemy.elite_firewall', 'enemy.elite_ai', 'enemy.elite_worm',
      ];
      for (const key of enemyKeys) {
        expect(zh[key], `Missing zh enemy key: ${key}`).toBeTruthy();
      }
    });

    it('has Chinese enemy names', () => {
      expect(zh['enemy.spam_bot']).toBe('垃圾机器人');
      expect(zh['enemy.trojan']).toBe('木马');
      expect(zh['enemy.corrupted_ai']).toBe('腐化AI');
      expect(zh['enemy.ransomware']).toBe('勒索软件');
      expect(zh['enemy.deepfake']).toBe('深度伪造');
      expect(zh['enemy.system_overlord']).toBe('系统霸主');
    });

    it('has all 10 relics in Chinese', () => {
      const relicIds = [
        'neuro_chip', 'fireproof', 'overclock_core', 'ghost_protocol', 'virus_scanner',
        'data_backup', 'neural_feedback', 'memory_cache', 'gold_chip', 'berserker_mode',
      ];
      for (const id of relicIds) {
        expect(zh[`relic.${id}.name`], `Missing zh relic name: ${id}`).toBeTruthy();
        expect(zh[`relic.${id}.desc`], `Missing zh relic desc: ${id}`).toBeTruthy();
      }
    });

    it('has all 15 achievements in Chinese', () => {
      const achIds = [
        'first_blood', 'untouchable', 'big_spender', 'collector', 'legendary_pull',
        'flawless', 'speed_runner', 'glass_cannon', 'hoarder', 'overkill',
        'true_hacker', 'iron_warrior', 'ghost_runner', 'death_defied', 'completionist',
      ];
      for (const id of achIds) {
        expect(zh[`achievement.${id}.name`], `Missing zh achievement name: ${id}`).toBeTruthy();
        expect(zh[`achievement.${id}.desc`], `Missing zh achievement desc: ${id}`).toBeTruthy();
      }
    });

    it('has Chinese class names', () => {
      expect(zh['classes.hacker']).toBe('黑客');
      expect(zh['classes.warrior']).toBe('战士');
      expect(zh['classes.ghost']).toBe('幽灵');
    });
  });

  // ---- Parity tests (both langs have same keys) ---------------------------

  describe('en/zh parity', () => {
    it('zh has all keys that en has', () => {
      const enKeys = Object.keys(en);
      const zhKeys = new Set(Object.keys(zh));
      const missing = enKeys.filter(k => !zhKeys.has(k));
      expect(missing, `zh missing keys: ${missing.join(', ')}`).toHaveLength(0);
    });

    it('en has all keys that zh has', () => {
      const zhKeys = Object.keys(zh);
      const enKeys = new Set(Object.keys(en));
      const missing = zhKeys.filter(k => !enKeys.has(k));
      expect(missing, `en missing keys: ${missing.join(', ')}`).toHaveLength(0);
    });
  });

  // ---- t() function tests --------------------------------------------------

  describe('t() function', () => {
    beforeEach(async () => {
      // Reset to English
      store['cyberdeck_lang'] = 'en';
      // Re-import to reset module state
    });

    it('en translations have correct values', () => {
      expect(en['ui.hp']).toBe('HP');
      expect(en['ui.deck']).toBe('DECK');
      expect(en['ui.discard']).toBe('DISCARD');
      expect(en['menu.newRun']).toBe('[ NEW RUN ]');
      expect(en['combat.youWin']).toBe('RUN COMPLETE');
      expect(en['combat.youLose']).toBe('SYSTEM FAILURE');
    });

    it('zh translations differ from en for UI keys', () => {
      expect(zh['ui.shield']).not.toBe(en['ui.shield']);
      expect(zh['ui.mana']).not.toBe(en['ui.mana']);
      expect(zh['ui.turn']).not.toBe(en['ui.turn']);
      expect(zh['ui.floor']).not.toBe(en['ui.floor']);
      expect(zh['ui.endTurn']).not.toBe(en['ui.endTurn']);
      expect(zh['ui.deck']).not.toBe(en['ui.deck']);
      expect(zh['ui.discard']).not.toBe(en['ui.discard']);
    });

    it('menu keys translate differently in zh', () => {
      expect(zh['menu.newRun']).toBe('[ 新游戏 ]');
      expect(zh['menu.continue']).toBe('[ 继续 ]');
      expect(zh['menu.settings']).toBe('[ 设置 ]');
      expect(zh['menu.dailyHack']).toBe('[ 每日挑战 ]');
    });

    it('combat keys translate in zh', () => {
      expect(zh['combat.youWin']).toBe('运行完成');
      expect(zh['combat.youLose']).toBe('系统崩溃');
      expect(zh['combat.playAgain']).toBe('[ 再来一局 ]');
      expect(zh['combat.intent.attack']).toBe('攻击');
      expect(zh['combat.intent.defend']).toBe('防御');
      expect(zh['combat.intent.charging']).toBe('蓄力中');
    });
  });

  // ---- setLanguage tests ---------------------------------------------------

  describe('setLanguage()', () => {
    it('persists language to localStorage', async () => {
      const { setLanguage } = await import('../i18n/index');
      setLanguage('zh');
      expect(store['cyberdeck_lang']).toBe('zh');
      setLanguage('en');
      expect(store['cyberdeck_lang']).toBe('en');
    });

    it('updates currentLang', async () => {
      const { setLanguage, currentLang } = await import('../i18n/index');
      setLanguage('zh');
      expect(currentLang()).toBe('zh');
      setLanguage('en');
      expect(currentLang()).toBe('en');
    });

    it('t() returns correct lang after setLanguage', async () => {
      const { setLanguage, t: translate } = await import('../i18n/index');
      setLanguage('zh');
      expect(translate('ui.shield')).toBe('护甲');
      expect(translate('classes.hacker')).toBe('黑客');
      setLanguage('en');
      expect(translate('ui.shield')).toBe('SHIELD');
      expect(translate('classes.hacker')).toBe('HACKER');
    });

    it('falls back to key when translation missing', async () => {
      const { setLanguage, t: translate } = await import('../i18n/index');
      setLanguage('en');
      expect(translate('this.key.does.not.exist')).toBe('this.key.does.not.exist');
    });
  });
});
