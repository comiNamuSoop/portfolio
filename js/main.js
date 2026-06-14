/**
 * main.js
 * portfolio.json을 불러와 renderer의 각 섹션 함수를 순서대로 호출하고,
 * UI 스크립트를 초기화합니다.
 *
 * 참고: file:// 로 HTML을 열면 fetch가 다른 로컬 파일을 읽지 못합니다(CORS).
 *       그때는 index.html 안의 #portfolio-embed JSON을 파싱합니다.
 */

/**
 * JSON 경로 (http(s)로 열었을 때 fetch에 사용)
 */
const PORTFOLIO_DATA_URL = "./data/portfolio.json";

/**
 * 현재 페이지가 로컬 파일(file:) 프로토콜인지 여부
 * @returns {boolean}
 */
function isFileProtocol() {
  return window.location.protocol === "file:";
}

/**
 * index.html에 포함된 JSON(script#portfolio-embed)을 읽습니다. file:// 전용 폴백입니다.
 * @returns {object}
 */
function loadEmbeddedPortfolioFromDom() {
  const el = document.getElementById("portfolio-embed");
  if (!el || !el.textContent.trim()) {
    throw new Error("#portfolio-embed 요소가 없거나 비어 있습니다.");
  }
  return JSON.parse(el.textContent);
}

/**
 * 환경에 맞게 포트폴리오 데이터를 로드합니다.
 * @returns {Promise<object>}
 */
async function loadPortfolioData() {
  if (isFileProtocol()) {
    return loadEmbeddedPortfolioFromDom();
  }

  const response = await fetch(PORTFOLIO_DATA_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: 데이터를 불러오지 못했습니다.`);
  }
  return response.json();
}

/**
 * 데이터 로딩 실패 시 사용자에게 최소한의 안내를 표시합니다.
 * @param {string} message - 표시할 메시지
 */
function showGlobalError(message) {
  const hero = document.getElementById("hero");
  if (!hero) return;
  hero.innerHTML = "";
  const box = document.createElement("p");
  box.setAttribute("role", "alert");
  box.textContent = message;
  box.style.color = "var(--color-accent, #f5a524)";
  box.style.padding = "1rem";
  hero.appendChild(box);
}

/**
 * portfolio 데이터를 각 렌더 함수에 전달합니다.
 * @param {object} data - portfolio 루트 객체
 */
function renderAllSections(data) {
  renderHero(data.hero);
  renderAbout(data.about);
  renderTechStack(data.techStack);
  renderProjects(data.projects);
  renderExperience(data.experience);
  renderContact(data.contact);
}

/**
 * 앱 진입점
 */
async function bootstrap() {
  try {
    const data = await loadPortfolioData();
    renderAllSections(data);
  } catch (err) {
    console.error(err);
    const hint = isFileProtocol()
      ? "포트폴리오 데이터를 읽지 못했습니다. index.html 안의 #portfolio-embed JSON 형식을 확인하세요."
      : "포트폴리오 데이터를 불러오지 못했습니다. data/portfolio.json 경로와 로컬 서버(npx serve 등) 실행 여부를 확인하세요.";
    showGlobalError(hint);
  } finally {
    initPortfolioUI();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrap();
});
