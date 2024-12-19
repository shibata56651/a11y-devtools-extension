chrome.devtools.panels.create(
  "JIS X 8341-3 Checker", // パネル名
  "icon48.png", // アイコン
  "panel.html", // パネルのHTML
  function (panel) {
    console.log("JIS X 8341-3 Checker panel added");
  }
);
