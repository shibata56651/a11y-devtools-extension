# a11y-devtools-extension

## 構造

```
devtools-extension/
├── manifest.json # 拡張機能の定義ファイル
├── devtools.html # DevToolsパネルのHTML
├── devtools.js # DevTools パネルのボタンが押された際のJavaScript
├── devtools_init.js # DevToolsパネルを作成するJavaScript
└── axe.min.js # axe-coreライブラリ（ダウンロードまたは CDN 利用）
```

## 使い方
1. chromeの拡張機能に「devtools-extension」ファイルを読み込ませる。
2. 管理者ツール（F12）に「JIS X 8341-3 checker」のタブが、追加されているかどうか確認する。（Network や Console のあるタブ）
3. 「JIS X 8341-3 checker」のタブより、「検閲する」ボタンを押すことにより、axeを走らせエラー箇所を表示する。
4. エラー該当箇所はページ内にもアウトラインとして表示される。
