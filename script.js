"use strict";

const recommendedRoles = ["팀장", "자료조사", "PPT 제작", "발표", "보고서 작성", "회의록 작성", "자료 정리", "디자인", "자료 검수", "일정 관리", "영상 편집", "코딩"];
let members = ["", ""];
let roles = ["", ""];
let selectedSuggestions = new Set();
let currentAssignments = null;

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

function updateCounts() {
  const memberCount = nonEmpty(members).length;
  const roleCount = nonEmpty(roles).length;
  document.querySelector("#member-count").textContent = `${memberCount}명`;
  document.querySelector("#role-count").textContent = `${roleCount}개`;
  document.querySelector("#balance-members").textContent = `${memberCount}명`;
  document.querySelector("#balance-roles").textContent = `${roleCount}개`;
  const balanced = memberCount === roleCount;
  const status = document.querySelector("#balance-status");
  status.textContent = balanced ? "준비 완료" : "수를 맞춰주세요";
  status.classList.toggle("ready", balanced);
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
  const cleanMembers = nonEmpty(members);
  const cleanRoles = nonEmpty(roles);
  if (cleanMembers.length < 2) return showNotice("팀원 이름을 2명 이상 입력해 주세요.");
  if (new Set(cleanMembers.map(normalize)).size !== cleanMembers.length) return showNotice("팀원 이름이 겹쳐요. 서로 다른 이름을 입력해 주세요.");
  if (cleanRoles.length !== cleanMembers.length) return showNotice(`팀원은 ${cleanMembers.length}명, 역할은 ${cleanRoles.length}개예요. 같은 수로 맞춰 주세요.`);
  if (new Set(cleanRoles.map(normalize)).size !== cleanRoles.length) return showNotice("같은 역할이 두 번 들어 있어요. 중복을 정리해 주세요.");
  const shuffled = shuffle(cleanRoles);
  currentAssignments = cleanMembers.map((person, index) => ({ person, role: shuffled[index] }));
  showNotice();
  renderResults();
}

function renderResults() {
  if (!currentAssignments) return;
  const heading = document.createElement("div");
  heading.className = "result-heading";
  heading.innerHTML = '<div><span class="section-kicker">02 — IT’S YOUR DESTINY</span><h2>두근두근, 결과 공개!</h2></div><span class="result-crown" aria-hidden="true">♕</span>';
  const list = document.createElement("div");
  list.className = "result-list";
  currentAssignments.forEach(({ person, role }, index) => {
    const row = document.createElement("div");
    row.className = "result-row";
    const number = document.createElement("span"); number.className = "result-number"; number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("strong"); name.textContent = person;
    const arrow = document.createElement("span"); arrow.className = "result-arrow"; arrow.textContent = "→";
    const roleLabel = document.createElement("span"); roleLabel.className = "result-role"; roleLabel.textContent = role;
    row.append(number, name, arrow, roleLabel); list.append(row);
  });
  const actions = document.createElement("div"); actions.className = "result-actions";
  const copy = document.createElement("button"); copy.className = "copy-button"; copy.type = "button"; copy.textContent = "▢ 결과 복사";
  copy.addEventListener("click", async () => {
    const text = currentAssignments.map(({ person, role }) => `${person} — ${role}`).join("\n");
    try { await navigator.clipboard.writeText(text); showNotice("결과를 복사했어요!"); }
    catch { showNotice("복사할 수 없어요. 브라우저 권한을 확인해 주세요."); }
  });
  const reshuffle = document.createElement("button"); reshuffle.className = "reshuffle-button"; reshuffle.type = "button"; reshuffle.textContent = "⟳ 다시 섞기"; reshuffle.addEventListener("click", drawRoles);
  actions.append(copy, reshuffle);
  resultPanel.replaceChildren(heading, list, actions);
  resultPanel.hidden = false;
  drawButton.hidden = true;
}

function reset() {
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

