# 跨端快传

Android 与 Windows 局域网文件传输工具。

## 当前功能

- Windows ↔ Android：电脑显示局域网地址，手机输入地址后上传/下载文件。
- Android ↔ Android：接收手机点“开启本机接收”，生成二维码；发送手机用相机扫描，在打开的页面选择文件发送。接收文件保存到 Android 的“下载/跨端快传”目录。
- 多文件选择；文件通过本地 Wi-Fi 传输，不经过云端。
- Windows 收到的文件保存在“文档/跨端快传/收到的文件”，共享给手机的文件放在“文档/跨端快传/发送到手机”。

## 使用要求

1. 两台手机连接同一个可信的 Wi-Fi。
2. 接收手机打开应用，点“开启本机接收”，保持应用在前台并显示二维码。
3. 发送手机用系统相机扫描二维码，打开网页后选择文件并发送。
4. 传输期间不要关闭接收手机上的应用。结束后点“停止接收”。

安卓互传使用接收手机上的临时令牌保护上传接口。当前传输为 HTTP 局域网传输，仅建议用于可信网络；不要在公共 Wi-Fi 上开启接收服务。

## 构建

- Windows 安装包和便携版：GitHub Actions 的 Windows EXE job。
- Android debug APK：GitHub Actions 的 Android APK job。
- Actions 运行成功后，在该次运行页面的 Artifacts 下载构建产物。debug APK 尚不是 Play 商店发布版，也没有 release 签名。

本地命令：npm install、npm run lint、npm run dist:win、npm run android:add。
