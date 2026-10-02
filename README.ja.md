# hermes-pet

[English](README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko.md)

**Hermes がモニターの上を駆け回ります。** 画面上のアプリウィンドウを足場にして歩き、
ロケットで別のモニターへ飛び、パラシュートで降りてきて、iPad にまで渡っていく
オープンソースのデスクトップペットです。

[Tauri 2](https://tauri.app)（透明・フレームレス・常に最前面のウィンドウ）とバニラ TypeScript で作っています。

> キャラクターは [Nous Research の hermes-agent](https://github.com/NousResearch) をモチーフにした
> ファンキャラクターです。このリポジトリは hermes-agent および Nous Research とは無関係のファンプロジェクトです。

## プレビュー

<p align="center">
  <img src="docs/media/rocket.gif" width="320" alt="Hermes がロケットで打ち上がり、パラシュートでウィンドウの上に着地する">
</p>
<p align="center"><sub>🚀 ロケット発射 → エンジン停止 → パラシュート → <b>ウィンドウの上に着地</b>（ウィンドウの上辺が足場です）</sub></p>

<p align="center">
  <img src="docs/media/jet.gif" width="640" alt="Hermes がジェットで画面を横切る">
</p>
<p align="center"><sub>✈️ 横向きに乗るジェットダッシュ — 降りるときはパラシュートで着地</sub></p>

<p align="center">
  <img src="docs/media/walk-edge.gif" width="520" alt="Hermes が床を歩き、画面の角をつかんでよじ登り、腰掛ける">
</p>
<p align="center"><sub>🚶 散歩中に角を見つけると、つかんでよじ登って腰掛けます</sub></p>

動作スプライト（APNG — そのまま再生されます）。キャラクターは**パック**で差し替えでき、
デフォルトパックは **Simeong（시멍）** 🐶、オプションパックとして **Hermes** 🎧 が入っています（設定パネルで切り替え）：

| パック | idle | walk | rocket | jet | fall | edge |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Simeong | <img src="public/packs/simeong/idle.apng" width="72"> | <img src="public/packs/simeong/walk.apng" width="66"> | <img src="public/packs/simeong/rocket.apng" width="72"> | <img src="public/packs/simeong/jet.apng" width="96"> | <img src="public/packs/simeong/fall.apng" width="72"> | <img src="public/packs/simeong/edge.apng" width="72"> |
| Hermes | <img src="public/packs/hermes/idle.apng" width="72"> | <img src="public/packs/hermes/walk.apng" width="66"> | <img src="public/packs/hermes/rocket.apng" width="72"> | <img src="public/packs/hermes/jet.apng" width="96"> | <img src="public/packs/hermes/fall.apng" width="72"> | <img src="public/packs/hermes/edge.apng" width="72"> |

（上のデモ GIF はすべて Hermes パックで撮影したものです。）

## 機能

- 🚶 **ウィンドウの上を歩く** — 実際のアプリウィンドウの上辺を足場として認識して登って歩き、ウィンドウが動くと一緒に移動
- 🪂 **パラシュート** — 足場が消えたときや高いところから降りるときにパラシュートで降下
- 🚀 **ロケット & ジェット** — 垂直のロケット発射と、横向きに乗って飛ぶジェットダッシュ
- 🖥️ **マルチモニター** — スケールの異なるモニター（Retina + 外部ディスプレイ）の間を、歩いて・ジェットで・ロケットで行き来。
  左右の配置はもちろん、上下に重ねた配置にも対応（上へはロケット、下へはダイブ）
- 📱 **iPad ハンドオフ** — Lanbeam エージェント（別プロジェクト）が動いていれば、画面の端から iPad へ渡ります（オプション機能。なくても完全に動作します）
- 🎛️ **設定 GUI** — 右クリックメニュー → 設定：キャラクターパックの切り替え、サイズ・速度・活発さ・技の頻度をリアルタイムに調整（iPad のペットにも同期）
- 🎭 **キャラクターパック** — `public/packs/<名前>/` に動作 APNG を入れれば新しいキャラクターになります
- 🐾 **仲間を呼ぶ** — 性格（サイズ・歩き方）が少しずつ違う仲間を最大 3 体まで追加
- 🔍 **認識表示** — どのウィンドウを足場として認識しているかを、モニターごとのオーバーレイで可視化
- ✋ **ドラッグ / 💖 クリック反応** — つまんで運ぶとぶらぶら、クリックするとハート

## はじめに

必要なもの：[Node.js](https://nodejs.org) 18+、[Rust](https://rustup.rs) ツールチェーン。

```bash
npm install
npm run tauri dev     # 開発モードで実行
npm run tauri build   # 配布用アプリをビルド
```

<details>
<summary><b>Windows でビルドする</b>（実験的）</summary>

1. [Rust をインストール](https://rustup.rs) — インストール時に **MSVC ツールチェーン**を選んでください。
   Visual Studio がない場合は、rustup が案内する
   [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   を先にインストールする必要があります（"Desktop development with C++" ワークロード）。
2. [Node.js](https://nodejs.org) 18+ をインストール。
3. WebView2 ランタイム — Windows 10/11 にはほとんどの場合標準で入っています。ない場合は
   [こちらからインストール](https://developer.microsoft.com/microsoft-edge/webview2/)。
4. あとは同じです：

   ```powershell
   npm install
   npm run tauri dev
   npm run tauri build   # 成果物：src-tauri\target\release\bundle\
   ```

ウィンドウの足場認識は Win32（`EnumWindows` + DWM）で実装済みでコンパイルも確認していますが、
実機での検証はまだです。おかしなウィンドウが足場として認識されたら、
`src-tauri/src/lib.rs` の `SHELL_CLASSES` リストにクラス名を追加して、
issue で知らせてください。iPad ハンドオフは macOS 専用のため自動的に無効になります。

</details>

- 操作：ドラッグで移動 · クリックで反応 · **右クリック**でメニュー（仲間+ / 設定 / 認識表示 / 終了）
- ウィンドウ認識はパブリック API のみを使います — 追加の権限は不要です。
  （macOS `CGWindowListCopyWindowInfo` / Windows `EnumWindows` + DWM）

### 対応プラットフォーム

| プラットフォーム | 状態 |
| --- | --- |
| **macOS** | 開発・検証済み（メインターゲット） |
| **Windows** | 実験的 — ウィンドウの足場認識まで Win32 で実装・コンパイル確認済み、実機検証はまだです。issue 歓迎！ |

iPad ハンドオフは macOS 専用です（Lanbeam エージェントが macOS アプリのため）。

## 自分のキャラクターを入れる

すべての動作は `public/packs/<パック>/<state>.apng` のスプライトです（idle / walk / drag / react /
fall / edge / rocket / jet）。同じ名前で差し替えればすぐに反映され、存在しない動作は
idle で代用されます。オプションのバリエーション（`<state>.2.apng` … `<state>.4.apng`）はランダムに選ばれます。

新しい動作を追加するパイプラインは `.claude/skills/add-action/SKILL.md` にレシピとしてまとめてあります。
[sprite-gen](https://github.com/aldegad/sprite-gen) でフレームを生成するモードと、
マゼンタ背景の GIF を変換するモードの 2 つです：

```bash
# 単色背景 GIF → アルファ付き APNG（クロマキー + デスピル + 組み立て）
ffmpeg -i in.gif -vf "colorkey=0xFF00FF:0.12:0.08" key_%02d.png
ffmpeg -framerate 50/3 -start_number 1 -i key_%02d.png -c:v apng -plays 0 public/packs/<pack>/idle.apng
```

元のソース素材は `art/` に保存されています。

## 構成

```
src/main.ts          行動の頭脳：ステートマシン（idle/walk/drag/react/fall/edge/rocket/jet）、
                     ウィンドウ足場の物理、マルチモニター移動、Lanbeam ハンドオフ
src/style.css        状態ごとの CSS モーション（描かれたスプライトとぶつからないよう状態ごとに on/off）
src/debug.ts         モニターごとの足場認識オーバーレイ
src/settings.ts      設定パネル（localStorage に永続化 + イベントをブロードキャスト）
src-tauri/           Tauri シェル：透明ウィンドウ、list_windows（CGWindowList）、Lanbeam ブリッジクライアント
public/packs/*/      キャラクターパック：動作ごとの APNG スプライト（差し替え可能）
art/                 元のアートワーク + sprite-gen の生成記録
```

ペットが歩くときは OS のウィンドウそのものを動かしている（`setPosition`）ので、固定のキャンバスではなく
本物のデスクトップを歩き回ります。モニター間の移動は、スケールが違ってもずれないよう
macOS の論理ポイント座標系で計算しています。

## クレジット

このプロジェクトは以下の方々の協力で作られました。ありがとうございます！🙏

- **Hermes パックのキャラクター提供** — [asin_cartel](https://www.threads.com/@asin_cartel)
- **Hermes パックの動作 GIF 提供**（パラシュート・よじ登りなど） — Hermes ゲーム団（에르메스 게임단）の **Nornen** さん
- **スプライト生成ツール** — [sprite-gen](https://github.com/aldegad/sprite-gen)（@aldegad）
- Hermes キャラクターのモチーフ — [hermes-agent](https://hermes-agent.nousresearch.com)（Nous Research）
- Simeong（デフォルトパック）は CMORE のオリジナルキャラクターです

## ライセンス

- **コード**：[MIT](./LICENSE)
- **キャラクター・アート素材**（`art/`、`public/packs/`）：著作権は各提供者
  （asin_cartel さん、Nornen さん）にあり、このプロジェクトでの使用を許可いただいたものです。
  コードのライセンス（MIT）には含まれないため、素材を他の場所で使う場合は原作者の
  許可を得てください。フォークして使う場合は、ご自身のキャラクターに差し替えることをおすすめします。
