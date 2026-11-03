# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: plain static HTML/CSS/JavaScript, chosen to honor the no-backend requirement and avoid a build step or dependency installation.

## Users

Children around 8 years old, primarily girls, practicing addition and subtraction on a landscape tablet or a phone. A parent or friend may open the app and hand the device to the child, so the first task must be understandable without account setup or adult explanation.

## Product Purpose

提供一局 18 题、难度适中的加减法练习，让儿童通过数字键盘作答，在答错时得到简短、可看懂的可视化解释，并在最后看到自己的成绩和需要继续练习的技能。成功标准是孩子能独立完成一局，不因计时或惩罚性反馈感到压力。

## Positioning

数学练习被组织成一条会开花的花园小径：每道题对应一个成长点，答对会开花，答错会显示一个轻量的“看得见的解释”。练习结果按技能汇总，而不是只给一个总分。

## Operating Context

主要用于家庭中的短时练习，设备横屏或竖屏握持，网络不是交互前提。每局约 18 题，不设置倒计时、账号、排行榜或社交功能。题目每次重新生成，生成范围始终限制在适合约 8 岁儿童的加减法难度内。

## Capabilities and Constraints

- 题目由纯前端随机生成，覆盖两位数加减、进位、退位、缺失数字、短情境题和两步计算。
- 使用屏幕数字键盘，同时支持实体键盘数字键、退格和回车。
- 一局固定 18 题，按热身、核心、混合和挑战四个阶段安排。
- 根据连续答对情况在受控范围内调整后续核心题难度，答错后降低同类难度，不切换惩罚性模式。
- 即时反馈必须包含简短解释和视觉拆解；至少覆盖进位和退位。
- 结果页显示总分、题目地图、分技能结果、易错题复盘和下一次提示。
- 所有学习记录仅保存在浏览器本地，不上传服务器。
- 必须适配横屏平板和手机；不依赖后端、账号或框架运行时。

## Brand Commitments

产品名为「数学花园」。视觉采用暖奶油纸底、莓果红、蓝绿和蜂蜜黄，结合花园、花瓣和纸艺元素。语气温和、鼓励式，不使用惩罚性文案。

## Evidence on Hand

已确认的可编辑设计画布位于 `designs/math-garden/project/`，包含平板答题、温和纠错、平板总结、手机答题和手机总结五个界面。当前仓库没有真实用户数据、成绩样本或第三方品牌资产；不得虚构学员数量、效果承诺或用户评价。

## Product Principles

1. 孩子可以先试着算，再得到一个能看懂的原因。
2. 错误只提供线索和下一步，不中断练习，也不制造羞耻感。
3. 操作密度服从儿童的理解速度，按钮和数字始终是视觉主角。
4. 难度变化应当温和、可解释，并保持在非负整数的加减法范围内。
5. 每次练习都能独立完成，也能在不登录的情况下重新开始。

## Accessibility & Inclusion

所有可操作元素使用原生按钮或链接，提供键盘焦点和可读标签。主要触摸目标至少 44px，正文对比度不低于 4.5:1。界面不以颜色作为唯一反馈手段，正确/错误同时使用文字说明。支持 `prefers-reduced-motion`。
