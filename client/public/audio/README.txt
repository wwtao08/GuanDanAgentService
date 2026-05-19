背景音乐文件说明
================

请将你的 BGM 文件命名为：bgm.mp3
放在本目录（与 README 同级）。

目标听感（参考）
----------------
类似《欢乐斗地主》主界面 / 对局里的那种 **民乐合奏**：板鼓/打击铺底、二胡或笛子类亮旋律、琵琶/扬琴式扫弦点缀、整体轻快、偏北方秧歌或苏北小调味道，**无歌词**，适合 **无缝循环** 的棋牌休闲 BGM。

推荐制作方式（任选）
--------------------
- 使用 Suno / Udio / 其他 AI 作曲，提示词可参考（中英混合即可）：
  「Chinese folk ensemble, Happy Fight the Landlord style game BGM, erhu and bamboo flute lead, pipa or yangqin strums, light percussion, upbeat, pentatonic melody, no vocals, seamless loop, instrumental only」
  「民乐合奏、欢乐斗地主那种棋牌游戏背景音乐、二胡笛子主奏、琵琶扫弦、轻快锣鼓点、五声宫调、不要人声、适合循环」
- 或从 Pixabay / 免版权音乐站下载相近风格后改名为 bgm.mp3

也可在 client 目录配置环境变量 VITE_BGM_URL 指向任意可直连的 mp3 地址（会优先于本地 bgm.mp3）。

未放置文件时，客户端会使用内置的多层 Web Audio 合奏作为占位（仍弱于实录民乐；要最佳效果请自备 bgm.mp3）。
