# 忍者女孩阿丽埃蒂 1.0.2 小红书发布交接

用户认可的是红裙 3D 角色、A4 起跳人声、B4 单颗水滴落叶声和 M4《Intro Music》的版本。进入游戏后播放约 82 秒的循环配乐，起跳和落地时短暂降低音乐音量。「玩法与设置」里可以分别关闭音乐和音效。这个候选也包含叶片回弹、顶部避让和切回前台时的音频恢复。

## 给毛球

毛球，这一版请你负责小红书小工具发布。Tian 已授权你接手后续发布。创服 AppID 是 `6ae93cdfd71aaa0015f6e4d4`，上次核查是 1.0.1 已发布，更新页建议 1.0.2。请先复核当前版本，然后上传同目录的 `ninja-girl-1.0.2.zip`。这是用户试玩认可的本地冻结包，SHA256 是 `8e5bcabac38a1c62b1160562e9b7aec6853e9f2ec55cff3ec0dd3c6b489bfb02`。

先在创服检查部署和模拟器，再生成手机扫码预览。请在小红书 App 里点「开始攀爬」，确认背景音乐可播，向下拖动时静音，松手有 A4、落叶有 B4。再检查关闭音乐后仍能听到动作音效，以及切后台回来是否恢复。此前 390×844 浏览器已验证触控到第 2 叶和独立开关。手机容器对包内音乐的解码和播放仍需这一轮验收。按你所用工具和平台的扫码、协议与送审流程办理，最后从创服列表核实实际状态并回报 Tian。

更新说明可用「加入轻快的背景音乐、起跳人声和水滴落叶声，优化叶片回弹及返回游戏后的顶部布局与音频恢复。」

## 源码和包

在本目录使用 Node.js 20+ 执行：

```sh
npm ci
node build.mjs
python3 -m http.server 18732 --bind 127.0.0.1 --directory app
```

打开 [本地游戏](http://127.0.0.1:18732/) 测试。源码在 `build-source/`，生成文件写入 `app/`。交接前逐文件确认重建出的 9 个文件和冻结 ZIP 内字节一致。上传时使用仓库里的冻结 ZIP，或用 `MANIFEST.json` 核对对应指纹。小红书上传页当次提供的构建规范优先，最近核查为 minitool-zip-builder 1.10.0、ZIP 最大 10 MB。

音频随代码离线解码。平台上传与手机实际播放结果由本次预览确认。

- A4「hup.wav」由 maxmakessounds 提供，CC BY 4.0。已裁剪、淡入淡出、调整音量并转为单声道。游戏内「玩法与设置 → 音效署名」有署名。[原素材](https://freesound.org/people/maxmakessounds/sounds/353542/) · [许可证](https://creativecommons.org/licenses/by/4.0/)
- B4「Water_drop_7.wav」为 CC0。[原素材](https://freesound.org/people/deleted_user_2104797/sounds/166319/)
- M4「Intro Music」由 RonyDkid 提供，CC0。完整曲目经短淡入淡出并压缩为 48 kbps 单声道。[原素材](https://opengameart.org/content/intro-music-0)
