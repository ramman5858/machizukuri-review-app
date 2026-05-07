# まちづくりチャレンジ事業 審査アプリ GitHub Pages版

このフォルダは、GitHub Pagesで画面を公開し、Google Apps Script経由でGoogle Sheetsに保存する版です。

## 構成

- `index.html`: GitHub Pagesに置く審査画面
- `apps-script/Code.gs`: Google Sheetsに紐づくApps Scriptへ貼り付ける保存API

## セットアップ

1. Google Sheetsを作成する
2. Google Sheetsで `拡張機能` → `Apps Script` を開く
3. `apps-script/Code.gs` の中身を貼り付ける
4. `setReviewPasscode` 関数のパスコードを書き換える
5. Apps Script上部の実行関数で `setReviewPasscode` を選び、1回実行する
6. Apps ScriptをWebアプリとしてデプロイする
7. 発行されたWebアプリURLを `index.html` の `APPS_SCRIPT_URL` に貼る
8. この `github-pages` フォルダの `index.html` をGitHub Pagesで公開する

`index.html` の設定箇所:

```js
const APPS_SCRIPT_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

## パスコード設定

`apps-script/Code.gs` の下の方にあるこの行を書き換えます。

```js
PropertiesService.getScriptProperties().setProperty(PASSCODE_PROPERTY_NAME, "ここに本番用パスコードを入れる");
```

例:

```js
PropertiesService.getScriptProperties().setProperty(PASSCODE_PROPERTY_NAME, "shinsa-2026");
```

書き換えたら、Apps Script画面上部の関数選択で `setReviewPasscode` を選び、実行してください。
初回はGoogleの承認画面が出ます。

パスコード本体はGoogle Apps Scriptのスクリプトプロパティに保存されます。
GitHub Pages側には保存しません。

## データ保存

Google Sheetsには次の2つのタブが作られます。

- `State`: アプリ全体の状態をJSONで保存する内部用タブ
- `Scores`: 審査員ごとの点数・メモを見やすく展開する確認用タブ

WebアプリのCSV出力もそのまま使えます。

## 注意

Apps ScriptのWebアプリは、審査員がアクセスできる公開範囲に設定してください。
本番前に、5人分の端末で入力・修正・CSV出力まで必ずテストしてください。
