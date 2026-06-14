/**
 * renderer.js
 * portfolio.json 데이터를 받아 각 섹션 DOM을 채우는 함수들입니다.
 */

/**
 * HTML 특수문자 이스케이프 (innerHTML 삽입 시 XSS 완화)
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 링크 href 화이트리스트 검사 (javascript: 등 차단)
 * @param {unknown} href
 * @returns {string} 안전하지 않으면 '#'
 */
function sanitizeHref(href) {
  if (href == null || typeof href !== "string") return "#";
  const raw = href.trim();
  if (!raw) return "#";
  const lower = raw.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "#";
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  if (
    raw.startsWith("/") ||
    raw.startsWith("#") ||
    raw.startsWith("mailto:") ||
    raw.startsWith("./")
  ) {
    return raw;
  }
  return "#";
}

/**
 * 이미지 src용 안전한 URL (스크립트/데이터 URL 차단)
 * @param {unknown} src
 * @returns {string} 빈 문자열이면 이미지 미사용
 */
function sanitizeImgSrc(src) {
  if (src == null || typeof src !== "string") return "";
  const raw = src.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/") || raw.startsWith("./")) return raw;
  return "";
}

/**
 * 히어로 태그라인을 0.07초(70ms) 간격으로 한 글자씩 표시합니다.
 * 스크린 리더용 전체 문장은 부모 p의 aria-label에 둡니다.
 * @param {HTMLElement} heroRoot - .hero 루트 요소
 * @param {string} fullText - 원문 태그라인
 */
function initHeroTaglineTyping(heroRoot, fullText) {
  const typed = heroRoot.querySelector(".hero__tagline-typed");
  const caret = heroRoot.querySelector(".hero__tagline-caret");
  const line = heroRoot.querySelector(".hero__tagline");
  if (!typed || !line) return;

  const text = String(fullText || "").trim();
  typed.textContent = "";
  if (caret) caret.classList.remove("is-done");
  if (text) line.setAttribute("aria-label", text);
  else {
    line.removeAttribute("aria-label");
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    typed.textContent = text;
    if (caret) caret.classList.add("is-done");
    return;
  }

  let i = 0;
  const delayMs = 70;
  const tick = () => {
    if (i >= text.length) {
      if (caret) caret.classList.add("is-done");
      return;
    }
    typed.textContent += text[i];
    i += 1;
    window.setTimeout(tick, delayMs);
  };
  tick();
}

/**
 * 히어로 섹션 렌더링: #hero에 innerHTML로 삽입
 * @param {object} [hero] - 히어로 데이터
 */
function renderHero(hero) {
  const root = document.getElementById("hero");
  if (!root) return;

  if (!hero || typeof hero !== "object") {
    root.innerHTML =
      '<p class="hero hero__tagline">표시할 히어로 데이터가 없습니다.</p>';
    return;
  }

  const nameEn = escapeHtml(hero.nameEn);
  const name = escapeHtml(hero.name);
  const taglineRaw = String(hero.tagline || "").trim();
  const taglineAriaAttr = taglineRaw
    ? ` aria-label="${escapeHtml(taglineRaw)}"`
    : "";
  const subTagline = escapeHtml(hero.subTagline);

  const primary =
    hero.ctaPrimary && typeof hero.ctaPrimary === "object"
      ? hero.ctaPrimary
      : null;
  const secondary =
    hero.ctaSecondary && typeof hero.ctaSecondary === "object"
      ? hero.ctaSecondary
      : null;

  const pHref = primary ? sanitizeHref(primary.href) : "#";
  const pLabel = primary ? escapeHtml(primary.label) : "";
  const sHref = secondary ? sanitizeHref(secondary.href) : "#";
  const sLabel = secondary ? escapeHtml(secondary.label) : "";

  let actionsHtml = '<div class="hero__actions">';
  if (primary && pLabel) {
    const wantDownload =
      /\.pdf(\?|$)/i.test(String(primary.href || "")) ||
      /이력서|resume/i.test(String(primary.label || ""));
    const downloadAttr = wantDownload ? " download" : "";
    actionsHtml += `<a class="hero__btn hero__btn--primary" href="${escapeHtml(pHref)}"${downloadAttr}>${pLabel}</a>`;
  }
  if (secondary && sLabel) {
    const rel = /^https?:\/\//i.test(sHref) ? ' rel="noopener noreferrer"' : "";
    const target = /^https?:\/\//i.test(sHref) ? ' target="_blank"' : "";
    actionsHtml += `<a class="hero__btn hero__btn--secondary" href="${escapeHtml(sHref)}"${rel}${target}>${sLabel}</a>`;
  }
  actionsHtml += "</div>";

  let scrollHtml = "";
  if (hero.scrollIndicator === true) {
    scrollHtml = `
      <a class="hero__scroll" href="#about" aria-label="다음 섹션(소개)으로 이동">
        <span class="hero__scroll-text">Scroll</span>
        <svg class="hero__scroll-icon" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6-1.41-1.41z"/>
        </svg>
      </a>
    `;
  }

  root.innerHTML = `
    <div class="hero">
      <p class="hero__name-en">${nameEn}</p>
      <h1 class="hero__name">${name}</h1>
      <p class="hero__tagline"${taglineAriaAttr}>
        <span class="hero__tagline-typed" aria-hidden="true"></span><span class="hero__tagline-caret" aria-hidden="true"></span>
      </p>
      <p class="hero__subtagline">${subTagline}</p>
      ${actionsHtml}
      ${scrollHtml}
    </div>
  `.trim();

  const heroEl = root.querySelector(".hero");
  if (heroEl) initHeroTaglineTyping(heroEl, taglineRaw);
}

/**
 * 소개 섹션 렌더링: #about에 innerHTML로 삽입 후 이미지 로드 실패 시 이니셜 표시
 * @param {object} [about] - 소개 데이터 (summary, keywords, profileImage, availableForWork, availableLabel, 선택: initials)
 */
function renderAbout(about) {
  const root = document.getElementById("about");
  if (!root) return;

  if (!about || typeof about !== "object") {
    root.innerHTML =
      '<p class="about about__summary">표시할 소개 데이터가 없습니다.</p>';
    return;
  }

  const summary = escapeHtml(about.summary);
  const initialsRaw =
    about.initials != null && String(about.initials).trim() !== ""
      ? String(about.initials).trim().slice(0, 4)
      : "KJ";
  const initials = escapeHtml(initialsRaw.toUpperCase());

  const keywords = Array.isArray(about.keywords) ? about.keywords : [];
  const tagsHtml = keywords
    .filter((k) => typeof k === "string" && k.trim() !== "")
    .map(
      (k) => `<li><span class="about__tag">${escapeHtml(k.trim())}</span></li>`,
    )
    .join("");

  const imgSrc = sanitizeImgSrc(about.profileImage);
  const hasPhoto = Boolean(imgSrc);

  let badgeHtml = "";
  if (about.availableForWork === true) {
    const label = escapeHtml(about.availableLabel || "");
    badgeHtml = `
      <div class="about__badge" role="status">
        <span class="about__dot" aria-hidden="true"></span>
        <span class="about__badge-text">${label}</span>
      </div>
    `;
  }

  const avatarHtml = hasPhoto
    ? `
      <div class="about__avatar" data-about-avatar>
        <img class="about__img" src="${escapeHtml(imgSrc)}" alt="프로필 사진" width="200" height="200" loading="lazy" decoding="async" />
        <div class="about__fallback" aria-hidden="true">${initials}</div>
      </div>
    `
    : `
      <div class="about__avatar about__avatar--placeholder" data-about-avatar>
        <div class="about__fallback about__fallback--only">${initials}</div>
      </div>
    `;

  root.innerHTML = `
    <div class="about">
      <div class="about__media">${avatarHtml}</div>
      <div class="about__content">
        ${badgeHtml}
        <p class="about__summary">${summary}</p>
        <ul class="about__keywords">${tagsHtml}</ul>
      </div>
    </div>
  `.trim();

  const avatar = root.querySelector("[data-about-avatar]");
  const img = root.querySelector(".about__img");
  const fallback = root.querySelector(".about__fallback");
  if (avatar && img && fallback) {
    img.addEventListener("error", () => {
      avatar.classList.add("is-img-error");
    });
  }
}

/**
 * 숙련도 레벨을 1~5 정수로 제한합니다.
 * @param {unknown} level
 * @returns {number}
 */
function clampTechLevel(level) {
  const n = Number(level);
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * 기술 스택 탭 전환 (한 카테고리 패널만 표시)
 * @param {HTMLElement} shell - .techstack 루트
 * @param {number} index - 활성 카테고리 인덱스
 */
function activateTechStackTab(shell, index) {
  const tabs = shell.querySelectorAll('[role="tab"]');
  const panels = shell.querySelectorAll('[role="tabpanel"]');
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
    tab.classList.toggle("is-active", selected);
  });
  panels.forEach((panel, i) => {
    const on = i === index;
    panel.toggleAttribute("hidden", !on);
    panel.classList.toggle("is-active", on);
  });
}

/**
 * #tech-stack이 뷰포트에 들어오면 progress bar를 0에서 목표 너비로 채웁니다.
 * @param {HTMLElement} section - #tech-stack
 * @param {HTMLElement} shell - .techstack
 */
function initTechStackBarObserver(section, shell) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        shell.classList.add("techstack--inview");
        obs.disconnect();
      });
    },
    { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  observer.observe(section);
}

/**
 * 기술 스택 섹션 렌더링: 카테고리 탭, 숙련도 바, note 툴팁, levelGuide 범례
 * @param {object|Array} [techStack] - { categories, levelGuide } 형식 권장
 */
function renderTechStack(techStack) {
  const root = document.getElementById("tech-stack");
  if (!root) return;

  if (
    !techStack ||
    typeof techStack !== "object" ||
    !Array.isArray(techStack.categories)
  ) {
    root.innerHTML =
      '<div class="techstack"><p class="techstack__empty">기술 스택 데이터(categories)가 없습니다.</p></div>';
    return;
  }

  const categories = techStack.categories.filter(
    (c) =>
      c &&
      typeof c === "object" &&
      typeof c.name === "string" &&
      Array.isArray(c.items),
  );

  if (!categories.length) {
    root.innerHTML =
      '<div class="techstack"><p class="techstack__empty">표시할 기술 카테고리가 없습니다.</p></div>';
    return;
  }

  const tabsHtml = categories
    .map((cat, i) => {
      const label = escapeHtml(cat.name);
      const selected =
        i === 0 ? ' aria-selected="true"' : ' aria-selected="false"';
      const tabIndex = i === 0 ? "0" : "-1";
      const activeClass = i === 0 ? " is-active" : "";
      return `<button type="button" class="techstack__tab${activeClass}" role="tab" id="tech-tab-${i}" aria-controls="tech-panel-${i}"${selected} tabindex="${tabIndex}">${label}</button>`;
    })
    .join("");

  const panelsHtml = categories
    .map((cat, catIdx) => {
      const items = cat.items.filter(
        (it) => it && typeof it === "object" && typeof it.name === "string",
      );
      const itemsHtml = items
        .map((it, itemIdx) => {
          const name = escapeHtml(it.name.trim());
          const lvl = clampTechLevel(it.level);
          const noteRaw = typeof it.note === "string" ? it.note.trim() : "";
          const hasNote = noteRaw.length > 0;
          const note = escapeHtml(noteRaw);
          const tipId = `tech-tip-${catIdx}-${itemIdx}`;

          const tipBlock = hasNote
            ? `<span class="ts-item__tip-wrap">
                <button type="button" class="ts-item__tip" aria-label="${name} 보조 설명" aria-describedby="${tipId}">
                  <span class="ts-item__tip-icon" aria-hidden="true">i</span>
                </button>
                <span id="${tipId}" class="ts-tooltip" role="tooltip">${note}</span>
              </span>`
            : "";

          return `
            <li class="ts-item">
              <div class="ts-item__top">
                <span class="ts-item__name">${name}</span>
                ${tipBlock}
              </div>
              <div
                class="ts-bar"
                role="progressbar"
                aria-valuemin="1"
                aria-valuemax="5"
                aria-valuenow="${lvl}"
                aria-label="${name} 숙련도 ${lvl}단계"
              >
                <div class="ts-bar__fill" style="--lvl: ${lvl}"></div>
              </div>
            </li>
          `;
        })
        .join("");

      const hidden = catIdx === 0 ? "" : " hidden";
      const active = catIdx === 0 ? " is-active" : "";
      return `
        <div class="techstack__panel${active}" id="tech-panel-${catIdx}" role="tabpanel" aria-labelledby="tech-tab-${catIdx}"${hidden}>
          <ul class="ts-list">${itemsHtml || '<li class="ts-item ts-item--empty">항목이 없습니다.</li>'}</ul>
        </div>
      `;
    })
    .join("");

  const guide =
    techStack.levelGuide && typeof techStack.levelGuide === "object"
      ? techStack.levelGuide
      : {};
  const guideRows = ["1", "2", "3", "4", "5"]
    .map((key) => {
      const text = guide[key];
      if (text == null || String(text).trim() === "") return "";
      return `<div class="techstack__guide-row"><span class="techstack__guide-key">${escapeHtml(key)}</span><span class="techstack__guide-text">${escapeHtml(String(text))}</span></div>`;
    })
    .join("");

  const legendHtml = guideRows
    ? `<div class="techstack__legend" aria-label="숙련도 단계 안내"><h3 class="techstack__legend-title">숙련도 기준</h3><div class="techstack__guide">${guideRows}</div></div>`
    : "";

  root.innerHTML = `
    <div class="techstack" data-techstack-root>
      <div class="techstack__head">
        <h2 class="techstack__title">기술 스택</h2>
        <p class="techstack__lead">카테고리별로 사용 기술과 숙련도를 정리했습니다.</p>
      </div>
      <div class="techstack__tabs" role="tablist" aria-label="기술 스택 카테고리">
        ${tabsHtml}
      </div>
      <div class="techstack__panels">
        ${panelsHtml}
      </div>
      ${legendHtml}
    </div>
  `.trim();

  const shell = root.querySelector("[data-techstack-root]");
  if (!shell) return;

  shell.querySelectorAll('[role="tab"]').forEach((tab, i) => {
    tab.addEventListener("click", () => activateTechStackTab(shell, i));
  });
  activateTechStackTab(shell, 0);

  initTechStackBarObserver(root, shell);
}

/** @type {HTMLElement | null} */
let projectsModalEl = null;

/** @type {((e: KeyboardEvent) => void) | null} */
let projectsModalOnKeydown = null;

/**
 * 팀 규모에 따른 카드 뱃지 HTML
 * @param {unknown} teamSize
 * @returns {string}
 */
function buildProjectTeamBadgeHtml(teamSize) {
  const n = Number(teamSize);
  if (!Number.isFinite(n) || n < 1) return "";
  if (n === 1) return '<span class="project-card__badge">개인 프로젝트</span>';
  return `<span class="project-card__badge">팀 프로젝트 (${escapeHtml(String(n))}인)</span>`;
}

/**
 * 썸네일 영역: 이미지 또는 기술 스택 첫 항목 텍스트
 * @param {object} p
 * @returns {string}
 */
function buildProjectCardThumbHtml(p) {
  const thumbSrc = sanitizeImgSrc(p.thumbnail);
  const tech = Array.isArray(p.techStack) ? p.techStack : [];
  const firstTech =
    typeof tech[0] === "string" && tech[0].trim() !== ""
      ? escapeHtml(tech[0].trim())
      : escapeHtml((p.title || "Project").slice(0, 12));

  if (thumbSrc) {
    const thumbAlt = escapeHtml(
      `${String(p.title || "프로젝트").trim()} 썸네일`,
    );
    return `
      <div class="project-card__thumb">
        <img class="project-card__img" src="${escapeHtml(thumbSrc)}" alt="${thumbAlt}" loading="lazy" decoding="async" />
      </div>
    `;
  }
  return `<div class="project-card__thumb project-card__thumb--text" aria-hidden="true"><span class="project-card__thumb-label">${firstTech}</span></div>`;
}

/**
 * 모달 하단 링크 버튼 (표시 순서: Live → Demo → GitHub, 값이 있는 항목만)
 * @param {object} p
 * @returns {string}
 */
function buildProjectModalLinksHtml(p) {
  const live = sanitizeHref(p.liveUrl);
  const demo = sanitizeHref(p.demoVideo);
  const gh = sanitizeHref(p.github);
  const items = [];
  if (live && live !== "#") {
    items.push({
      href: live,
      label: "Live 사이트",
      external: /^https?:\/\//i.test(live),
    });
  }
  if (demo && demo !== "#") {
    items.push({ href: demo, label: "데모 영상", external: true });
  }
  if (gh && gh !== "#") {
    items.push({ href: gh, label: "GitHub", external: true });
  }
  if (!items.length) return "";

  const btns = items
    .map((it) => {
      const rel = it.external
        ? ' rel="noopener noreferrer" target="_blank"'
        : "";
      return `<a class="projects-modal__link" href="${escapeHtml(it.href)}"${rel}>${escapeHtml(it.label)}</a>`;
    })
    .join("");

  return `<div class="projects-modal__actions">${btns}</div>`;
}

/**
 * 모달 본문 HTML 생성
 * @param {object} p
 * @returns {string}
 */
function buildProjectModalInnerHtml(p) {
  const title = escapeHtml(p.title || "");
  const subtitle = escapeHtml(p.subtitle || "");
  const period = escapeHtml(p.period || "");
  const role = escapeHtml(p.role || "");
  const description = escapeHtml(p.description || "");

  const thumbSrc = sanitizeImgSrc(p.thumbnail);
  const tech = Array.isArray(p.techStack) ? p.techStack : [];
  const firstTech =
    typeof tech[0] === "string" && tech[0].trim() !== ""
      ? escapeHtml(tech[0].trim())
      : escapeHtml((p.title || "Project").slice(0, 12));

  let thumbBlock = "";
  if (thumbSrc) {
    const modalThumbAlt = escapeHtml(
      `${String(p.title || "프로젝트").trim()} 대표 이미지`,
    );
    thumbBlock = `<div class="projects-modal__thumb"><img src="${escapeHtml(thumbSrc)}" alt="${modalThumbAlt}" loading="lazy" decoding="async" /></div>`;
  } else {
    thumbBlock = `<div class="projects-modal__thumb projects-modal__thumb--text" aria-hidden="true"><span>${firstTech}</span></div>`;
  }

  const feats = Array.isArray(p.features) ? p.features : [];
  const featsHtml = feats
    .filter((f) => typeof f === "string" && f.trim() !== "")
    .map((f) => `<li>${escapeHtml(f.trim())}</li>`)
    .join("");
  const featuresBlock = featsHtml
    ? `<div class="projects-modal__block"><h3 class="projects-modal__h">주요 기능</h3><ul class="projects-modal__features">${featsHtml}</ul></div>`
    : "";

  const archSrc = sanitizeImgSrc(p.architectureDiagram);
  const archAlt = escapeHtml(
    `${String(p.title || "프로젝트").trim()} 아키텍처 다이어그램`,
  );
  const archBlock = archSrc
    ? `<div class="projects-modal__block"><h3 class="projects-modal__h">아키텍처</h3><figure class="projects-modal__figure"><img src="${escapeHtml(
        archSrc,
      )}" alt="${archAlt}" loading="lazy" decoding="async" /></figure></div>`
    : "";

  const tagsHtml = tech
    .filter((t) => typeof t === "string" && t.trim() !== "")
    .map(
      (t) => `<span class="projects-modal__tag">${escapeHtml(t.trim())}</span>`,
    )
    .join("");
  const tagsBlock = tagsHtml
    ? `<div class="projects-modal__block"><h3 class="projects-modal__h">기술 스택</h3><div class="projects-modal__tags">${tagsHtml}</div></div>`
    : "";

  const linksHtml = buildProjectModalLinksHtml(p);

  return `
    <button type="button" class="projects-modal__close" data-modal-dismiss aria-label="닫기">
      <span aria-hidden="true">&times;</span>
    </button>
    <div class="projects-modal__scroll">
      ${thumbBlock}
      <div class="projects-modal__intro">
        <h2 id="projects-modal-title" class="projects-modal__title">${title}</h2>
        ${subtitle ? `<p class="projects-modal__subtitle">${subtitle}</p>` : ""}
        <p class="projects-modal__meta">${period}${period && role ? " · " : ""}${role}</p>
      </div>
      <div class="projects-modal__block">
        <h3 class="projects-modal__h">설명</h3>
        <p class="projects-modal__desc">${description}</p>
      </div>
      ${featuresBlock}
      ${archBlock}
      ${tagsBlock}
      ${linksHtml}
    </div>
  `.trim();
}

/**
 * 프로젝트 모달 닫기 (ESC, 배경 클릭, 닫기 버튼)
 */
function closeProjectsModal() {
  if (!projectsModalEl) return;
  projectsModalEl.setAttribute("hidden", "");
  projectsModalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (projectsModalOnKeydown) {
    document.removeEventListener("keydown", projectsModalOnKeydown);
  }
}

/**
 * 프로젝트 모달 열기
 * @param {object} p
 */
function openProjectsModal(p) {
  if (!projectsModalEl) return;
  const dialog = projectsModalEl.querySelector(".projects-modal__dialog");
  if (!dialog) return;
  dialog.innerHTML = buildProjectModalInnerHtml(p);
  projectsModalEl.removeAttribute("hidden");
  projectsModalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const closeBtn = dialog.querySelector(".projects-modal__close");
  if (closeBtn instanceof HTMLElement) {
    closeBtn.addEventListener("click", () => closeProjectsModal(), {
      once: true,
    });
    closeBtn.focus();
  }

  if (projectsModalOnKeydown) {
    document.removeEventListener("keydown", projectsModalOnKeydown);
  }
  projectsModalOnKeydown = (e) => {
    if (e.key === "Escape") closeProjectsModal();
  };
  document.addEventListener("keydown", projectsModalOnKeydown);
}

/**
 * 모달 DOM을 한 번만 생성하고 이벤트를 연결합니다.
 */
function ensureProjectsModal() {
  if (projectsModalEl) return;
  const wrap = document.createElement("div");
  wrap.id = "projects-modal";
  wrap.className = "projects-modal";
  wrap.setAttribute("hidden", "");
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `
    <div class="projects-modal__backdrop" tabindex="-1" aria-hidden="true"></div>
    <div class="projects-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="projects-modal-title"></div>
  `.trim();

  wrap
    .querySelector(".projects-modal__backdrop")
    ?.addEventListener("click", () => {
      closeProjectsModal();
    });

  document.body.appendChild(wrap);
  projectsModalEl = wrap;
}

/**
 * 카드에서 프로젝트 열기 (클릭 / 키보드)
 * @param {HTMLElement} card
 * @param {Array<object>} list
 */
function bindProjectCardOpen(card, list) {
  const id = card.getAttribute("data-project-id");
  if (!id) return;
  const project = list.find((x) => x && x.id === id);
  if (!project) return;

  const open = () => {
    ensureProjectsModal();
    openProjectsModal(project);
  };

  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
}

/**
 * 프로젝트 목록 렌더링: 그리드 카드 + 모달 상세
 * @param {Array<object>} [projects] - 프로젝트 배열
 */
function renderProjects(projects) {
  const root = document.getElementById("projects");
  if (!root) return;

  closeProjectsModal();

  const list = Array.isArray(projects)
    ? projects.filter((x) => x && typeof x === "object")
    : [];

  if (!list.length) {
    root.innerHTML =
      '<div class="projects"><p class="projects__empty">등록된 프로젝트가 없습니다.</p></div>';
    return;
  }

  const cardsHtml = list
    .map((p) => {
      const id = escapeHtml(p.id || "");
      const title = escapeHtml(p.title || "");
      const subtitle = escapeHtml(p.subtitle || "");
      const period = escapeHtml(p.period || "");
      const role = escapeHtml(p.role || "");
      const badge = buildProjectTeamBadgeHtml(p.teamSize);
      const thumb = buildProjectCardThumbHtml(p);
      const hl = typeof p.highlights === "string" && p.highlights.trim() !== "";
      const highlightBlock = hl
        ? `<blockquote class="project-card__highlight">${escapeHtml(p.highlights.trim())}</blockquote>`
        : "";

      return `
        <article
          class="project-card"
          tabindex="0"
          role="button"
          aria-haspopup="dialog"
          aria-label="${title} 상세 보기"
          data-project-id="${id}"
        >
          ${thumb}
          <div class="project-card__body">
            ${badge}
            <h3 class="project-card__title">${title}</h3>
            ${subtitle ? `<p class="project-card__subtitle">${subtitle}</p>` : ""}
            <p class="project-card__meta">${period}${period && role ? " · " : ""}${role}</p>
          </div>
          ${highlightBlock}
        </article>
      `.trim();
    })
    .join("");

  root.innerHTML = `
    <div class="projects">
      <div class="projects__head">
        <h2 class="projects__title">프로젝트</h2>
        <p class="projects__lead">진행한 프로젝트를 카드에서 선택하면 상세 정보를 볼 수 있습니다.</p>
      </div>
      <div class="projects-grid">
        ${cardsHtml}
      </div>
    </div>
  `.trim();

  ensureProjectsModal();

  root.querySelectorAll(".project-card[data-project-id]").forEach((card) => {
    bindProjectCardOpen(/** @type {HTMLElement} */ (card), list);
  });
}

/**
 * Experience 섹션 탭 전환 (학력 / 교육 / 자격증 / 활동)
 * @param {HTMLElement} shell - .exp 루트
 * @param {number} index - 활성 탭 인덱스 (0~3)
 */
function activateExperienceTab(shell, index) {
  const tabs = shell.querySelectorAll('[role="tab"][data-exp-tab]');
  const panels = shell.querySelectorAll('[role="tabpanel"][data-exp-panel]');
  tabs.forEach((tab, i) => {
    const on = i === index;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
    tab.classList.toggle("is-active", on);
  });
  panels.forEach((panel, i) => {
    panel.toggleAttribute("hidden", i !== index);
    panel.classList.toggle("is-active", i === index);
  });
}

/**
 * 학력 타임라인 HTML
 * @param {Array<object>} items
 * @returns {string}
 */
function buildExperienceEducationHtml(items) {
  if (!items.length) {
    return '<p class="exp-empty">등록된 학력이 없습니다.</p>';
  }
  return `
    <ul class="exp-timeline">
      ${items
        .map((it) => {
          if (!it || typeof it !== "object") return "";
          const institution = escapeHtml(it.institution || "");
          const major = escapeHtml(it.major || "");
          const degree = escapeHtml(it.degree || "");
          const period = escapeHtml(it.period || "");
          const status = escapeHtml(it.status || "");
          const noteRaw = typeof it.note === "string" ? it.note.trim() : "";
          const noteBlock = noteRaw
            ? `<p class="exp-card__note">${escapeHtml(noteRaw)}</p>`
            : "";
          return `
            <li class="exp-timeline__row">
              <div class="exp-timeline__axis" aria-hidden="true"><span class="exp-timeline__dot"></span></div>
              <div class="exp-timeline__card">
                <h3 class="exp-card__title">${institution}</h3>
                <p class="exp-card__line">${major}${major && degree ? " · " : ""}${degree}</p>
                <p class="exp-card__meta">${period}${period && status ? " · " : ""}${status}</p>
                ${noteBlock}
              </div>
            </li>
          `;
        })
        .join("")}
    </ul>
  `.trim();
}

/**
 * 교육(연수) 타임라인 HTML — skills 태그, 총 학습시간
 * @param {Array<object>} items
 * @returns {string}
 */
function buildExperienceTrainingHtml(items) {
  if (!items.length) {
    return '<p class="exp-empty">등록된 교육 이력이 없습니다.</p>';
  }
  return `
    <ul class="exp-timeline">
      ${items
        .map((it) => {
          if (!it || typeof it !== "object") return "";
          const institution = escapeHtml(it.institution || "");
          const course = escapeHtml(it.courseName || "");
          const period = escapeHtml(it.period || "");
          const status = escapeHtml(it.status || "");
          const hoursRaw = typeof it.hours === "string" ? it.hours.trim() : "";
          const hoursBlock = hoursRaw
            ? `<p class="exp-card__hours">총 ${escapeHtml(hoursRaw)}</p>`
            : "";
          const skills = Array.isArray(it.skills) ? it.skills : [];
          const tags = skills
            .filter((s) => typeof s === "string" && s.trim() !== "")
            .map((s) => `<span class="exp-tag">${escapeHtml(s.trim())}</span>`)
            .join("");
          const tagsBlock = tags
            ? `<div class="exp-card__tags" aria-label="학습 기술">${tags}</div>`
            : "";
          return `
            <li class="exp-timeline__row">
              <div class="exp-timeline__axis" aria-hidden="true"><span class="exp-timeline__dot"></span></div>
              <div class="exp-timeline__card">
                <p class="exp-card__inst">${institution}</p>
                <h3 class="exp-card__title exp-card__title--course">${course}</h3>
                <p class="exp-card__meta">${period}${period && status ? " · " : ""}${status}</p>
                ${hoursBlock}
                ${tagsBlock}
              </div>
            </li>
          `;
        })
        .join("")}
    </ul>
  `.trim();
}

/**
 * 자격증 카드 그리드 HTML
 * @param {Array<object>} items
 * @returns {string}
 */
function buildExperienceCertificationsHtml(items) {
  if (!items.length) {
    return '<p class="exp-empty">등록된 자격증이 없습니다.</p>';
  }
  return `
    <div class="exp-cert-grid">
      ${items
        .map((it) => {
          if (!it || typeof it !== "object") return "";
          const name = escapeHtml(it.name || "");
          const issuer = escapeHtml(it.issuer || "");
          const metaRaw = [it.date, it.status]
            .filter((x) => x != null && String(x).trim() !== "")
            .map((x) => String(x).trim())
            .join(" · ");
          const metaHtml = metaRaw
            ? `<p class="exp-cert-card__meta">${escapeHtml(metaRaw)}</p>`
            : "";
          return `
            <article class="exp-cert-card">
              <span class="exp-cert-card__icon" aria-hidden="true">🏆</span>
              <div class="exp-cert-card__body">
                <h3 class="exp-cert-card__name">${name}</h3>
                <p class="exp-cert-card__issuer">${issuer}</p>
                ${metaHtml}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `.trim();
}

/**
 * 활동 리스트 카드 HTML
 * @param {Array<object>} items
 * @returns {string}
 */
function buildExperienceActivitiesHtml(items) {
  if (!items.length) {
    return '<p class="exp-empty">등록된 활동이 없습니다.</p>';
  }
  return `
    <ul class="exp-act-list">
      ${items
        .map((it) => {
          if (!it || typeof it !== "object") return "";
          const title = escapeHtml(it.title || "");
          const period = escapeHtml(it.period || "");
          const desc = escapeHtml(it.description || "");
          return `
            <li class="exp-act-card">
              <h3 class="exp-act-card__title">${title}</h3>
              <p class="exp-act-card__period">${period}</p>
              <p class="exp-act-card__desc">${desc}</p>
            </li>
          `;
        })
        .join("")}
    </ul>
  `.trim();
}

/**
 * 경력·학습 섹션 렌더링 (탭: 학력 / 교육 / 자격증 / 활동, 기본 탭은 교육)
 * @param {object|Array} [experience] - { education, training, certifications, activities }
 */
function renderExperience(experience) {
  const root = document.getElementById("experience");
  if (!root) return;

  if (
    !experience ||
    typeof experience !== "object" ||
    Array.isArray(experience)
  ) {
    root.innerHTML =
      '<div class="exp"><p class="exp-empty">경력·학습 데이터 형식이 올바르지 않습니다.</p></div>';
    return;
  }

  const education = Array.isArray(experience.education)
    ? experience.education
    : [];
  const training = Array.isArray(experience.training)
    ? experience.training
    : [];
  const certifications = Array.isArray(experience.certifications)
    ? experience.certifications
    : [];
  const activities = Array.isArray(experience.activities)
    ? experience.activities
    : [];

  const tabDefs = [
    { key: "education", label: "학력" },
    { key: "training", label: "교육" },
    { key: "certifications", label: "자격증" },
    { key: "activities", label: "활동" },
  ];

  /** 교육 탭을 기본 활성(인덱스 1) */
  const defaultTabIndex = 1;

  const tabsHtml = tabDefs
    .map((t, i) => {
      const active = i === defaultTabIndex;
      return `<button type="button" class="exp__tab${active ? " is-active" : ""}" role="tab" id="exp-tab-${i}" data-exp-tab aria-controls="exp-panel-${i}" aria-selected="${active ? "true" : "false"}" tabindex="${active ? "0" : "-1"}">${escapeHtml(t.label)}</button>`;
    })
    .join("");

  const panelsContent = [
    buildExperienceEducationHtml(education),
    buildExperienceTrainingHtml(training),
    buildExperienceCertificationsHtml(certifications),
    buildExperienceActivitiesHtml(activities),
  ];

  const panelsHtml = panelsContent
    .map((html, i) => {
      const hidden = i !== defaultTabIndex ? " hidden" : "";
      const active = i === defaultTabIndex ? " is-active" : "";
      return `<div class="exp__panel${active}" id="exp-panel-${i}" role="tabpanel" data-exp-panel aria-labelledby="exp-tab-${i}"${hidden}>${html}</div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="exp" data-exp-root>
      <div class="exp__head">
        <h2 class="exp__title">경력 · 학습</h2>
        <p class="exp__lead">학력, 국비 교육, 자격증, 대외 활동을 정리했습니다.</p>
      </div>
      <div class="exp__tabs" role="tablist" aria-label="경력 및 학습 구분">
        ${tabsHtml}
      </div>
      <div class="exp__panels">
        ${panelsHtml}
      </div>
    </div>
  `.trim();

  const shell = root.querySelector("[data-exp-root]");
  if (!shell) return;

  shell.querySelectorAll('[role="tab"][data-exp-tab]').forEach((tab, i) => {
    tab.addEventListener("click", () => activateExperienceTab(shell, i));
  });
  activateExperienceTab(shell, defaultTabIndex);
}

/**
 * 이메일 형식 간단 검사
 * @param {string} value
 * @returns {boolean}
 */
function isValidEmailFormat(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * 연락처 폼 검증 (이름 필수, 이메일 형식, 메시지 필수·최소 10자)
 * @param {{ name: string, email: string, message: string }} fields
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
function validateContactFields(fields) {
  const errors = {};
  const name = String(fields.name || "").trim();
  const email = String(fields.email || "").trim();
  const message = String(fields.message || "").trim();

  if (!name) errors.name = "이름을 입력해 주세요.";
  if (!email) errors.email = "이메일을 입력해 주세요.";
  else if (!isValidEmailFormat(email))
    errors.email = "올바른 이메일 형식이 아닙니다.";
  if (!message) errors.message = "메시지를 입력해 주세요.";
  else if (message.length < 10)
    errors.message = "메시지는 10자 이상 입력해 주세요.";

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * mailto URL 생성 (본문에 이름·회신 메일·메시지 포함)
 * @param {string} to
 * @param {string} visitorName
 * @param {string} visitorEmail
 * @param {string} message
 * @returns {string}
 */
function buildContactMailtoUrl(to, visitorName, visitorEmail, message) {
  const subject = `[Portfolio 문의] ${visitorName}`;
  const body = `이름: ${visitorName}\n회신 이메일: ${visitorEmail}\n\n메시지:\n${message}\n`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * 연락처 폼 제출·유효성 처리 (mailto 전송)
 * @param {HTMLElement} root - #contact
 * @param {object} contact - portfolio contact 객체
 */
function bindContactForm(root, contact) {
  const form = root.querySelector("#contact-form");
  if (!(form instanceof HTMLFormElement)) return;

  const toEmail = typeof contact.email === "string" ? contact.email.trim() : "";
  const successEl = form.querySelector(".contact__success");

  const setFieldError = (name, msg) => {
    const el = form.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = msg || "";
  };

  const clearErrors = () => {
    form.querySelectorAll(".contact__error").forEach((n) => {
      n.textContent = "";
    });
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();
    if (successEl) {
      successEl.textContent = "";
      successEl.setAttribute("hidden", "");
    }

    const fd = new FormData(form);
    const fields = {
      name: String(fd.get("visitor_name") || ""),
      email: String(fd.get("visitor_email") || ""),
      message: String(fd.get("visitor_message") || ""),
    };

    const { ok, errors } = validateContactFields(fields);
    if (!ok) {
      Object.keys(errors).forEach((k) => setFieldError(k, errors[k]));
      const order = ["name", "email", "message"];
      const idMap = {
        name: "contact-name",
        email: "contact-email",
        message: "contact-message",
      };
      for (const key of order) {
        if (!errors[key]) continue;
        const el = form.querySelector(`#${idMap[key]}`);
        if (el instanceof HTMLElement) {
          el.focus();
          break;
        }
      }
      return;
    }

    if (!toEmail || !isValidEmailFormat(toEmail)) {
      setFieldError("message", "수신 이메일 설정이 올바르지 않습니다.");
      return;
    }

    const url = buildContactMailtoUrl(
      toEmail,
      fields.name.trim(),
      fields.email.trim(),
      fields.message.trim(),
    );
    if (successEl) {
      successEl.textContent =
        "메일 앱이 열립니다. 메시지를 확인한 뒤 전송해 주세요.";
      successEl.removeAttribute("hidden");
    }

    window.setTimeout(() => {
      window.location.href = url;
    }, 350);
  });
}

/**
 * 연락처 섹션 렌더링: 정보 + (선택) 문의 폼
 * @param {object} [contact] - 연락처 데이터
 */
function renderContact(contact) {
  const root = document.getElementById("contact");
  if (!root) return;

  if (!contact || typeof contact !== "object") {
    root.innerHTML =
      '<div class="contact"><p class="contact__empty">연락처 데이터가 없습니다.</p></div>';
    return;
  }

  const email = typeof contact.email === "string" ? contact.email.trim() : "";
  const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
  const github = sanitizeHref(contact.github);
  const linkedinRaw =
    typeof contact.linkedin === "string" ? contact.linkedin.trim() : "";
  const blogRaw = typeof contact.blog === "string" ? contact.blog.trim() : "";
  const linkedin = linkedinRaw ? sanitizeHref(linkedinRaw) : "";
  const blog = blogRaw ? sanitizeHref(blogRaw) : "";

  const mailtoHref = email ? `mailto:${email}` : "#";
  const telHref = phone ? `tel:${phone.replace(/\s/g, "")}` : "#";

  const iconMail = `<svg class="contact__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"/></svg>`;
  const iconPhone = `<svg class="contact__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
  const iconGh = `<svg class="contact__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.64-1.35-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A8.94 8.94 0 0 1 12 6.84c.85.004 1.71.11 2.5.33 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg>`;
  const iconIn = `<svg class="contact__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
  const iconBlog = `<svg class="contact__icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>`;

  const links = [];
  if (email) {
    links.push(
      `<a class="contact__link" href="${escapeHtml(mailtoHref)}">${iconMail}<span class="contact__link-text">${escapeHtml(
        email,
      )}</span></a>`,
    );
  }
  if (phone) {
    links.push(
      `<a class="contact__link" href="${escapeHtml(telHref)}">${iconPhone}<span class="contact__link-text">${escapeHtml(phone)}</span></a>`,
    );
  }
  if (github && github !== "#") {
    links.push(
      `<a class="contact__link" href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer">${iconGh}<span class="contact__link-text">GitHub</span></a>`,
    );
  }
  if (linkedin && linkedin !== "#") {
    links.push(
      `<a class="contact__link" href="${escapeHtml(linkedin)}" target="_blank" rel="noopener noreferrer">${iconIn}<span class="contact__link-text">LinkedIn</span></a>`,
    );
  }
  if (blog && blog !== "#") {
    links.push(
      `<a class="contact__link" href="${escapeHtml(blog)}" target="_blank" rel="noopener noreferrer">${iconBlog}<span class="contact__link-text">Blog</span></a>`,
    );
  }

  const ph =
    contact.formPlaceholder && typeof contact.formPlaceholder === "object"
      ? contact.formPlaceholder
      : {};
  const phName = escapeHtml(ph.name || "이름");
  const phEmail = escapeHtml(ph.email || "이메일");
  const phMessage = escapeHtml(ph.message || "메시지");
  const phSubmit = escapeHtml(ph.submit || "보내기");
  const formEnabled = contact.formEnabled === true;
  const responseNoteText =
    typeof contact.responseNote === "string" ? contact.responseNote.trim() : "";
  const responseNoteHtml = responseNoteText
    ? `<p class="contact__response-note">${escapeHtml(responseNoteText)}</p>`
    : "";
  const responseNoteAside =
    !formEnabled && responseNoteText
      ? `<p class="contact__response-note contact__response-note--aside">${escapeHtml(responseNoteText)}</p>`
      : "";
  const formHtml = formEnabled
    ? `
    <form class="contact__form" id="contact-form" novalidate>
      <div class="contact__field">
        <label class="contact__label" for="contact-name">${phName}</label>
        <input class="contact__input" id="contact-name" name="visitor_name" type="text" autocomplete="name" placeholder="${phName}" />
        <p class="contact__error" data-error-for="name" role="alert"></p>
      </div>
      <div class="contact__field">
        <label class="contact__label" for="contact-email">${phEmail}</label>
        <input class="contact__input" id="contact-email" name="visitor_email" type="email" autocomplete="email" inputmode="email" placeholder="${phEmail}" />
        <p class="contact__error" data-error-for="email" role="alert"></p>
      </div>
      <div class="contact__field">
        <label class="contact__label" for="contact-message">${phMessage}</label>
        <textarea class="contact__input contact__textarea" id="contact-message" name="visitor_message" rows="5" placeholder="${phMessage}"></textarea>
        <p class="contact__error" data-error-for="message" role="alert"></p>
      </div>
      <button type="submit" class="contact__submit">${phSubmit}</button>
      ${responseNoteHtml}
      <p class="contact__success" hidden role="status" aria-live="polite"></p>
    </form>
  `
    : "";

  const formColumn = formEnabled
    ? `<div class="contact__col contact__col--form">${formHtml}</div>`
    : "";

  root.innerHTML = `
    <div class="contact">
      <div class="contact__head">
        <h2 class="contact__title">연락</h2>
        <p class="contact__lead">문의는 아래로 연락 주세요.</p>
      </div>
      <div class="contact__grid">
        <div class="contact__col contact__col--info">
          <h3 class="contact__subhead">연락처</h3>
          <div class="contact__links">
            ${links.join("") || '<p class="contact__empty">표시할 연락처가 없습니다.</p>'}
          </div>
          ${responseNoteAside}
        </div>
        ${formColumn}
      </div>
    </div>
  `.trim();

  if (formEnabled) bindContactForm(root, contact);
}
