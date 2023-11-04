# Final Exam Checker

## インストール

### ZIPでインストール

1. 右上の `Code` の中の `Download ZIP` をクリックし、ZIPファイルをダウンロードします。  
2. どこかに展開します。
3. `chrome://extensions/` にアクセスし、「デベロッパーモード」をONにします。
4. 「パッケージ化されていない拡張機能を読み込む」を押して、 `2.` で展開したフォルダを指定します。

### GitでCloneする

ローカルのどこかにこのリポジトリをCloneしてください。  
そして、上記の `3.` `4.` を行います。

## 利用方法

1. デベロッパーツールの `FinalExamChecker` を選びます。  
[![](https://gyazo.com/8097acf6348a6c512fffce3fda34675f.png)](https://gyazo.com/8097acf6348a6c512fffce3fda34675f)
2. デベロッパーツールをデバイスモードにし、横幅を1536pxか390pxにした上で、Mobileにします。
3. 「チェック」ボタンを押すとデベロッパーツールの部分には、差異のある文字の一覧が出ます。一覧の箱にホバーすると、その要素がハイライトされます。
4. 要素のキャプチャを撮るので、画面が乱れます。
5. 新しいタブが開きます。ソースコードのチェックと、差異のある文字を受講生に伝えられるような内容が表示されます。


## 更新履歴（途中から）

- `1.2`
    - ソースコードチェック：Googleフォントの読み込み方法検証を追加
    - ソースコードチェック：見出しタグのチェックの出し方を修正
    - 文字要素のチェック：font-familyは大文字小文字区別しないので、その点を反映
- `1.3`
    - PC用のマスターデータが間違っていた
- `1.4`
    - 受講生に提供する文字の一覧をダブルクリックで削除できるようにした。
