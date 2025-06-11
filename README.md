# YuNi Stellar Chart

YuNiの動画パフォーマンスを人気度、エンゲージメント、再生数でランキング表示するNext.jsアプリケーションです。

## 🌟 機能

- **動画ランキング表示**: 人気度、エンゲージメント、再生数による3つの指標でランキング
- **多言語対応**: 日本語、英語、中国語、韓国語に対応
- **リアルタイム更新**: 1時間ごとの自動更新とマニュアル更新機能
- **レスポンシブデザイン**: モバイル・デスクトップ両対応
- **ダークモード**: ライト/ダークテーマの切り替え
- **詳細情報表示**: 動画の詳細情報をダイアログで表示

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15.2.4 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: Radix UI
- **チャート**: Recharts
- **フォーム**: React Hook Form + Zod
- **API**: YouTube Data API v3

## 📋 前提条件

- Node.js 18.0.0以上
- pnpm (推奨) または npm
- YouTube Data API v3のAPIキー

## 🚀 セットアップ

1. **リポジトリのクローン**
   \`\`\`bash
   git clone https://github.com/your-username/yuni-youtube-analytics.git
   cd yuni-youtube-analytics
   \`\`\`

2. **依存関係のインストール**
   \`\`\`bash
   pnpm install
   \`\`\`

3. **環境変数の設定**
   
   `.env.local`ファイルを作成し、以下の環境変数を設定してください：
   \`\`\`env
   YOUTUBE_API_KEY=your_youtube_api_key_here
   \`\`\`

4. **開発サーバーの起動**
   \`\`\`bash
   pnpm dev
   \`\`\`

   ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 📁 プロジェクト構造

\`\`\`
├── app/                    # Next.js App Router
│   ├── actions.ts         # Server Actions
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   ├── loading.tsx        # ローディングコンポーネント
│   ├── not-found.tsx      # 404ページ
│   └── page.tsx           # メインページ
├── components/            # Reactコンポーネント
│   ├── ui/               # 再利用可能なUIコンポーネント
│   ├── video-ranking.tsx # 動画ランキング表示
│   ├── video-detail-dialog.tsx # 動画詳細ダイアログ
│   ├── refresh-button.tsx # 更新ボタン
│   └── ...               # その他のコンポーネント
├── lib/                  # ユーティリティ関数
├── hooks/                # カスタムフック
├── styles/               # スタイルファイル
└── public/               # 静的ファイル
\`\`\`

## 🔧 利用可能なスクリプト

- `pnpm dev` - 開発サーバーの起動
- `pnpm build` - プロダクションビルド
- `pnpm start` - プロダクションサーバーの起動
- `pnpm lint` - ESLintによるコードチェック

## 🌐 デプロイ

このアプリケーションはVercel、Netlify、その他のNext.jsをサポートするプラットフォームにデプロイできます。

### Vercelでのデプロイ

1. [Vercel](https://vercel.com)にプロジェクトをインポート
2. 環境変数 `YOUTUBE_API_KEY` を設定
3. デプロイを実行

## 📊 データ更新について

- **自動更新**: 1時間ごとにデータが自動更新されます
- **手動更新**: ページ上の更新ボタンでいつでも最新データを取得できます
- **キャッシュ**: Next.jsのISR（Incremental Static Regeneration）を使用してパフォーマンスを最適化
