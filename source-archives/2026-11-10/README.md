# 云端独立玩法源码归档

这是各独立探索的最新可恢复云端源码，不替代阿莉埃蒂正式版或其他线上版本。

- leaf-climb-demos：三种攀爬机制比较，dist 是手写源代码；npm test 29/29，通过 npm run check。
- ivy-ink-study：水墨四叶小实验；node test.cjs 通过，包括 1200 帧模拟及指针取消。
- pen-circle-r1_1：画圈转笔独立玩法；npm test 13/13，base 是测试引用的公开旧四文件。
- pen-balance-r2：重力平衡笔独立玩法；npm test 11/11。

各目录可用静态 HTTP 服务打开 dist/ 或 runtime/。无需联网依赖安装。源码、配置、测试及必要回归 fixture 原样保留，逐文件 SHA-256 与 Git blob 在 MANIFEST.json。

不包含内部工作笔记、私有托管元数据、参考图片、浏览器截图、日志、缓存或构建 ZIP；未改原产品或线上目录。本次只验证源码与离线测试，没有实体手机或 GPU 验收，也未部署。
