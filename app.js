(() => {
  "use strict";

  const SITE_PASSWORD = "iss2026";
  const STORAGE_KEY = "iss-selector-auth";

  const gate = document.getElementById("password-gate");
  const appRoot = document.getElementById("app-root");
  const form = document.getElementById("password-form");
  const input = document.getElementById("password-input");
  const toggle = document.getElementById("password-toggle");
  const errorMsg = document.getElementById("password-error");

  function unlock() {
    gate.hidden = true;
    appRoot.hidden = false;
    initApp();
  }

  if (localStorage.getItem(STORAGE_KEY) === "1") {
    unlock();
  } else {
    input.focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === SITE_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      errorMsg.hidden = true;
      unlock();
    } else {
      errorMsg.hidden = false;
    }
  });

  toggle.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
  });

  // ---------- ここから先はパスワード認証後に実行する本体ロジック ----------

  function initApp() {

  const ICONS = {
    onsite: `<img src="images/on_image.png" alt="訪問安心保守（オンサイト）">`,
    onsite_sameday: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="16" cy="8" r="4"/>
      <path d="M16 12 L9 22 L17 26 L13 38"/>
      <path d="M9 22 L1 25"/>
      <path d="M13 38 L5 44"/>
      <path d="M13 38 L21 43"/>
      <rect x="20" y="20" width="10" height="8" rx="1.5"/>
      <path d="M23 20 V18 H27 V20"/>
      <path d="M42 8 L35 21 L41 21 L34 34"/>
    </svg>`,
    delivery: `<img src="images/de_image.png" alt="交換品お届け保守（デリバリィ）">`,
    sendback: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="19" width="21" height="21" rx="1"/>
      <path d="M12 26 H33"/>
      <path d="M22.5 19 V40"/>
      <path d="M38 15 A12 12 0 1 1 27 7"/>
      <path d="M38 15 V8"/>
      <path d="M38 15 H31"/>
    </svg>`
  };

  // 流れ図で使う汎用の小アイコン（故障発生・問い合わせ・確認・完了）
  const STEP_ICONS = {
    trouble: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M24 6 L44 40 H4 Z"/>
      <line x1="24" y1="18" x2="24" y2="27"/>
      <circle cx="24" cy="33" r="1.3" fill="currentColor" stroke="none"/>
    </svg>`,
    inquiry: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="10" width="36" height="22" rx="4"/>
      <path d="M16 32 L12 40 L22 32"/>
      <line x1="14" y1="18" x2="34" y2="18"/>
      <line x1="14" y1="24" x2="28" y2="24"/>
    </svg>`,
    confirm: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="6" width="24" height="34" rx="2"/>
      <path d="M18 6 V4 H30 V6"/>
      <path d="M17 22 L22 27 L32 15"/>
    </svg>`,
    complete: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="24" cy="24" r="18"/>
      <path d="M15 24 L21 30 L33 17"/>
    </svg>`
  };

  // カテゴリごとの「故障発生 → 解決」の流れ図
  const FLOW_STEPS = {
    onsite: [
      { icon: STEP_ICONS.trouble, label: "故障・不調" },
      { icon: STEP_ICONS.inquiry, label: "問い合わせ" },
      { icon: STEP_ICONS.confirm, label: "不具合確認" },
      { icon: ICONS.onsite, label: "スタッフ訪問・交換" },
      { icon: STEP_ICONS.complete, label: "業務再開" }
    ],
    onsite_sameday: [
      { icon: STEP_ICONS.trouble, label: "故障・不調" },
      { icon: STEP_ICONS.inquiry, label: "問い合わせ" },
      { icon: STEP_ICONS.confirm, label: "不具合確認" },
      { icon: ICONS.onsite_sameday, label: "当日訪問・交換" },
      { icon: STEP_ICONS.complete, label: "業務再開" }
    ],
    delivery: [
      { icon: STEP_ICONS.trouble, label: "故障・不調" },
      { icon: STEP_ICONS.inquiry, label: "問い合わせ" },
      { icon: ICONS.delivery, label: "交換品お届け" },
      { icon: STEP_ICONS.confirm, label: "お客様で交換" },
      { icon: STEP_ICONS.complete, label: "業務再開" }
    ],
    sendback: [
      { icon: STEP_ICONS.trouble, label: "故障・不調" },
      { icon: STEP_ICONS.inquiry, label: "修理を申込み" },
      { icon: ICONS.sendback, label: "発送・検査修理" },
      { icon: STEP_ICONS.complete, label: "返却・完了" }
    ]
  };

  const el = (sel) => document.querySelector(sel);
  const modelInput = el("#model-input");
  const suggestBox = el("#model-suggest");
  const emptyState = el("#empty-state");
  const resultWrap = el("#result-wrap");
  const resultImage = el("#result-image");
  const resultDesc = el("#result-desc");
  const resultModel = el("#result-model");
  const resultCount = el("#result-count");
  const planGroups = el("#plan-groups");
  const shareBtn = el("#share-btn");
  const shareFeedback = el("#share-feedback");
  const filterReset = el("#filter-reset");
  const updatedAtEl = el("#updated-at");

  let allProducts = [];
  let currentProduct = null;
  let dataLoaded = false;
  let highlightedIndex = -1;

  // 生産終了品の型番一覧・商品画像／説明（NASセレクター側の products.json から読み込む）。
  // スキーマ：{ products: [{ name, imageUrl, status, variants: [{ sku, status }] }] }
  // 型番（ISS側の model）は variants[].sku と対応する。sku 単位・シリーズ単位どちらの
  // status が「生産終了」でもそのSKUは除外する。取得に失敗しても検索自体は続行し、
  // 絞り込み・画像表示を行わないだけにする（fail-safe）。
  let discontinuedModels = new Set();
  let modelInfoMap = new Map();
  fetch("https://ioplaza02.github.io/nas-selector/data/products.json")
    .then((res) => res.json())
    .then((data) => {
      const list = data.products || [];
      list.forEach((p) => {
        const info = { image: p.imageUrl || null, desc: p.name || null };
        const variants = p.variants || [];
        variants.forEach((v) => {
          if (!v.sku) return;
          const skuUpper = String(v.sku).toUpperCase();
          modelInfoMap.set(skuUpper, info);
          if (v.status === "生産終了" || p.status === "生産終了") {
            discontinuedModels.add(skuUpper);
          }
        });
      });
      // 生産終了データ・画像データが反映された状態で、
      // 検索欄に文字が残っていれば再検索し、選択中の商品があれば画像・説明を更新する
      if (modelInput.value.trim()) {
        modelInput.dispatchEvent(new Event("input"));
      }
      applyProductInfo();
    })
    .catch(() => {
      // NASセレクター側のデータが取得できない場合は、生産終了フィルター・画像表示を行わない
    });

  // 検索結果ヘッダーに、NASセレクター側から取得した商品画像・製品名を反映する
  function applyProductInfo() {
    if (!currentProduct) return;
    const info = modelInfoMap.get(currentProduct.model.toUpperCase());
    if (info && info.image) {
      resultImage.src = info.image;
      resultImage.alt = currentProduct.model;
      resultImage.hidden = false;
    } else {
      resultImage.hidden = true;
    }
    if (info && info.desc) {
      resultDesc.textContent = info.desc;
      resultDesc.hidden = false;
    } else {
      resultDesc.hidden = true;
    }
  }

  // ---------- URLパラメータの復元（共有リンク・NASセレクター連携用） ----------

  function applyStateFromUrl() {
    const params = new URLSearchParams(location.search);
    const model = params.get("model");
    if (model) modelInput.value = model;

    const methods = params.get("methods");
    if (methods) {
      const list = methods.split(",");
      filterPanelEl().querySelectorAll('input[name="method"]').forEach((c) => {
        c.checked = list.includes(c.value);
      });
    }

    const hdd = params.get("hdd");
    if (hdd) {
      const target = filterPanelEl().querySelector(`input[name="hdd-return"][value="${hdd}"]`);
      if (target) target.checked = true;
    }

    const years = params.get("years");
    if (years) {
      const target = filterPanelEl().querySelector(`input[name="default-years"][value="${years}"]`);
      if (target) target.checked = true;
    }

    if (params.get("hideExt") === "1") el("#hide-extension").checked = true;
    if (params.get("hideOpt") === "1") el("#hide-option").checked = true;
  }

  function filterPanelEl() {
    return document.querySelector(".filter-panel");
  }

  applyStateFromUrl();

  fetch("data/iss-services.json")
    .then((res) => res.json())
    .then((data) => {
      allProducts = data.products || [];
      dataLoaded = true;
      renderUpdatedAt(data.updatedAt);
      // データの読み込みが完了する前に型番を入力し終えているケースがあるため、
      // 読み込み完了時点で検索欄に文字が残っていれば、あらためて検索し直す。
      if (modelInput.value.trim()) {
        modelInput.dispatchEvent(new Event("input"));
      }
    })
    .catch(() => {
      updatedAtEl.textContent = "データの読み込みに失敗しました。時間をおいて再度お試しください。";
    });

  function renderUpdatedAt(iso) {
    if (!iso) return;
    const d = new Date(iso);
    const formatted = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const daysSince = (Date.now() - d.getTime()) / 86400000;
    updatedAtEl.textContent = `データ最終更新日：${formatted}` +
      (daysSince > 40 ? "（40日以上更新されていません。最新情報は公式サイトでご確認ください）" : "");
  }

  // ---------- 型番検索・オートコンプリート ----------

  function findMatches(query) {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return allProducts.filter((p) => p.model.toUpperCase().includes(q) && !discontinuedModels.has(p.model.toUpperCase()));
  }

  modelInput.addEventListener("input", () => {
    const q = modelInput.value.trim();
    if (!q) {
      suggestBox.hidden = true;
      showEmptyState();
      return;
    }
    const allMatches = findMatches(q);
    const matches = allMatches.slice(0, 30);
    if (matches.length === 0) {
      suggestBox.hidden = true;
      if (!dataLoaded) {
        showLoading(q);
      } else {
        showNoMatch(q);
      }
      return;
    }
    suggestBox.innerHTML = "";
    highlightedIndex = -1;
    matches.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = p.model;
      btn.addEventListener("click", () => {
        modelInput.value = p.model;
        suggestBox.hidden = true;
        selectProduct(p);
      });
      suggestBox.appendChild(btn);
    });
    if (allMatches.length > matches.length) {
      const note = document.createElement("p");
      note.className = "search__suggest-note";
      note.textContent = `ほか${allMatches.length - matches.length}件。もう少し文字を入れると絞り込めます`;
      suggestBox.appendChild(note);
    }
    suggestBox.hidden = false;

    // 完全一致が1件だけなら、それを即座に表示する
    const exact = allProducts.find((p) => p.model.toUpperCase() === q.toUpperCase() && !discontinuedModels.has(p.model.toUpperCase()));
    if (exact) selectProduct(exact);
  });

  // 矢印キー（↑↓）で候補を選び、Enterで確定できるようにする
  modelInput.addEventListener("keydown", (e) => {
    if (suggestBox.hidden) return;
    const buttons = Array.from(suggestBox.querySelectorAll("button"));
    if (buttons.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % buttons.length;
      updateHighlight(buttons);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + buttons.length) % buttons.length;
      updateHighlight(buttons);
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < buttons.length) {
        e.preventDefault();
        buttons[highlightedIndex].click();
      }
    } else if (e.key === "Escape") {
      suggestBox.hidden = true;
    }
  });

  function updateHighlight(buttons) {
    buttons.forEach((btn, i) => {
      btn.classList.toggle("search__suggest-btn--active", i === highlightedIndex);
    });
    const active = buttons[highlightedIndex];
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) suggestBox.hidden = true;
  });

  function selectProduct(product) {
    currentProduct = product;
    renderResults();
  }

  function showEmptyState() {
    currentProduct = null;
    emptyState.hidden = false;
    resultWrap.hidden = true;
    shareBtn.hidden = true;
    resultImage.hidden = true;
    resultDesc.hidden = true;
  }

  function showLoading(query) {
    currentProduct = null;
    emptyState.hidden = true;
    resultWrap.hidden = false;
    shareBtn.hidden = true;
    resultImage.hidden = true;
    resultDesc.hidden = true;
    resultModel.textContent = query;
    resultCount.textContent = "";
    planGroups.innerHTML = `
      <div class="no-match">
        データを読み込んでいます。少しお待ちください…（サイズが大きいため、初回は数秒かかることがあります）
      </div>`;
  }

  function showNoMatch(query) {
    currentProduct = null;
    emptyState.hidden = true;
    resultWrap.hidden = false;
    shareBtn.hidden = true;
    resultImage.hidden = true;
    resultDesc.hidden = true;
    resultModel.textContent = query;
    resultCount.textContent = "";
    planGroups.innerHTML = `
      <div class="no-match">
        「${escapeHtml(query)}」に一致する型番が見つかりませんでした。型番の一部だけでも検索できます（例：LX04 → HDL4-LX04）。
      </div>`;
  }

  // ---------- 絞り込み条件 ----------

  const filterPanel = document.querySelector(".filter-panel");
  filterPanel.addEventListener("change", () => {
    if (currentProduct) renderResults();
  });

  filterReset.addEventListener("click", () => {
    filterPanel.querySelectorAll('input[name="method"]').forEach((c) => (c.checked = true));
    filterPanel.querySelector('input[name="hdd-return"][value="any"]').checked = true;
    filterPanel.querySelector('input[name="default-years"][value="any"]').checked = true;
    el("#hide-extension").checked = false;
    el("#hide-option").checked = false;
    if (currentProduct) renderResults();
  });

  function getActiveFilters() {
    const methods = Array.from(filterPanel.querySelectorAll('input[name="method"]:checked')).map((c) => c.value);
    const hddReturn = filterPanel.querySelector('input[name="hdd-return"]:checked').value;
    const defaultYearsInput = filterPanel.querySelector('input[name="default-years"]:checked');
    const defaultYears = defaultYearsInput ? defaultYearsInput.value : "any";
    const hideExtension = el("#hide-extension").checked;
    const hideOption = el("#hide-option").checked;
    return { methods, hddReturn, defaultYears, hideExtension, hideOption };
  }

  function buildShareUrl() {
    if (!currentProduct) return location.href;
    const { methods, hddReturn, defaultYears, hideExtension, hideOption } = getActiveFilters();
    const params = new URLSearchParams();
    params.set("model", currentProduct.model);
    if (methods.length > 0) params.set("methods", methods.join(","));
    if (hddReturn !== "any") params.set("hdd", hddReturn);
    if (defaultYears !== "any") params.set("years", defaultYears);
    if (hideExtension) params.set("hideExt", "1");
    if (hideOption) params.set("hideOpt", "1");
    return `${location.origin}${location.pathname}?${params.toString()}`;
  }

  shareBtn.addEventListener("click", async () => {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      // クリップボードAPIが使えない環境向けのフォールバック
      window.prompt("このURLをコピーしてください", url);
      return;
    }
    shareFeedback.hidden = false;
    shareFeedback.textContent = "URLをコピーしました";
    setTimeout(() => { shareFeedback.hidden = true; }, 2500);
  });

  // ---------- 結果表示 ----------

  let cardVariantMap = {};
  let cardCounter = 0;

  // 画面に表示する「大枠」の構成。本家の料金・型番一覧ページと同じ構造で、
  // 「訪問安心保守（オンサイト）」の中に「ベーシックプラン」「当日訪問プラン」の
  // 2段階がある、という入れ子構造をそのまま再現する。
  // colorKey はカードの色分け（オンサイト＝青／デリバリィ＝緑）に使う。
  const TOP_GROUPS = [
    {
      icon: ICONS.onsite,
      title: "訪問安心保守（オンサイト）",
      desc: "スタッフが訪問し、交換・復旧作業まで行います（自分で作業できない方向け）",
      colorKey: "onsite",
      subgroups: [
        { key: "onsite", title: "ベーシックプラン" },
        { key: "onsite_sameday", title: "当日訪問プラン（上位プラン）" }
      ]
    },
    {
      icon: ICONS.delivery,
      title: "交換品お届け保守（デリバリィ）",
      desc: "交換品が先に届き、ご自身で交換作業を行います（コストを抑えたい方向け）",
      colorKey: "delivery",
      subgroups: [
        { key: "delivery", title: null }
      ]
    },
    {
      icon: ICONS.sendback,
      title: "保証期間延長（センドバック）",
      desc: "故障品をお送りいただき、点検・修理後に返送してもらう保証延長サービスです",
      colorKey: null,
      subgroups: [
        { key: "sendback", title: null }
      ]
    }
  ];

  function renderResults() {
    emptyState.hidden = true;
    resultWrap.hidden = false;
    resultModel.textContent = currentProduct.model;
    shareBtn.hidden = false;
    applyProductInfo();

    const { methods, hddReturn, defaultYears, hideExtension, hideOption } = getActiveFilters();

    const filtered = currentProduct.services.filter((s) => {
      if (s.isOption) {
        if (hideOption) return false;
      } else if (s.isExtension) {
        if (hideExtension) return false;
        if (!methods.includes(s.method)) return false;
      } else {
        if (!methods.includes(s.method)) return false;
      }
      if (hddReturn === "not-required" && s.hddReturnRequired !== false) return false;
      if (hddReturn === "required" && s.hddReturnRequired !== true) return false;
      return true;
    });

    resultCount.textContent = `${filtered.length}件のプランが対応しています`;

    if (filtered.length === 0) {
      planGroups.innerHTML = `<div class="no-match">条件に一致する保守プランがありませんでした。絞り込み条件を緩めてみてください。</div>`;
      return;
    }

    // method順に一旦フラットに集計する（オプションも別枠として集計）
    const groups = {};
    filtered.forEach((s) => {
      const key = s.isOption ? "option" : s.method;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    cardVariantMap = {};
    cardCounter = 0;
    let html = "";

    TOP_GROUPS.forEach((group) => {
      const subParts = [];
      group.subgroups.forEach((sub) => {
        const items = groups[sub.key];
        if (!items || items.length === 0) return;
        subParts.push(renderSubgroup(sub.title, items, group.colorKey, defaultYears));
      });
      if (subParts.length === 0) return;
      html += renderTopGroup(group.title, group.desc, group.icon, subParts.join(""), group.colorKey);
    });

    if (groups.option && groups.option.length > 0) {
      html += renderTopGroup(
        "追加オプション",
        "既存の保守プランに追加できるオプションです",
        ICONS.delivery,
        renderSubgroup(null, groups.option, null, defaultYears),
        null
      );
    }

    planGroups.innerHTML = html;
    bindCardEvents();
  }

  // 同じプラン（サービス名・方式・HDD返却要否などが同じ）で年数だけが違うものを
  // 1枚のカードにまとめる。年数はカード内のボタンで切り替えられるようにする。
  function groupIntoCards(items) {
    const map = new Map();
    items.forEach((s) => {
      const key = [s.method, s.hddReturnRequired, s.isExtension, s.isOption, s.name].join("|");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    const cards = Array.from(map.values()).map((variants) =>
      [...variants].sort((a, b) => (a.years || 0) - (b.years || 0))
    );
    // カテゴリをまたいで見比べやすいよう、常に「HDD返却不要タイプ」を先頭、
    // 「HDD返却必要」を次、それ以外（該当しないもの）を最後、の順に固定する
    const rank = (hddReturnRequired) => {
      if (hddReturnRequired === false) return 0;
      if (hddReturnRequired === true) return 1;
      return 2;
    };
    cards.sort((a, b) => rank(a[0].hddReturnRequired) - rank(b[0].hddReturnRequired));
    return cards;
  }

  function renderTopGroup(title, desc, icon, subHtml, colorKey) {
    const groupClass = colorKey ? `plan-group plan-group--${colorKey}` : "plan-group";
    return `
      <div class="${groupClass}">
        <div class="plan-group__header">
          <span class="plan-group__icon">${icon || ""}</span>
          <div>
            <p class="plan-group__title">${escapeHtml(title)}</p>
            <p class="plan-group__desc">${escapeHtml(desc)}</p>
          </div>
        </div>
        ${subHtml}
      </div>`;
  }

  function renderSubgroup(subTitle, items, colorKey, defaultYears) {
    const cards = groupIntoCards(items);
    const cardsHtml = cards.map((variants) => {
      const id = `plan-card-${cardCounter++}`;
      cardVariantMap[id] = variants;
      return renderCard(id, variants, subTitle, colorKey, defaultYears);
    }).join("");
    return `<div class="plan-group__cards">${cardsHtml}</div>`;
  }

  function renderFlow(steps) {
    const items = steps.map((step, i) => {
      const arrow = i < steps.length - 1 ? `<span class="flow-arrow">›</span>` : "";
      return `
        <div class="flow-step">
          <span class="flow-step__icon">${step.icon}</span>
          <p class="flow-step__label">${escapeHtml(step.label)}</p>
        </div>
        ${arrow}`;
    }).join("");
    return `<div class="flow-strip">${items}</div>`;
  }

  function formatYears(s) {
    return s.years ? `${s.years}年` + (s.months ? `${s.months}ヶ月` : "") : "期間不明";
  }

  function buildBadges(s) {
    const badges = [];
    if (s.hddReturnRequired === false) badges.push(`<span class="badge badge--accent">HDD返却不要</span>`);
    if (s.hddReturnRequired === true) badges.push(`<span class="badge">HDD返却必要</span>`);
    if (s.isExtension) badges.push(`<span class="badge">延長パック（既存加入者専用）</span>`);
    if (s.isOption) badges.push(`<span class="badge badge--good">オプション</span>`);
    if (s.serviceStart) {
      const d = new Date(s.serviceStart);
      if (!isNaN(d) && d.getTime() > Date.now()) {
        badges.push(`<span class="badge">${d.getFullYear()}年${d.getMonth() + 1}月以降販売分のみ</span>`);
      }
    }
    return badges.join("");
  }

  function priceInclTax(s) {
    if (!s.priceExclTax) return null;
    // 消費税10%。本家サイトの計算式（税抜×11/10）に合わせる
    return Math.round((s.priceExclTax * 11) / 10);
  }

  function priceHtml(s) {
    if (!s.priceExclTax) {
      return `<p class="plan-row__price-value">価格は公式サイトでご確認ください</p>`;
    }
    const incl = priceInclTax(s);
    return `
      <p class="plan-row__price-value">¥${incl.toLocaleString()}</p>
      <p class="plan-row__price-note">（税抜 ¥${s.priceExclTax.toLocaleString()}）</p>`;
  }

  function nameHtml(s) {
    return s.url
      ? `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`
      : escapeHtml(s.name);
  }

  // サイドバーの「初期表示の保守年数」に一致する年数の候補があれば、その index を返す
  function pickInitialIndex(variants, defaultYears) {
    if (defaultYears && defaultYears !== "any") {
      const idx = variants.findIndex((v) => String(v.years) === String(defaultYears));
      if (idx !== -1) return idx;
    }
    return 0;
  }

  // アコーディオン展開時に表示する、年数ごとの行（税込・税抜の両方の価格を表示）
  function allYearsRowHtml(v, selected) {
    const incl = priceInclTax(v);
    const priceMain = incl ? `¥${incl.toLocaleString()}` : "要確認";
    const priceSub = v.priceExclTax ? `（税抜 ¥${v.priceExclTax.toLocaleString()}）` : "";
    return `
      <div class="all-years-row ${selected ? "all-years-row--selected" : ""}">
        <span class="all-years-row__years">${escapeHtml(formatYears(v))}</span>
        <span class="all-years-row__code">${escapeHtml(v.code)}</span>
        <span class="all-years-row__price">
          <span class="all-years-row__price-main">${priceMain}</span>
          ${priceSub ? `<span class="all-years-row__price-sub">${escapeHtml(priceSub)}</span>` : ""}
        </span>
      </div>`;
  }

  function allYearsInnerHtml(variants, selectedIndex) {
    return variants.map((v, i) => allYearsRowHtml(v, i === selectedIndex)).join("");
  }

  function renderCard(id, variants, subTitle, colorKey, defaultYears) {
    const initialIndex = pickInitialIndex(variants, defaultYears);
    const first = variants[initialIndex];
    const rowClasses = [
      first.isExtension ? "plan-row--extension" : "",
      first.isOption ? "plan-row--option" : "",
      colorKey ? `plan-row--${colorKey}` : ""
    ].filter(Boolean).join(" ");

    const yearButtons = variants.map((v, i) => `
      <button type="button" class="year-btn ${i === initialIndex ? "year-btn--selected" : ""}" data-index="${i}">
        ${escapeHtml(formatYears(v))}
      </button>`).join("");

    const allYearsToggle = variants.length > 1
      ? `<button type="button" class="all-years-btn" data-role="all-years-btn">全年数をまとめて見る</button>`
      : "";

    return `
      <div class="plan-row ${rowClasses}" id="${id}">
        ${subTitle ? `<p class="plan-row__subtitle">${escapeHtml(subTitle)}</p>` : ""}
        <p class="plan-row__name" data-role="name">${nameHtml(first)}</p>
        <div class="plan-row__badges" data-role="badges">${buildBadges(first)}</div>
        <div class="year-btn-row">${yearButtons}</div>
        ${allYearsToggle}
        <div class="plan-row__bottom-area" data-role="bottom-area">
          <div class="plan-row__bottom" data-role="bottom">
            <div class="plan-row__model">
              <p class="plan-row__model-sku" data-role="model-sku">${escapeHtml(first.code)}</p>
            </div>
            <div class="plan-row__price" data-role="price">${priceHtml(first)}</div>
          </div>
          <div class="all-years-accordion" data-role="all-years-accordion">
            <div class="all-years-accordion__inner" data-role="all-years-inner">${allYearsInnerHtml(variants, initialIndex)}</div>
          </div>
        </div>
      </div>`;
  }

  function bindCardEvents() {
    Object.entries(cardVariantMap).forEach(([id, variants]) => {
      const cardEl = document.getElementById(id);
      if (!cardEl) return;
      const buttons = cardEl.querySelectorAll(".year-btn");
      const bottomArea = cardEl.querySelector('[data-role="bottom-area"]');
      const allYearsBtn = cardEl.querySelector('[data-role="all-years-btn"]');

      function selectVariant(index) {
        buttons.forEach((b) => b.classList.remove("year-btn--selected"));
        buttons[index].classList.add("year-btn--selected");
        const v = variants[index];
        cardEl.querySelector('[data-role="model-sku"]').textContent = v.code;
        cardEl.querySelector('[data-role="name"]').innerHTML = nameHtml(v);
        cardEl.querySelector('[data-role="price"]').innerHTML = priceHtml(v);
        cardEl.querySelector('[data-role="badges"]').innerHTML = buildBadges(v);
        const inner = cardEl.querySelector('[data-role="all-years-inner"]');
        if (inner) inner.innerHTML = allYearsInnerHtml(variants, index);
      }

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => selectVariant(Number(btn.dataset.index)));
      });

      // 「全年数をまとめて見る」を押すと、型番・価格の表示エリアに重なる形で
      // 全年数の一覧がビラッと開く（アコーディオン）
      if (allYearsBtn && bottomArea) {
        allYearsBtn.addEventListener("click", () => {
          const isOpen = bottomArea.classList.toggle("plan-row__bottom-area--open");
          allYearsBtn.textContent = isOpen ? "閉じる" : "全年数をまとめて見る";
        });
      }
    });
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  } // ← initApp() の終わり
})();
