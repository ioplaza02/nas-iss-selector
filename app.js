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

  const METHOD_INFO = {
    onsite: {
      title: "訪問安心保守",
      desc: "スタッフが訪問し、交換・復旧作業まで行います（自分で作業できない方向け）"
    },
    onsite_sameday: {
      title: "当日訪問プレミアム",
      desc: "対応エリア内で、故障当日中の訪問に対応する上位プランです"
    },
    delivery: {
      title: "交換品お届け保守",
      desc: "交換品が先に届き、ご自身で交換作業を行います（コストを抑えたい方向け）"
    },
    sendback: {
      title: "保証期間延長（センドバック）",
      desc: "故障品を郵送し、修理後に返却してもらう方式の保証延長です"
    }
  };

  const el = (sel) => document.querySelector(sel);
  const modelInput = el("#model-input");
  const suggestBox = el("#model-suggest");
  const emptyState = el("#empty-state");
  const resultWrap = el("#result-wrap");
  const resultModel = el("#result-model");
  const resultCount = el("#result-count");
  const planGroups = el("#plan-groups");
  const filterReset = el("#filter-reset");
  const updatedAtEl = el("#updated-at");

  let allProducts = [];
  let currentProduct = null;

  fetch("data/iss-services.json")
    .then((res) => res.json())
    .then((data) => {
      allProducts = data.products || [];
      renderUpdatedAt(data.updatedAt);
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
    return allProducts.filter((p) => p.model.toUpperCase().includes(q));
  }

  modelInput.addEventListener("input", () => {
    const q = modelInput.value.trim();
    if (!q) {
      suggestBox.hidden = true;
      showEmptyState();
      return;
    }
    const matches = findMatches(q).slice(0, 8);
    if (matches.length === 0) {
      suggestBox.hidden = true;
      showNoMatch(q);
      return;
    }
    suggestBox.innerHTML = "";
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
    suggestBox.hidden = false;

    // 完全一致が1件だけなら、それを即座に表示する
    const exact = allProducts.find((p) => p.model.toUpperCase() === q.toUpperCase());
    if (exact) selectProduct(exact);
  });

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
  }

  function showNoMatch(query) {
    currentProduct = null;
    emptyState.hidden = true;
    resultWrap.hidden = false;
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
    el("#hide-extension").checked = false;
    el("#hide-option").checked = false;
    if (currentProduct) renderResults();
  });

  function getActiveFilters() {
    const methods = Array.from(filterPanel.querySelectorAll('input[name="method"]:checked')).map((c) => c.value);
    const hddReturn = filterPanel.querySelector('input[name="hdd-return"]:checked').value;
    const hideExtension = el("#hide-extension").checked;
    const hideOption = el("#hide-option").checked;
    return { methods, hddReturn, hideExtension, hideOption };
  }

  // ---------- 結果表示 ----------

  function renderResults() {
    emptyState.hidden = true;
    resultWrap.hidden = false;
    resultModel.textContent = currentProduct.model;

    const { methods, hddReturn, hideExtension, hideOption } = getActiveFilters();

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

    // method順（onsite → onsite_sameday → delivery → sendback）にグループ化
    const order = ["onsite", "onsite_sameday", "delivery", "sendback"];
    const groups = {};
    filtered.forEach((s) => {
      const key = s.isOption ? "option" : s.method;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    let html = "";

    order.forEach((methodKey) => {
      const items = groups[methodKey];
      if (!items || items.length === 0) return;
      const info = METHOD_INFO[methodKey];
      html += renderGroup(info.title, info.desc, items);
    });

    if (groups.option && groups.option.length > 0) {
      html += renderGroup("追加オプション", "既存の保守プランに追加できるオプションです", groups.option);
    }

    planGroups.innerHTML = html;
  }

  function renderGroup(title, desc, items) {
    // 年数の短い順に並べる
    const sorted = [...items].sort((a, b) => (a.years || 0) - (b.years || 0));
    const rows = sorted.map(renderRow).join("");
    return `
      <div class="plan-group">
        <div class="plan-group__header">
          <span class="plan-group__bar"></span>
          <div>
            <p class="plan-group__title">${escapeHtml(title)}</p>
            <p class="plan-group__desc">${escapeHtml(desc)}</p>
          </div>
        </div>
        ${rows}
      </div>`;
  }

  function renderRow(s) {
    const rowClass = s.isExtension ? "plan-row--extension" : s.isOption ? "plan-row--option" : "";
    const years = s.years ? `${s.years}年` + (s.months ? `${s.months}ヶ月` : "") : "";

    const badges = [];
    if (s.hddReturnRequired === false) badges.push(`<span class="badge badge--accent">HDD返却不要</span>`);
    if (s.hddReturnRequired === true) badges.push(`<span class="badge">HDD返却あり</span>`);
    if (s.isExtension) badges.push(`<span class="badge">延長パック（既存加入者専用）</span>`);
    if (s.isOption) badges.push(`<span class="badge badge--good">オプション</span>`);
    if (years) badges.push(`<span class="badge">${escapeHtml(years)}</span>`);
    if (s.serviceStart) {
      const d = new Date(s.serviceStart);
      if (!isNaN(d) && d.getTime() > Date.now()) {
        badges.push(`<span class="badge">${d.getFullYear()}年${d.getMonth() + 1}月以降販売分のみ</span>`);
      }
    }

    const priceText = s.priceExclTax
      ? `¥${s.priceExclTax.toLocaleString()}`
      : "価格は公式サイトでご確認ください";

    const nameHtml = s.url
      ? `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`
      : escapeHtml(s.name);

    return `
      <div class="plan-row ${rowClass}">
        <div class="plan-row__main">
          <p class="plan-row__code">${escapeHtml(s.code)}</p>
          <p class="plan-row__name">${nameHtml}</p>
          <div class="plan-row__badges">${badges.join("")}</div>
        </div>
        <div class="plan-row__price">
          <p class="plan-row__price-value">${priceText}</p>
          <p class="plan-row__price-note">税抜</p>
        </div>
      </div>`;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  } // ← initApp() の終わり
})();
