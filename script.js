"use strict";

const recommendedRoles = ["팀장", "자료조사", "PPT 제작", "발표", "보고서 작성", "회의록 작성", "자료 정리", "디자인", "자료 검수", "일정 관리", "영상 편집", "코딩"];
let members = ["", ""];
let roles = ["", ""];
let selectedSuggestions = new Set();
let currentAssignments = null;
let revealTimer = null;

const memberList = document.querySelector("#members-list");
const roleList = document.querySelector("#roles-list");
const suggestionBox = document.querySelector("#suggestion-box");
const suggestionToggle = document.querySelector("#suggestion-toggle");
const notice = document.querySelector("#notice");
const resultPanel = document.querySelector("#result-panel");
const drawButton = document.querySelector("#draw-button");
const normalize = (value) => value.trim().toLocaleLowerCase("ko-KR");
const nonEmpty = (values) => values.map((value) => value.trim()).filter(Boolean);

function showNotice(message = "") {
  notice.textContent = message ? `♡ ${message}` : "";
  notice.hidden = !message;
}

function cancelPendingReveal() {
  if (revealTimer !== null) window.clearTimeout(revealTimer);
  revealTimer = null;
  resultPanel.classList.remove("is-suspense", "is-revealing");
  resultPanel.removeAttribute("aria-busy");
}

function updateCounts() {
  const memberCount = nonEmpty(members).length;
  const roleCount = nonEmpty(roles).length;
  document.querySelector("#member-count").textContent = `${memberCount}명`;
  document.querySelector("#role-count").textContent = `${roleCount}개`;
  document.querySelector("#balance-members").textContent = `${memberCount}명`;
  document.querySelector("#balance-roles").textContent = `${roleCount}개`;
  document.querySelector("#balance-status").textContent = "각 역할은 한 번씩 배정돼요";
}

function makeInputRow(kind, value, index) {
  const row = document.createElement("div");
  row.className = "input-row";
  const number = document.createElement("span");
  number.className = `row-index${kind === "role" ? " role-index" : ""}`;
  number.textContent = String(index + 1).padStart(2, "0");
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 40;
  input.autocomplete = "off";
  input.setAttribute("aria-label", `${kind === "member" ? "팀원" : "역할"} ${index + 1}`);
  input.placeholder = kind === "member" ? `팀원 이름 ${index + 1}` : "예: 자료조사";
  input.value = value;
  input.addEventListener("input", () => {
    cancelPendingReveal();
    (kind === "member" ? members : roles)[index] = input.value;
    currentAssignments = null;
    drawButton.hidden = false;
    resultPanel.hidden = true;
    showNotice();
    updateCounts();
    if (kind === "role") renderSuggestions();
  });
  input.addEventListener("blur", () => {
    if (kind !== "role" || !input.value.trim()) return;
    const duplicate = roles.some((item, itemIndex) => itemIndex !== index && normalize(item) === normalize(input.value));
    showNotice(duplicate ? `‘${input.value.trim()}’ 역할은 이미 있어요.` : "");
  });
  const remove = document.createElement("button");
  remove.className = "remove-button";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `${kind === "member" ? "팀원" : "역할"} ${index + 1} 삭제`);
  remove.disabled = (kind === "member" ? members : roles).length <= 1;
  remove.addEventListener("click", () => {
    const values = kind === "member" ? members : roles;
    if (values.length <= 1) return;
    cancelPendingReveal();
    values.splice(index, 1);
    currentAssignments = null;
    drawButton.hidden = false;
    resultPanel.hidden = true;
    renderAll();
  });
  row.append(number, input, remove);
  return row;
}

function renderInputs() {
  memberList.replaceChildren(...members.map((value, index) => makeInputRow("member", value, index)));
  roleList.replaceChildren(...roles.map((value, index) => makeInputRow("role", value, index)));
  updateCounts();
}

function renderSuggestions() {
  const existing = new Set(nonEmpty(roles).map(normalize));
  const available = recommendedRoles.filter((role) => !existing.has(normalize(role)));
  const chips = document.querySelector("#suggestion-chips");
  chips.replaceChildren();
  if (!available.length) {
    const done = document.createElement("span");
    done.className = "all-added";
    done.textContent = "추천 역할을 모두 추가했어요 ✦";
    chips.append(done);
  }
  available.forEach((role) => {
    const chip = document.createElement("button");
    chip.type = "button";
    const isSelected = selectedSuggestions.has(role);
    chip.className = `chip${isSelected ? " selected" : ""}`;
    chip.textContent = `${isSelected ? "✓" : "+"} ${role}`;
    chip.setAttribute("aria-pressed", String(isSelected));
    chip.addEventListener("click", () => {
      if (selectedSuggestions.has(role)) selectedSuggestions.delete(role);
      else selectedSuggestions.add(role);
      renderSuggestions();
    });
    chips.append(chip);
  });
  document.querySelector("#selected-count").textContent = `${selectedSuggestions.size}개 선택`;
  document.querySelector("#add-selected").disabled = selectedSuggestions.size === 0;
}

function renderAll() {
  renderInputs();
  renderSuggestions();
}

function addEmptyRow(kind) {
  cancelPendingReveal();
  if (kind === "member") members.push("");
  else roles.push("");
  currentAssignments = null;
  drawButton.hidden = false;
  resultPanel.hidden = true;
  renderAll();
  const list = kind === "member" ? memberList : roleList;
  list.lastElementChild?.querySelector("input")?.focus();
}

function addSelectedRoles() {
  cancelPendingReveal();
  const existing = new Set(nonEmpty(roles).map(normalize));
  const fresh = [...selectedSuggestions].filter((role) => !existing.has(normalize(role)));
  roles.push(...fresh);
  selectedSuggestions.clear();
  currentAssignments = null;
  drawButton.hidden = false;
  resultPanel.hidden = true;
  showNotice();
  renderAll();
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function drawRoles() {
  cancelPendingReveal();
  const cleanMembers = nonEmpty(members);
  const cleanRoles = nonEmpty(roles);
  if (cleanMembers.length < 1) return showNotice("팀원 이름을 한 명 이상 입력해 주세요.");
  if (cleanRoles.length < 1) return showNotice("역할을 한 개 이상 입력해 주세요.");
  if (new Set(cleanMembers.map(normalize)).size !== cleanMembers.length) return showNotice("팀원 이름이 겹쳐요. 서로 다른 이름을 입력해 주세요.");
  if (new Set(cleanRoles.map(normalize)).size !== cleanRoles.length) return showNotice("같은 역할이 두 번 들어 있어요. 중복을 정리해 주세요.");
  const recipients = shuffle(cleanMembers);
  const rolesByPerson = new Map(cleanMembers.map((person) => [person, []]));
  shuffle(cleanRoles).forEach((role, index) => rolesByPerson.get(recipients[index % recipients.length]).push(role));
  currentAssignments = cleanMembers.map((person) => ({ person, roles: rolesByPerson.get(person) }));
  showNotice();
  showRevealSuspense();
}

function showRevealSuspense() {
  drawButton.hidden = true;
  resultPanel.className = "result-panel is-suspense";
  resultPanel.setAttribute("aria-busy", "true");
  resultPanel.innerHTML = '<div class="reveal-stage"><div class="reveal-orbit" aria-hidden="true"><span class="reveal-orbit-star star-a">✦</span><span class="reveal-tiara">♕</span><span class="reveal-orbit-star star-b">✧</span><span class="reveal-orbit-heart">♡</span></div><span class="reveal-kicker">THE MOMENT OF TRUTH</span><h2 class="reveal-title">운명의 역할을<br />고르는 중...</h2><p class="reveal-copy">누가 어떤 역할을 맡게 될까요?</p><div class="reveal-progress" aria-hidden="true"><span></span></div><span class="reveal-footnote">잠시만 기다려 주세요 ✦</span></div>';
  resultPanel.hidden = false;
  const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1650;
  revealTimer = window.setTimeout(() => {
    revealTimer = null;
    renderResults();
  }, delay);
}

function renderResults() {
  if (!currentAssignments) return;
  resultPanel.className = "result-panel is-revealing";
  resultPanel.setAttribute("aria-busy", "false");
  const confetti = document.createElement("div");
  confetti.className = "reveal-confetti";
  confetti.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 12; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--offset", `${(index - 5.5) * 23}px`);
    piece.style.setProperty("--lift", `${-22 - (index % 4) * 10}px`);
    piece.style.setProperty("--spin", `${(index % 2 ? 1 : -1) * (120 + index * 18)}deg`);
    piece.style.setProperty("--delay", `${(index % 5) * 35}ms`);
    confetti.append(piece);
  }
  const heading = document.createElement("div");
  heading.className = "result-heading";
  heading.innerHTML = '<div><span class="section-kicker">02 — IT’S YOUR DESTINY</span><h2>두근두근, 결과 공개!</h2></div><span class="result-crown" aria-hidden="true">♕</span>';
  const list = document.createElement("div");
  list.className = "result-list";
  currentAssignments.forEach(({ person, roles }, index) => {
    const row = document.createElement("div");
    row.className = "result-row";
    row.style.setProperty("--row-index", index);
    row.style.setProperty("--row-delay", `${150 + index * 140}ms`);
    const number = document.createElement("span"); number.className = "result-number"; number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("strong"); name.textContent = person;
    const arrow = document.createElement("span"); arrow.className = "result-arrow"; arrow.textContent = "→";
    const roleLabels = document.createElement("div"); roleLabels.className = "result-role-list";
    if (roles.length === 0) {
      const empty = document.createElement("span"); empty.className = "result-role-empty"; empty.textContent = "이번엔 맡은 역할이 없어요"; roleLabels.append(empty);
    } else {
      roles.forEach((role, roleIndex) => { const label = document.createElement("span"); label.className = "result-role"; label.style.setProperty("--chip-delay", `${270 + index * 140 + roleIndex * 70}ms`); label.textContent = role; roleLabels.append(label); });
    }
    row.append(number, name, arrow, roleLabels); list.append(row);
  });
  const actions = document.createElement("div"); actions.className = "result-actions";
  const copy = document.createElement("button"); copy.className = "copy-button"; copy.type = "button"; copy.textContent = "▢ 결과 복사";
  copy.addEventListener("click", async () => {
    const text = currentAssignments.map(({ person, roles }) => `${person} — ${roles.length ? roles.join(", ") : "이번엔 맡은 역할 없음"}`).join("\n");
    try { await navigator.clipboard.writeText(text); showNotice("결과를 복사했어요!"); }
    catch { showNotice("복사할 수 없어요. 브라우저 권한을 확인해 주세요."); }
  });
  const reshuffle = document.createElement("button"); reshuffle.className = "reshuffle-button"; reshuffle.type = "button"; reshuffle.textContent = "⟳ 다시 섞기"; reshuffle.addEventListener("click", drawRoles);
  actions.append(copy, reshuffle);
  resultPanel.replaceChildren(confetti, heading, list, actions);
  resultPanel.hidden = false;
  drawButton.hidden = true;
}

function reset() {
  cancelPendingReveal();
  members = ["", ""];
  roles = ["", ""];
  selectedSuggestions.clear();
  currentAssignments = null;
  suggestionBox.hidden = true;
  suggestionToggle.setAttribute("aria-expanded", "false");
  suggestionToggle.querySelector("b").textContent = "＋";
  resultPanel.hidden = true;
  drawButton.hidden = false;
  showNotice();
  renderAll();
}

document.querySelector("#add-member").addEventListener("click", () => addEmptyRow("member"));
document.querySelector("#add-role").addEventListener("click", () => addEmptyRow("role"));
document.querySelector("#add-selected").addEventListener("click", addSelectedRoles);
document.querySelector("#draw-button").addEventListener("click", drawRoles);
document.querySelector("#reset-button").addEventListener("click", reset);
suggestionToggle.addEventListener("click", () => {
  suggestionBox.hidden = !suggestionBox.hidden;
  suggestionToggle.setAttribute("aria-expanded", String(!suggestionBox.hidden));
  suggestionToggle.querySelector("b").textContent = suggestionBox.hidden ? "＋" : "−";
});

renderAll();

