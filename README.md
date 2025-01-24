# a11y-devtools-extension

## 構造

```
devtools-extension/
├── manifest.json # 拡張機能の定義ファイル
├── devtools.html # DevTools パネルの HTML
├── devtools.js # DevTools パネルの ボタンが押された際の JavaScript
├── devtools_init.js # DevTools パネル を 作成するJavaScript
├── content.js # コンテンツスクリプト
└── axe.min.js # axe-core ライブラリ（ダウンロードまたは CDN 利用）
```
