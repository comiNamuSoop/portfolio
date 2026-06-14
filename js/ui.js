/**
 * ui.js
 * 네비게이션 활성 표시, 모바일 메뉴, 스크롤 페이드인 등 UI 동작을 담당합니다.
 */

/**
 * 스크롤 위치에 맞춰 네비 링크에 활성 클래스를 부여합니다.
 * IntersectionObserver로 뷰포트 중앙에 가까운 섹션을 기준으로 합니다.
 */
function initNavActiveHighlight() {
  const sectionIds = ["hero", "about", "tech-stack", "projects", "experience", "contact"];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const navLinks = document.querySelectorAll(".site-nav__link[href^='#']");
  if (!sections.length || !navLinks.length) return;

  const setActive = (id) => {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      const isMatch = href === `#${id}`;
      link.classList.toggle("active", isMatch);
      if (isMatch) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]?.target?.id) setActive(visible[0].target.id);
    },
    {
      root: null,
      rootMargin: "-35% 0px -45% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

/**
 * 모바일 햄버거 메뉴 열림/닫힘 토글
 */
function initMobileNavToggle() {
  const header = document.getElementById("site-header");
  const toggle = document.getElementById("nav-toggle");
  if (!header || !toggle) return;

  const closeMenu = () => {
    header.classList.remove("is-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "메뉴 열기");
  };

  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-menu-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  });

  // 앵커 클릭 시 모바일 메뉴 닫기
  header.querySelectorAll('.site-nav--mobile a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  /* 리사이즈마다 호출하면 불필요한 레이아웃 연산이 반복되므로 breakpoint 전환 시에만 처리 */
  const mqDesktop = window.matchMedia("(min-width: 48rem)");
  const onViewportChange = () => {
    if (mqDesktop.matches) closeMenu();
  };
  mqDesktop.addEventListener("change", onViewportChange);
}

/**
 * 스크롤 시 요소가 보이면 fade-in 클래스(is-visible)를 추가합니다.
 */
function initRevealOnScroll() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  targets.forEach((el) => observer.observe(el));
}

/**
 * UI 초기화 진입점 — main.js에서 DOMContentLoaded 이후 호출합니다.
 */
function initPortfolioUI() {
  initNavActiveHighlight();
  initMobileNavToggle();
  initRevealOnScroll();
}
