# a11y-devtools-extension

## 構造

devtools-extension/
├── manifest.json # 拡張機能の定義ファイル
├── devtools.html # DevTools パネルの UI の HTML
├── devtools.js # DevTools パネルの JavaScript
├── panel.html # カスタムパネルの内容
├── panel.js # パネル内のロジック
├── content.js # コンテンツスクリプト（必要に応じて）
└── axe.min.js # axe-core ライブラリ（ダウンロードまたは CDN 利用）
