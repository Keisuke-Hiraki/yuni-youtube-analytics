# YuNi Stellar Chart

Vsinger YuNiの動画をランキング表示するNext.jsアプリケーションです。

## 🌟 機能

- **動画ランキング表示**: 人気度、エンゲージメント、再生数による3つの指標でランキング
- **多言語対応**: 日本語、英語、中国語、韓国語に対応
- **リアルタイム更新**: 1時間ごとの自動更新とマニュアル更新機能
- **レスポンシブデザイン**: モバイル・デスクトップ両対応
- **ネオンテーマUI**: 音楽テイストのネオンカラーデザイン
- **背景アニメーション**: Canvas描画による動的な背景エフェクト
- **詳細情報表示**: 動画の詳細情報をダイアログで表示
- **AIチャットボット**: Groq APIを使用した動画検索・質問応答機能 ※現在この機能は工事中です

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15.2.4 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: Radix UI
- **アニメーション**: Framer Motion
- **チャート**: Recharts
- **フォーム**: React Hook Form + Zod
- **API**: YouTube Data API v3, Groq API
- **AI**: Groq SDK (Llama 3.1 70B)

## ⚡ パフォーマンス最適化

### 背景アニメーション最適化
- **Canvas描画**: 2つの独立したCanvasレイヤーによる背景エフェクト
- **FPS制限**: デスクトップ30FPS、モバイル20FPS、低性能デバイス15FPSに制限
- **要素数制限**: NeonSquares最大50個、FloatingParticles最大30個
- **描画軽量化**: グロー効果の削減、条件付きハイライト描画

### デバイス性能対応
- **自動検出**: CPUコア数、モバイルデバイス、ネットワーク速度による性能判定
- **動的調整**: 低性能デバイスでは軽量なエフェクトのみ表示
- **バッテリー配慮**: モバイルデバイスでのCPU使用率を約60-70%削減

### UI最適化
- **スペクトラムバー**: 32個の軽量なCSS Transform アニメーション
- **ホバーエフェクト**: GPU加速によるスムーズなトランジション
- **モバイル最適化**: タッチデバイス向けの操作性改善

## 📋 前提条件

- Node.js 18.0.0以上
- pnpm (推奨) または npm
- YouTube Data API v3のAPIキー
- Groq APIキー（チャットボット機能用）

## 🚀 セットアップ

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/your-username/yuni-youtube-analytics.git
   cd yuni-youtube-analytics
   ```

2. **依存関係のインストール**
   ```bash
   pnpm install
   ```

3. **環境変数の設定**
   
   `.env.local`ファイルを作成し、以下の環境変数を設定してください：
   ```env
   # 必須
   YOUTUBE_API_KEY=your_youtube_api_key_here
   YOUTUBE_CHANNEL_ID=your_channel_id_here
   
   # チャットボット機能（オプション）
   ENABLE_CHATBOT=true                    # チャットボット機能の有効/無効
   GROQ_API_KEY=your_groq_api_key_here   # Groq APIキー
   
   # RAG機能（オプション）
   GEMINI_API_KEY=your_gemini_api_key_here
   UPSTASH_VECTOR_REST_URL=your_upstash_vector_url_here
   UPSTASH_VECTOR_REST_TOKEN=your_upstash_vector_token_here
   
   # 管理機能（オプション）
   ADMIN_API_KEY=your_admin_api_key_here
   ```

   ### チャットボット機能の制御
   
   - `ENABLE_CHATBOT=false`: チャットボット機能を完全に無効化
   - `ENABLE_CHATBOT=true` または未設定: `GROQ_API_KEY`の存在で自動判定
   - `GROQ_API_KEY`未設定: チャットボタンが非表示になり、API呼び出しでエラーメッセージ

4. **開発サーバーの起動**
   ```bash
   pnpm dev
   ```

 ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 📁 プロジェクト構造

```
├── app/                    # Next.js App Router
│   ├── api/chat/          # チャットボットAPI
│   ├── actions.ts         # Server Actions
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   ├── loading.tsx        # ローディングコンポーネント
│   ├── not-found.tsx      # 404ページ
│   └── page.tsx           # メインページ
├── components/            # Reactコンポーネント
│   ├── ui/               # 再利用可能なUIコンポーネント
│   ├── backgrounds/      # 背景アニメーションコンポーネント
│   │   ├── neon-squares.tsx      # ネオン四角形アニメーション
│   │   ├── floating-particles.tsx # 浮遊音符アニメーション
│   │   └── background-manager.tsx # 背景エフェクト管理
│   ├── music/            # 音楽テーマコンポーネント
│   │   ├── audio-visualizer.tsx  # スペクトラムバー
│   │   └── vinyl-record.tsx      # レコード回転アニメーション
│   ├── chatbot/          # チャットボット関連コンポーネント
│   ├── video-ranking.tsx # 動画ランキング表示
│   ├── video-detail-dialog.tsx # 動画詳細ダイアログ
│   ├── refresh-button.tsx # 更新ボタン
│   └── ...               # その他のコンポーネント
├── lib/                  # ユーティリティ関数
├── hooks/                # カスタムフック
├── styles/               # スタイルファイル
└── public/               # 静的ファイル
```

## 🔧 利用可能なスクリプト

- `pnpm dev` - 開発サーバーの起動
- `pnpm build` - プロダクションビルド
- `pnpm start` - プロダクションサーバーの起動
- `pnpm lint` - ESLintによるコードチェック
- `pnpm index-videos` - Vector DBに動画データをインデックス
- `pnpm validate-index` - Vector DBのデータ検証とクリーンアップ

## 🌐 デプロイ

このアプリケーションはVercel、Netlify、その他のNext.jsをサポートするプラットフォームにデプロイできます。

### Vercelでのデプロイ

1. [Vercel](https://vercel.com)にプロジェクトをインポート
2. 環境変数を設定:
   - `YOUTUBE_API_KEY`: YouTube Data API v3のキー
   - `GROQ_API_KEY`: Groq APIのキー
3. デプロイを実行

## 🤖 チャットボット機能

画面左下のチャットボタンをクリックすると、AIアシスタントが利用できます：

- **動画検索**: 「歌ってみた動画を教えて」「最新の動画は？」など
- **統計情報**: 「一番人気の動画は？」「再生回数の多い動画は？」など
- **質問応答**: YuNiの動画に関する様々な質問に回答

チャットボットはGroq APIのLlama 3.3 70Bモデルを使用し、RAG（Retrieval-Augmented Generation）システムで動画データベースから関連情報を検索して回答します。

### RAGシステム

- **Vector DB**: Upstash Vectorを使用した高速な意味検索
- **埋め込み**: Google Gemini text-embedding-004モデル
- **検索の種類**:
  - 一般検索: タイトルや説明文による意味的検索
  - 統計検索: 再生回数やいいね数を考慮した統計的検索

### Vector DBの管理

```bash
# 動画データをVector DBにインデックス
pnpm index-videos

# データの検証とクリーンアップ
pnpm validate-index
```

## 📊 データ更新について

- **自動更新**: 1時間ごとにデータが自動更新されます
- **手動更新**: ページ上の更新ボタンでいつでも最新データを取得できます
- **キャッシュ**: Next.jsのISR（Incremental Static Regeneration）を使用してパフォーマンスを最適化

## 🎨 デザインシステム

### ネオンテーマ
- **カラーパレット**: ピンク、シアン、グリーン、パープル、オレンジ、イエロー
- **グロー効果**: CSS box-shadowによるネオンライト風エフェクト
- **音楽テイスト**: レコード、音符、スペクトラムバーなどの音楽要素

### アニメーション
- **Framer Motion**: スムーズなページトランジション
- **Canvas描画**: 背景の動的エフェクト
- **CSS Transform**: 軽量なホバーアニメーション

## 🔧 パフォーマンス監視

### 実装されている最適化
- **FPS制限**: デバイス性能に応じた動的調整
- **要素数制限**: 画面サイズに応じた適切な要素数
- **描画最適化**: 不要な描画処理の削減
- **メモリ管理**: アニメーションのクリーンアップ

### 推奨環境
- **デスクトップ**: Chrome/Firefox/Safari最新版
- **モバイル**: iOS Safari 14+、Android Chrome 90+
- **CPU**: 4コア以上推奨（2コアでも動作可能）
