# Sprint #9 — 中文支持 + README

## TASK 1 - 国际化系统 (src/i18n/)

### src/i18n/index.ts
- t(key: string): string 翻译函数
- setLanguage(lang: 'en' | 'zh') 切换语言
- 保存到 localStorage
- 支持热切换（不需要刷新）

### src/i18n/en.ts — 英文原版
### src/i18n/zh.ts — 中文翻译

翻译内容覆盖：
- 所有 UI 标签（HP、护甲、法力、回合、楼层）
- 所有卡牌名称 + 描述
- 所有敌人名称
- 所有菜单按钮
- 战斗日志文本
- 成就名称 + 描述
- 职业名称 + 被动描述
- 遗物名称 + 描述

中文卡牌名（示例）：
- Strike → 攻击
- Block → 防御
- Hack → 入侵
- SYSTEM_OVERLORD → 系统霸主
- GOD_PROTOCOL → 神之协议

## TASK 2 - 语言切换按钮
- 主菜单右上角：[EN / 中文] 切换按钮
- 游戏内设置界面也有语言切换
- 切换后所有文字即时更新

## TASK 3 - README.md 完整更新

```markdown
# CyberDeck ⚡

> 赛博朋克 Roguelike 卡牌游戏 | Cyberpunk Roguelike Deckbuilder

[Play Now](https://wzai-1.github.io/cyberdeck/) | [English](#english) | [中文](#中文)

## 🎮 游戏截图
[截图占位]

## ✨ 特色
- 3个职业：黑客 / 战士 / 幽灵
- 60+ 张卡牌，含传说稀有度
- 13种敌人 + 三阶段 Boss
- 遗物系统、诅咒卡、状态效果
- 每日挑战模式（全球同服）
- 完整成就系统

## 🚀 快速开始
npm install && npm run dev

## 🛠 技术栈
TypeScript + PixiJS v8 + Vite + Vitest

## 📊 项目进度
- Sprint 1-8: 完成
- 测试覆盖: 414+ tests
```
