// DevToolsパネルを作成
try {
  chrome.devtools.panels.create(
    "JIS X 8341-3 Checker",
    "icon48.png",
    "devtools.html"
  );
} catch (error) {
  console.error("DevTools拡張: devtools.js 内でエラーが発生:", error);
}
