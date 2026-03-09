# ドキュメント一覧

このフォルダの構成と、どのドキュメントを読むかの目安です。増えても「まず README を見る」でたどれます。

---

## よく使う（運用・設定）

| ドキュメント | 内容 |
|-------------|------|
| [email/EMAIL_SETUP.md](./email/EMAIL_SETUP.md) | メール通知の基本設定（Resend、ID・パスワード表示、D1 手動登録） |
| [email/EMAIL_SETUP_GUIDE.md](./email/EMAIL_SETUP_GUIDE.md) | メール送信の詳細（独自ドメイン検証、DNS 設定） |
| [embed/EXTERNAL_EMBED.md](./embed/EXTERNAL_EMBED.md) | 外部サイトへのチャット埋め込み（貼り付け方、[[UID]] / [[UPASS]] 等） |
| [db/README.md](./db/README.md) | D1 の役割・テーブル一覧・運用ルール |
| [db/commands.md](./db/commands.md) | D1 マイグレーション実行コマンド |

---

## 設計・検討・チェックリスト

| ドキュメント | 内容 |
|-------------|------|
| [design/NOTIFICATION_DESIGN.md](./design/NOTIFICATION_DESIGN.md) | 通知方式の比較（メール / Web Push / クライアント通知 等） |
| [email/EMAIL_VERIFICATION_PLAN.md](./email/EMAIL_VERIFICATION_PLAN.md) | [[UADDRESS]] 等の検証プラン（メール機能の検証手順） |
| [design/WEB_PUSH_CHECKLIST.md](./design/WEB_PUSH_CHECKLIST.md) | Web Push 実装時のチェックリスト |

---

## トラブルシュート・運用手順

| ドキュメント | 内容 |
|-------------|------|
| [runbook/troubleshoot-failed-fetch.md](./runbook/troubleshoot-failed-fetch.md) | 「Failed to fetch」の原因切り分け |
| [archive/diagnosis-2026-02-23.md](./archive/diagnosis-2026-02-23.md) | 現状診断メモ（2026-02-23 時点の構成・例外処理） |

---

## その他

| ドキュメント | 内容 |
|-------------|------|
| [persona/junya_spec.md](./persona/junya_spec.md) | キャラクター（佐藤淳也）の仕様 |
| [db/snapshots/](./db/snapshots/) | D1 スキーマのスナップショット（日付付き） |
| [archive/方針_解決済み案件とドキュメント整理.md](./archive/方針_解決済み案件とドキュメント整理.md) | 解決済み案件の扱い・docs 整理の Cursor 提案まとめ |

---

## フォルダ構成

| フォルダ | 用途 |
|----------|------|
| **email/** | メール通知の設定・検証・ガイド |
| **embed/** | 外部サイトへの埋め込み手順 |
| **design/** | 通知方式の設計・Web Push チェックリスト |
| **runbook/** | 運用時のトラブルシュート手順 |
| **db/** | D1 の説明・マイグレーションコマンド・スナップショット |
| **persona/** | キャラクター仕様 |
| **archive/** | 過去の検討・診断メモ・方針メモ |

---

## 整理のルール（今後の増やし方）

- **新規ドキュメント**は、上のどれかのカテゴリに当てはまる場合は **この README に1行追加**する。
- **一時的なメモ・完了した検討**は、必要なら `archive/` に移動する（README には「archive：過去の検討・メモ」として記載）。
- **日付付きの診断メモ**（`diagnosis-*.md` など）は、古くなったら `archive/` に移すとルートがすっきりする。

この README を「docs の入口」にしておけば、ファイルが増えても一覧で追いかけられます。
