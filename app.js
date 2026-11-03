import {
  SESSION_LENGTH,
  createQuestionForIndex,
  labelForSkill
} from "./generator.js";

const STORAGE_KEY = "math-garden.session.v1";
const STATE_VERSION = 1;

const elements = {
  quizView: document.querySelector("#quizView"),
  summaryView: document.querySelector("#summaryView"),
  sessionStatus: document.querySelector("#sessionStatus"),
  progressList: document.querySelector("#progressList"),
  progressCount: document.querySelector("#progressCount"),
  pauseButton: document.querySelector("#pauseButton"),
  questionTitle: document.querySelector("#questionTitle"),
  questionType: document.querySelector("#questionType"),
  storyBox: document.querySelector("#storyBox"),
  storyText: document.querySelector("#storyText"),
  expression: document.querySelector("#expression"),
  answerDisplay: document.querySelector("#answerDisplay"),
  answerLabel: document.querySelector("#answerLabel"),
  keypad: document.querySelector("#keypad"),
  checkButton: document.querySelector("#checkButton"),
  checkButtonLabel: document.querySelector("#checkButtonLabel"),
  hintCard: document.querySelector(".hint-card"),
  hintLabel: document.querySelector("#hintLabel"),
  hintText: document.querySelector("#hintText"),
  hintToggle: document.querySelector("#hintToggle"),
  explanationPanel: document.querySelector("#explanationPanel"),
  explanationHeadline: document.querySelector("#explanationHeadline"),
  explanationVisual: document.querySelector("#explanationVisual"),
  explanationSteps: document.querySelector("#explanationSteps"),
  explanationTip: document.querySelector("#explanationTip"),
  feedbackCard: document.querySelector("#feedbackCard"),
  feedbackIcon: document.querySelector("#feedbackIcon"),
  feedbackTitle: document.querySelector("#feedbackTitle"),
  feedbackText: document.querySelector("#feedbackText"),
  summaryTitle: document.querySelector("#summaryTitle"),
  summaryLead: document.querySelector("#summaryLead"),
  summaryScore: document.querySelector("#summaryScore"),
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryMap: document.querySelector("#summaryMap"),
  summarySkills: document.querySelector("#summarySkills"),
  summaryTip: document.querySelector("#summaryTip"),
  reviewWrongButton: document.querySelector("#reviewWrongButton"),
  wrongReviewPanel: document.querySelector("#wrongReviewPanel"),
  wrongReviewList: document.querySelector("#wrongReviewList"),
  newSessionButton: document.querySelector("#newSessionButton"),
  pauseDialog: document.querySelector("#pauseDialog"),
  resumeButton: document.querySelector("#resumeButton"),
  announcer: document.querySelector("#announcer")
};

let justAnsweredCorrectly = false;

function createSeed() {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Date.now() >>> 0;
}

function createSession(seed = createSeed()) {
  const difficultyBySkill = { add: 1, sub: 1, missing: 2, multi: 2 };
  const firstQuestion = createQuestionForIndex(0, seed, difficultyBySkill, []);
  return {
    version: STATE_VERSION,
    seed,
    startedAt: new Date().toISOString(),
    currentIndex: 0,
    difficultyBySkill,
    streakBySkill: { add: 0, sub: 0, missing: 0, multi: 0 },
    entered: "",
    hintOpen: false,
    phase: "answering",
    completed: false,
    questions: [firstQuestion],
    results: []
  };
}

function normalizeSession(candidate) {
  const fallbackDifficulty = typeof candidate.difficulty === "number"
    ? Math.min(3, Math.max(1, candidate.difficulty))
    : 2;
  candidate.difficultyBySkill = {
    add: candidate.difficultyBySkill?.add ?? fallbackDifficulty,
    sub: candidate.difficultyBySkill?.sub ?? fallbackDifficulty,
    missing: candidate.difficultyBySkill?.missing ?? 2,
    multi: candidate.difficultyBySkill?.multi ?? 2
  };
  candidate.streakBySkill = {
    add: candidate.streakBySkill?.add ?? candidate.correctStreak ?? 0,
    sub: candidate.streakBySkill?.sub ?? candidate.correctStreak ?? 0,
    missing: candidate.streakBySkill?.missing ?? 0,
    multi: candidate.streakBySkill?.multi ?? 0
  };
  return candidate;
}

function isValidSession(candidate) {
  return Boolean(
    candidate &&
    candidate.version === STATE_VERSION &&
    Number.isInteger(candidate.currentIndex) &&
    candidate.currentIndex >= 0 &&
    candidate.currentIndex < SESSION_LENGTH &&
    Array.isArray(candidate.questions) &&
    Array.isArray(candidate.results) &&
    candidate.questions.length === candidate.currentIndex + 1
  );
}

function loadSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const candidate = JSON.parse(stored);
    if (isValidSession(candidate)) return normalizeSession(candidate);
  } catch {
    // A malformed or unavailable local store should never block a new session.
  }
  return null;
}

function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing can reject storage; the current session still works in memory.
  }
}

let state = loadSession() ?? createSession();

function currentQuestion() {
  return state.questions[state.currentIndex];
}

function currentResult() {
  return state.results[state.currentIndex] ?? null;
}

function resultForIndex(index) {
  return state.results.find((result) => result.index === index) ?? null;
}

function createSvgIcon(symbolId) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", `#${symbolId}`);
  svg.append(use);
  return svg;
}

function renderProgress() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < SESSION_LENGTH; index += 1) {
    const result = resultForIndex(index);
    const flower = document.createElement("span");
    const isCurrent = index === state.currentIndex && !state.completed;
    const isJustCorrect = justAnsweredCorrectly && index === state.currentIndex && result?.correct;

    flower.className = "flower-stop";
    if (result?.correct) flower.classList.add("is-correct");
    if (result && !result.correct) flower.classList.add("is-wrong");
    if (isCurrent) flower.classList.add("is-current");
    if (isJustCorrect) flower.classList.add("is-just-correct");

    let label = `第 ${index + 1} 题`;
    if (result?.correct) label += "，答对";
    if (result && !result.correct) label += "，再练一次";
    if (isCurrent) label += "，当前题目";
    flower.setAttribute("aria-label", label);
    flower.append(createSvgIcon("icon-flower"));
    fragment.append(flower);
  }

  elements.progressList.replaceChildren(fragment);
  elements.progressCount.textContent = `${state.results.length} / ${SESSION_LENGTH}`;
}

function renderExpression(question) {
  const fragment = document.createDocumentFragment();

  for (const part of question.expression) {
    const span = document.createElement("span");
    span.textContent = part.value;

    if (part.type === "operator") {
      span.className = part.value === "=" ? "equation__equals" : "equation__operator";
    }
    if (part.type === "blank") {
      span.className = "equation__blank";
    }
    fragment.append(span);
  }

  elements.expression.replaceChildren(fragment);
  elements.expression.setAttribute("aria-label", question.expressionText);
}

function renderRegroupVisual(visual, mode) {
  const wrapper = document.createElement("div");
  wrapper.className = "regroup-row";

  if (mode === "borrow") {
    const row = document.createElement("div");
    row.className = "borrow-row";

    const rod = document.createElement("span");
    rod.className = "ten-rod";
    rod.setAttribute("aria-hidden", "true");

    const arrow = document.createElement("span");
    arrow.className = "visual-arrow";
    arrow.textContent = "→";

    const dots = document.createElement("div");
    dots.className = "dot-row";
    for (let index = 0; index < 10; index += 1) {
      const dot = document.createElement("span");
      dot.className = "dot dot--teal";
      dots.append(dot);
    }

    row.append(rod, arrow, dots);
    wrapper.append(row);

    const caption = document.createElement("div");
    caption.className = "regroup-equation";
    caption.textContent = "1 个十 = 10 个一";
    wrapper.append(caption);
    return wrapper;
  }

  const equation = document.createElement("div");
  equation.className = "regroup-equation";
  const current = document.createElement("span");
  current.className = "regroup-current";
  current.textContent = `${visual.total}`;
  equation.append(
    document.createTextNode(`个位 ${visual.a} + ${visual.b} = `),
    current
  );
  wrapper.append(equation);

  const dots = document.createElement("div");
  dots.className = "dot-row";
  for (let index = 0; index < visual.total; index += 1) {
    const dot = document.createElement("span");
    dot.className = index < visual.a ? "dot" : "dot dot--honey";
    dots.append(dot);
  }
  wrapper.append(dots);

  if (visual.total >= 10) {
    const caption = document.createElement("div");
    caption.className = "regroup-equation";
    caption.textContent = "其中 10 个一，正好组成 1 个十";
    wrapper.append(caption);
  }

  return wrapper;
}

function renderExplanation(question) {
  const explanation = question.explanation;
  elements.explanationHeadline.textContent = explanation.headline;
  elements.explanationVisual.replaceChildren();
  elements.explanationSteps.replaceChildren();
  elements.explanationTip.textContent = explanation.tip;

  if (explanation.visual?.type === "carry" || explanation.visual?.type === "borrow") {
    elements.explanationVisual.append(renderRegroupVisual(explanation.visual, explanation.visual.type));
  } else if (explanation.visual?.type === "inverse") {
    const visual = document.createElement("div");
    visual.className = "inverse-visual";
    const left = document.createElement("span");
    left.textContent = explanation.visual.left;
    const arrow = document.createElement("span");
    arrow.className = "visual-arrow";
    arrow.textContent = "=";
    const right = document.createElement("span");
    right.textContent = explanation.visual.right;
    visual.append(left, arrow, right);
    elements.explanationVisual.append(visual);
  } else {
    const visual = document.createElement("div");
    visual.className = "inverse-visual";
    const left = document.createElement("span");
    left.textContent = String(explanation.visual?.a ?? "");
    const arrow = document.createElement("span");
    arrow.className = "visual-arrow";
    arrow.textContent = explanation.visual?.operator ?? "+";
    const right = document.createElement("span");
    const bValue = String(explanation.visual?.b ?? "");
    right.textContent = explanation.visual?.total != null
      ? `${bValue} = ${explanation.visual.total}`
      : bValue;
    visual.append(left, arrow, right);
    elements.explanationVisual.append(visual);
  }

  for (const step of explanation.steps) {
    const row = document.createElement("div");
    row.className = "explanation-step";
    const label = document.createElement("span");
    label.className = "explanation-step__label";
    label.textContent = step.label;
    const expression = document.createElement("span");
    expression.className = "explanation-step__expression";
    expression.textContent = step.expression;
    row.append(label, expression);
    elements.explanationSteps.append(row);
  }
}

function renderFeedback(question, result) {
  const correct = result.correct;
  elements.feedbackCard.hidden = false;
  elements.feedbackCard.classList.toggle("is-wrong", !correct);
  elements.feedbackIcon.replaceChildren(createSvgIcon(correct ? "icon-check" : "icon-hint"));

  if (correct) {
    elements.feedbackTitle.textContent = "开出一朵花！";
    elements.feedbackText.textContent = `算对了，答案就是 ${question.answer}。`;
  } else {
    elements.feedbackTitle.textContent = "差一点，找到新线索了";
    elements.feedbackText.textContent = `正确答案是 ${question.answer}。你的答案 ${result.entered} 也帮我们找到了卡住的地方。`;
  }
}

function setKeypadDisabled(disabled) {
  for (const button of elements.keypad.querySelectorAll("button")) {
    button.disabled = disabled;
  }
}

function renderQuestion() {
  const question = currentQuestion();
  const result = currentResult();
  const answered = state.phase === "answered";
  const isLast = state.currentIndex === SESSION_LENGTH - 1;

  elements.sessionStatus.textContent = `第 ${state.currentIndex + 1} 题 / 共 ${SESSION_LENGTH} 题`;
  elements.questionTitle.textContent = question.title;
  elements.questionType.textContent = question.skillLabel;
  elements.storyBox.hidden = !question.story;
  elements.storyText.textContent = question.story ?? "";
  renderExpression(question);

  elements.answerDisplay.textContent = state.entered || "?";
  elements.answerDisplay.classList.toggle("is-empty", !state.entered);
  elements.answerDisplay.setAttribute(
    "aria-label",
    state.entered ? `当前答案 ${state.entered}` : "当前答案为空"
  );

  setKeypadDisabled(answered);
  renderProgress();

  elements.hintCard.classList.toggle("is-open", state.hintOpen);
  elements.hintText.textContent = state.hintOpen
    ? question.hint
    : "先自己试一试，卡住了再打开提示。";
  elements.hintToggle.setAttribute("aria-expanded", String(state.hintOpen));
  elements.hintToggle.querySelector("span").textContent = state.hintOpen
    ? "收起小提示"
    : "看看小提示";

  elements.explanationPanel.hidden = !answered;
  elements.feedbackCard.hidden = !answered;

  if (answered && result) {
    renderExplanation(question);
    renderFeedback(question, result);
  }

  elements.checkButton.classList.toggle("primary-button--next", answered);
  elements.checkButtonLabel.textContent = answered
    ? (isLast ? "查看花园" : "下一题")
    : "检查答案";

  elements.quizView.hidden = false;
  elements.summaryView.hidden = true;
  elements.pauseButton.hidden = false;
  document.title = `第 ${state.currentIndex + 1} 题 · 数学花园`;
}

function answerCurrentQuestion() {
  if (state.phase === "answered") {
    advance();
    return;
  }

  if (!state.entered) {
    elements.answerDisplay.classList.remove("is-shaking");
    void elements.answerDisplay.offsetWidth;
    elements.answerDisplay.classList.add("is-shaking");
    elements.announcer.textContent = "先输入一个答案，再检查。";
    return;
  }

  const question = currentQuestion();
  const enteredNumber = Number(state.entered);
  const correct = enteredNumber === question.answer;
  const result = {
    index: state.currentIndex,
    questionId: question.id,
    correct,
    entered: state.entered,
    answer: question.answer,
    answeredAt: new Date().toISOString()
  };

  state.results.push(result);
  state.phase = "answered";
  justAnsweredCorrectly = correct;
  const skillKey = question.skillKey;

  if (correct) {
    state.streakBySkill[skillKey] += 1;
    if (state.streakBySkill[skillKey] >= 2) {
      state.difficultyBySkill[skillKey] = Math.min(
        3,
        state.difficultyBySkill[skillKey] + 1
      );
    }
  } else {
    state.streakBySkill[skillKey] = 0;
    state.difficultyBySkill[skillKey] = Math.max(
      1,
      state.difficultyBySkill[skillKey] - 1
    );
  }

  saveSession();
  renderQuestion();
  elements.announcer.textContent = correct
    ? `答对了，答案是 ${question.answer}。`
    : `差一点。正确答案是 ${question.answer}。`;
}

function advance() {
  if (state.currentIndex >= SESSION_LENGTH - 1) {
    state.completed = true;
    state.phase = "summary";
    justAnsweredCorrectly = false;
    saveSession();
    renderSummary();
    return;
  }

  const nextIndex = state.currentIndex + 1;
  const question = createQuestionForIndex(
    nextIndex,
    state.seed,
    state.difficultyBySkill,
    state.questions
  );

  state.currentIndex = nextIndex;
  state.questions.push(question);
  state.entered = "";
  state.hintOpen = false;
  state.phase = "answering";
  justAnsweredCorrectly = false;
  saveSession();
  renderQuestion();
  elements.questionTitle.setAttribute("tabindex", "-1");
  elements.questionTitle.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "auto" });
  elements.announcer.textContent = `第 ${nextIndex + 1} 题。`;
}

function addDigit(digit) {
  if (state.phase !== "answering") return;
  if (state.entered.length >= 3) return;

  if (state.entered === "0") {
    if (digit === "0") return;
    state.entered = digit;
  } else {
    state.entered += digit;
  }

  renderQuestionAnswer();
}

function backspace() {
  if (state.phase !== "answering") return;
  state.entered = state.entered.slice(0, -1);
  renderQuestionAnswer();
}

function clearAnswer() {
  if (state.phase !== "answering") return;
  state.entered = "";
  renderQuestionAnswer();
}

function renderQuestionAnswer() {
  elements.answerDisplay.textContent = state.entered || "?";
  elements.answerDisplay.classList.toggle("is-empty", !state.entered);
  elements.answerDisplay.setAttribute(
    "aria-label",
    state.entered ? `当前答案 ${state.entered}` : "当前答案为空"
  );
}

function toggleHint() {
  state.hintOpen = !state.hintOpen;
  renderQuestion();
}

function buildSkillStats() {
  const skills = ["add", "sub", "missing", "multi"];
  return skills.map((skillKey) => {
    let total = 0;
    let correct = 0;

    for (const result of state.results) {
      const question = state.questions[result.index];
      if (question?.skillKey !== skillKey) continue;
      total += 1;
      if (result.correct) correct += 1;
    }

    return {
      skillKey,
      label: labelForSkill(skillKey),
      total,
      correct
    };
  }).filter((skill) => skill.total > 0);
}

function renderSummaryMap() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < SESSION_LENGTH; index += 1) {
    const result = resultForIndex(index);
    const item = document.createElement("span");
    item.className = "summary-stop";
    if (result?.correct) item.classList.add("is-correct");
    if (result && !result.correct) item.classList.add("is-wrong");
    item.setAttribute(
      "aria-label",
      `第 ${index + 1} 题，${result?.correct ? "答对" : result ? "再练一次" : "未完成"}`
    );
    item.append(createSvgIcon("icon-flower"));
    fragment.append(item);
  }

  elements.summaryMap.replaceChildren(fragment);
}

function renderSkills(skills) {
  const fragment = document.createDocumentFragment();

  for (const skill of skills) {
    const row = document.createElement("div");
    row.className = "skill-row";

    const name = document.createElement("span");
    name.className = "skill-row__name";
    name.textContent = skill.label;

    const score = document.createElement("span");
    score.className = "skill-row__score";
    score.textContent = `${skill.correct} / ${skill.total}`;

    const track = document.createElement("div");
    track.className = "skill-row__track";
    const fill = document.createElement("div");
    fill.className = "skill-row__fill";
    if (skill.correct < skill.total) fill.classList.add("is-partial");
    fill.style.width = `${skill.total === 0 ? 0 : (skill.correct / skill.total) * 100}%`;
    track.append(fill);

    row.append(name, score, track);
    fragment.append(row);
  }

  elements.summarySkills.replaceChildren(fragment);
}

function summaryTipFor(wrongResults, skills) {
  if (wrongResults.length === 0) {
    return "这一局没有错题。下次可以试试更多进位和退位，看看花园还能开多大。";
  }

  const weakestSkill = [...skills].sort((a, b) => {
    const aRate = a.total ? a.correct / a.total : 1;
    const bRate = b.total ? b.correct / b.total : 1;
    return aRate - bRate;
  })[0];
  const matchingWrong = wrongResults.find((result) => {
    return state.questions[result.index]?.skillKey === weakestSkill.skillKey;
  }) ?? wrongResults[0];
  const wrongQuestion = state.questions[matchingWrong.index];

  if (wrongQuestion?.explanation?.tip) {
    return `${weakestSkill.label}可以再练一练。${wrongQuestion.explanation.tip}`;
  }
  return "下次遇到卡住的地方，先拆成两步试试。";
}

function renderWrongReview(wrongResults) {
  const fragment = document.createDocumentFragment();

  for (const result of wrongResults) {
    const question = state.questions[result.index];
    if (!question) continue;

    const item = document.createElement("article");
    item.className = "review-item";

    const head = document.createElement("div");
    head.className = "review-item__head";

    const expression = document.createElement("span");
    expression.className = "review-item__expression";
    expression.textContent = question.expressionText.replace(/\s*=$/, "");

    const answer = document.createElement("span");
    answer.className = "review-item__answer";
    answer.textContent = `答案是 ${question.answer}`;

    head.append(expression, answer);

    const paragraph = document.createElement("p");
    paragraph.textContent = question.explanation.steps
      .map((step) => step.expression)
      .join(" · ");

    item.append(head, paragraph);
    fragment.append(item);
  }

  elements.wrongReviewList.replaceChildren(fragment);
}

function renderSummary() {
  const correctCount = state.results.filter((result) => result.correct).length;
  const wrongResults = state.results.filter((result) => !result.correct);
  const skills = buildSkillStats();

  elements.summaryTitle.textContent = correctCount === SESSION_LENGTH
    ? "整座花园都开花啦"
    : (correctCount > 0 ? "你的花园开花了" : "花园已经种好啦");
  elements.summaryLead.textContent = wrongResults.length === 0
    ? "每一道题都算对了。下一次，我们去看看更有挑战的数字。"
    : `有 ${wrongResults.length} 个小难点变成了下次的线索。会思考的孩子，就是这样一点点变强的。`;
  elements.summaryScore.textContent = String(correctCount);
  elements.summaryTotal.textContent = `共 ${SESSION_LENGTH} 题`;
  elements.sessionStatus.textContent = "本局完成";
  elements.pauseButton.hidden = true;
  elements.quizView.hidden = true;
  elements.summaryView.hidden = false;
  elements.summaryTip.textContent = summaryTipFor(wrongResults, skills);

  renderSummaryMap();
  renderSkills(skills);
  renderWrongReview(wrongResults);

  const hasWrong = wrongResults.length > 0;
  elements.reviewWrongButton.hidden = !hasWrong;
  elements.reviewWrongButton.setAttribute("aria-expanded", "false");
  elements.reviewWrongButton.querySelector("span").textContent = hasWrong
    ? `复习 ${wrongResults.length} 道易错题`
    : "复习易错题";
  elements.wrongReviewPanel.hidden = true;
  elements.summaryTitle.setAttribute("tabindex", "-1");
  elements.summaryTitle.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "auto" });
  document.title = "本局总结 · 数学花园";
}

function toggleWrongReview() {
  const opening = elements.wrongReviewPanel.hidden;
  elements.wrongReviewPanel.hidden = !opening;
  elements.reviewWrongButton.setAttribute("aria-expanded", String(opening));
  if (opening) {
    elements.wrongReviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function startNewSession() {
  state = createSession();
  justAnsweredCorrectly = false;
  saveSession();
  renderQuestion();
  elements.announcer.textContent = "新的一局开始，第 1 题。";
  elements.questionTitle.setAttribute("tabindex", "-1");
  elements.questionTitle.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function handleCheckOrAdvance() {
  if (state.completed) return;
  answerCurrentQuestion();
}

function handleDigitInput(event) {
  if (state.completed || state.phase !== "answering" || elements.pauseDialog.open) return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    addDigit(event.key);
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    backspace();
    return;
  }
  if (event.key === "Escape") {
    clearAnswer();
    return;
  }
  if (event.key === "Enter" && event.target.closest("#keypad button")) {
    event.preventDefault();
    handleCheckOrAdvance();
    return;
  }
  if (event.key === "Enter" && !event.target.closest("button, a, input, textarea, select")) {
    event.preventDefault();
    handleCheckOrAdvance();
  }
}

function openPauseDialog() {
  if (typeof elements.pauseDialog.showModal === "function") {
    elements.pauseDialog.returnValue = "resume";
    elements.pauseDialog.showModal();
    elements.resumeButton.focus();
  }
}

elements.keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;

  if (button.dataset.digit) {
    addDigit(button.dataset.digit);
    return;
  }

  if (button.dataset.action === "backspace") {
    backspace();
    return;
  }

  if (button.dataset.action === "clear") {
    clearAnswer();
  }
});

elements.checkButton.addEventListener("click", handleCheckOrAdvance);
elements.hintToggle.addEventListener("click", toggleHint);
elements.newSessionButton.addEventListener("click", startNewSession);
elements.reviewWrongButton.addEventListener("click", toggleWrongReview);
elements.pauseButton.addEventListener("click", openPauseDialog);

elements.pauseDialog.addEventListener("close", () => {
  if (elements.pauseDialog.returnValue === "restart") {
    startNewSession();
  } else {
    elements.pauseButton.focus();
  }
});

document.addEventListener("keydown", handleDigitInput);

if (state.completed) {
  renderSummary();
} else {
  renderQuestion();
}
