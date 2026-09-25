// ISSセレクターのデータを取得するスクレイパー。
//
// 使い方：
//   node scripts/scrape-iss.mjs
//
// I-O DATAの保守サービス検索（ISS）が使っている非公開API
//   https://contact.iodata.jp/support/iss/search/json.php
// を叩いて、対応する型番と保守プランの一覧を集める。
// 公式サイトの検索ページ（search.htm）の埋め込みJS（prodsearch.js）が
// このAPIをjQueryのJSONP形式（?c=?）で呼んでいるのと同じ挙動を、
// Node側でも「固定のコールバック名を付けて呼び、レスポンス文字列から
// 括弧の中身だけ取り出す」ことで再現している。
//
// 型番の集め方（探索）：
//   検索ボックスに文字を打ったときのオートコンプリート（候補表示）と同じ
//   エンドポイントを使う。【動作確認済み】このAPIは1回の問い合わせで
//   件数の上限なく該当候補を全部返してくるため（"HDL"の3文字だけで638件、
//   "APS"で4件、"APX"で18件、合計660件＝過去データと完全一致）、
//   "HDL" "APS" "APX" の3回問い合わせるだけで型番を全件集められる。
//   念のため、将来的にAPI側に件数上限が付いた場合に備えて「候補が
//   RESULT_EXPAND_THRESHOLD件以上返ってきたら次の1文字を足して深掘りする」
//   という仕組みは残してあるが、既定では無効化してある（Infinity）。
//   有効化する場合や、想定より深く潜ってしまった場合の歯止めとして、
//   問い合わせ回数の上限（MAX_TOTAL_REQUESTS）も設けている。

import fs from "node:fs/promises";

const API_URL = "https://contact.iodata.jp/support/iss/search/json.php";
const OUTPUT_PATH = new URL("../data/iss-services.json", import.meta.url);

const REQUEST_INTERVAL_MS = 2000;

const USER_AGENT =
  "IssSelectorBot/1.0 (+https://github.com/ioplaza02/nas-iss-selector; " +
  "weekly maintenance-plan lookup check for internal comparison tool)";

// 探索の起点。NASは HDL、業務用サーバー機は APS/APX、RHDシリーズは別扱いのため除外。
const SEED_PREFIXES = ["HDL", "APS", "APX"];

// 【動作確認済み】このAPIは1回の問い合わせで、件数の上限なく該当する候補を
// 全部返してくる（"HDL"の3文字だけで638件、"APS"で4件、"APX"で18件、
// 合計660件＝過去の実データと完全一致）。そのため深掘り探索は不要と判明した。
// この値をInfinityにして、深掘り（枝分かれ）を無効化している。
// もし将来的に「HDL」で返る件数が増えすぎて上限に引っかかるようになったら、
// ここを有限の値（例：500）に戻せば、また深掘りするようになる。
const RESULT_EXPAND_THRESHOLD = Infinity;

// 深掘りする際に末尾へ足していく候補文字（型番でよく使われるもの）
const EXPAND_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/".split("");

// 型番の探索クエリはこれ以上長くしない（無限に深掘りしないための歯止め）
const MAX_QUERY_LENGTH = 14;

// 想定外の組み合わせ爆発を起こしても実行時間が無限に伸びないようにする歯止め。
// 2秒間隔なので、3000回でおよそ100分。
const MAX_TOTAL_REQUESTS = 3000;

// 1回の問い合わせが固まって（応答が返ってこなくて）永遠に待ち続けることがないよう、
// この時間を超えたら諦めて次に進む。
const REQUEST_TIMEOUT_MS = 15000;

// 動作確認用の簡易モード。環境変数 ISS_QUICK_TEST=1 を付けて実行すると、
// 深掘り探索をせず、型番も先頭5件だけ保守サービスを取得して終わる。
// 通信・パース処理がちゃんと動くかを1分程度で確認できる。
const QUICK_TEST = process.env.ISS_QUICK_TEST === "1";

let totalRequests = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ISS検索APIをjQueryのJSONP形式（?c=?）と同じやり方で呼び出し、
// レスポンス文字列から中身のJSONだけを取り出す。
async function callIssApi(params) {
  if (totalRequests >= MAX_TOTAL_REQUESTS) {
    throw new Error(`MAX_TOTAL_REQUESTS(${MAX_TOTAL_REQUESTS})に達したため、これ以上は問い合わせません。`);
  }
  totalRequests += 1;

  const url = new URL(API_URL);
  url.searchParams.set("c", "issScrapeCallback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (e) {
    throw new Error(`通信に失敗（タイムアウトまたはネットワークエラー）: ${e.message}`);
  }
  if (!res.ok) {
    throw new Error(`ISS API HTTP ${res.status}: ${url}`);
  }
  const text = (await res.text()).trim();
  if (!text) return null;

  // "issScrapeCallback([...]);" のようなJSONP形式から中身だけ取り出す。
  // 素のJSONで返ってきた場合は、そのままparseする。
  const m = text.match(/^[\w$.]+\((.*)\)\s*;?$/s);
  const jsonText = m ? m[1] : text;
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error(`JSONのparseに失敗しました（先頭200文字）: ${text.slice(0, 200)}`);
    return null;
  }
}

// オートコンプリート（検索候補一覧）を取得する
async function autocomplete(query) {
  const data = await callIssApi({ n: query, a: 2, o: "utf8", r: "seihin" });
  if (!Array.isArray(data)) return [];
  return data.filter((item) => item && typeof item.name === "string" && item.name.trim());
}

// 指定した型番（完全一致）の、対応保守サービス一覧を取得する
async function fullSearch(modelName) {
  const data = await callIssApi({ n: modelName, o: "utf8" });
  if (!Array.isArray(data)) return [];
  return data;
}

// ---------- 型番の探索（幅優先） ----------

async function discoverModelNames() {
  const found = new Map(); // 大文字化した型番 -> 元の表記
  const visited = new Set();
  const queue = [...SEED_PREFIXES];

  while (queue.length > 0) {
    const q = queue.shift();
    const qKey = q.toUpperCase();
    if (visited.has(qKey)) continue;
    visited.add(qKey);

    let items = [];
    try {
      items = await autocomplete(q);
    } catch (e) {
      console.error(`  [${totalRequests}] "${q}" -> オートコンプリート失敗: ${e.message}`);
      if (e.message.includes("MAX_TOTAL_REQUESTS")) break;
      await sleep(REQUEST_INTERVAL_MS);
      continue;
    }
    await sleep(REQUEST_INTERVAL_MS);

    for (const item of items) {
      found.set(item.name.toUpperCase(), item.name);
    }

    // 1回ごとに進捗を出す。「動いているか固まっているか分からない」を防ぐため。
    console.log(`  [${totalRequests}回目] "${q}" -> ${items.length}件（累計発見: ${found.size}件 / 残りキュー: ${queue.length}件）`);

    // 候補が多い＝まだ絞り込み不足の可能性が高いので、次の1文字を足して深掘りする
    if (!QUICK_TEST && items.length >= RESULT_EXPAND_THRESHOLD && q.length < MAX_QUERY_LENGTH) {
      for (const ch of EXPAND_CHARS) {
        queue.push(q + ch);
      }
    }
  }

  console.log(`型番探索: ${totalRequests}回の問い合わせで ${found.size}件の型番候補を発見しました。`);
  return [...found.values()];
}

// ---------- サービスコードの分類 ----------
// 実際に集めていた過去データ（10,502件のサービスレコード）を全件調べて、
// 例外なく成立していたルール。ISS-{family}-{2文字のtypecode}{年数}{Fの場合あり}
//   PO=訪問(HDD返却不要) / PR=訪問(HDD返却必要)
//   SO=デリバリィ(HDD返却不要) / ST=デリバリィ(HDD返却必要)
//   UO=当日訪問(HDD返却不要) / UL=当日訪問(HDD返却必要)
//   SD=センドバック（保証期間延長。HDD返却の概念自体が無いのでnull）
const TYPE_CODE_RULES = {
  PO: { method: "onsite", hddReturnRequired: false },
  PR: { method: "onsite", hddReturnRequired: true },
  SO: { method: "delivery", hddReturnRequired: false },
  ST: { method: "delivery", hddReturnRequired: true },
  UO: { method: "onsite_sameday", hddReturnRequired: false },
  UL: { method: "onsite_sameday", hddReturnRequired: true },
  SD: { method: "sendback", hddReturnRequired: null }
};

function classifyCode(code, displayName) {
  const m = /^ISS-([A-Z0-9]+)-([A-Za-z]{2})\d+F?$/.exec(code || "");
  const family = m ? m[1] : null;
  const typeCode = m ? m[2].toUpperCase() : null;
  const rule = typeCode && TYPE_CODE_RULES[typeCode];

  const name = displayName || "";
  // 延長パック・オプション単体は、現時点の実データには出現しないが、
  // 将来サービス名にこれらの語が含まれるものが出てきた場合に備えて判定する。
  const isExtension = /延長パック|既存(の)?加入者/.test(name);
  const isOption = !isExtension && /オプション/.test(name) && !rule;

  return {
    family: family || "OTHER",
    method: rule ? rule.method : (isOption ? "option" : "unknown"),
    hddReturnRequired: rule ? rule.hddReturnRequired : null,
    isExtension,
    isOption
  };
}

// APIレスポンスの1レコードを、iss-services.json の1サービスの形に変換する
function normalizeService(raw) {
  const code = raw.iss_seihin_mei || "";
  const displayName = raw.iss_hyouji_mei || code;
  const classified = classifyCode(code, displayName);

  const priceExclTax = raw.iss_price != null
    ? Number(String(raw.iss_price).replace(/,/g, "")) || null
    : null;

  // APIが返す可能性のあるフィールド名の候補を順に探す（未確認のため保険）
  const serviceStart =
    raw.hanbai_kaishibi || raw.service_start || raw.iss_start_date || raw.start_date || null;
  const serviceEnd =
    raw.hanbai_shuryobi || raw.service_end || raw.iss_end_date || raw.end_date || null;

  return {
    code,
    name: displayName,
    years: Number(raw.hosho_kkn) || 0,
    months: Number(raw.hosho_kkn_m) || 0,
    priceExclTax,
    url: raw.iss_url || null,
    serviceStart: serviceStart || null,
    serviceEnd: serviceEnd || null,
    family: classified.family,
    method: classified.method,
    hddReturnRequired: classified.hddReturnRequired,
    isExtension: classified.isExtension,
    isOption: classified.isOption
  };
}

// ---------- メイン処理 ----------

async function main() {
  if (QUICK_TEST) {
    console.log("=== 簡易動作確認モード（ISS_QUICK_TEST=1）で実行します ===");
  }
  console.log("型番の探索を開始します…（1回ごとに進捗を表示します）");
  let modelNames = await discoverModelNames();

  if (QUICK_TEST) {
    modelNames = modelNames.slice(0, 5);
    console.log(`簡易モードのため、先頭${modelNames.length}件だけ保守サービスを取得します。`);
  }

  console.log(`${modelNames.length}件の型番について、保守サービスを取得します…`);

  const products = [];
  let processed = 0;

  for (const model of modelNames) {
    let services = [];
    try {
      const raw = await fullSearch(model);
      services = raw.map(normalizeService).filter((s) => s.code);
    } catch (e) {
      console.error(`保守サービス取得失敗（"${model}"）: ${e.message}`);
      if (e.message.includes("MAX_TOTAL_REQUESTS")) break;
    }
    await sleep(REQUEST_INTERVAL_MS);

    processed += 1;
    console.log(`  [${processed}/${modelNames.length}] "${model}" -> ${services.length}件の保守サービス`);

    if (services.length > 0) {
      products.push({ model, services });
    }
  }

  const output = {
    updatedAt: new Date().toISOString(),
    products
  };

  await fs.mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`完了: ${products.length}件の型番（対応サービスあり）を data/iss-services.json に書き出しました。`);
  console.log(`（総問い合わせ回数: ${totalRequests}回）`);
}

main().catch((e) => {
  console.error("スクレイピング中に予期しないエラーが発生しました:", e);
  process.exit(1);
});
