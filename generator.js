export const SESSION_LENGTH = 18;

const SKILL_LABELS = {
  add: "加法",
  sub: "减法",
  missing: "找缺失数字",
  multi: "分步计算"
};

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function clampDifficulty(value) {
  return Math.max(1, Math.min(3, value));
}

function stageForIndex(index) {
  if (index < 3) return "warmup";
  if (index < 12) return "core";
  if (index < 14) return "story";
  if (index < 16) return "missing";
  return "stretch";
}

function difficultyForSkill(profile, skillKey) {
  if (typeof profile === "number") return clampDifficulty(profile);
  return clampDifficulty(profile?.[skillKey] ?? 2);
}

function effectiveDifficulty(index, profile, skillKey) {
  const difficulty = difficultyForSkill(profile, skillKey);
  if (index < 3) return 1;
  if (index < 12) return clampDifficulty(Math.max(2, difficulty));
  if (index < 14) return clampDifficulty(Math.max(2, Math.min(3, difficulty)));
  if (index < 16) return clampDifficulty(Math.max(2, difficulty));
  return clampDifficulty(Math.max(2, difficulty));
}

function makeAddition(rng, difficulty) {
  if (difficulty === 1) {
    const a = randomInt(rng, 10, 15);
    const b = randomInt(rng, 1, Math.min(6, 19 - a));
    return { a, b };
  }

  if (difficulty === 2) {
    const aTens = randomInt(rng, 1, 5);
    const bTens = randomInt(rng, 1, Math.max(1, 8 - aTens));
    const aOnes = randomInt(rng, 1, 8);
    const bOnes = randomInt(rng, 1, 9 - aOnes);
    return {
      a: aTens * 10 + aOnes,
      b: bTens * 10 + bOnes
    };
  }

  const aTens = randomInt(rng, 1, 7);
  const bTens = randomInt(rng, 1, Math.max(1, 8 - aTens));
  const aOnes = randomInt(rng, 2, 9);
  const bOnes = randomInt(rng, Math.max(1, 10 - aOnes), 9);
  return {
    a: aTens * 10 + aOnes,
    b: bTens * 10 + bOnes
  };
}

function makeSubtraction(rng, difficulty) {
  if (difficulty === 1) {
    const a = randomInt(rng, 12, 19);
    const b = randomInt(rng, 1, Math.min(6, a % 10 || 6));
    return { a, b };
  }

  if (difficulty === 2) {
    const aTens = randomInt(rng, 2, 7);
    const bTens = randomInt(rng, 1, aTens - 1);
    const aOnes = randomInt(rng, 2, 9);
    const bOnes = randomInt(rng, 1, aOnes);
    return {
      a: aTens * 10 + aOnes,
      b: bTens * 10 + bOnes
    };
  }

  const aTens = randomInt(rng, 2, 8);
  const bTens = randomInt(rng, 1, aTens - 1);
  const aOnes = randomInt(rng, 0, 8);
  const bOnes = randomInt(rng, aOnes + 1, 9);
  return {
    a: aTens * 10 + aOnes,
    b: bTens * 10 + bOnes
  };
}

function numberPart(value) {
  return { type: "number", value: String(value) };
}

function operatorPart(value) {
  return { type: "operator", value };
}

function blankPart() {
  return { type: "blank", value: "?" };
}

function additionExplanation(a, b) {
  const bTens = Math.floor(b / 10) * 10;
  const bOnes = b % 10;
  const firstTotal = a + bTens;
  const carry = a % 10 + bOnes >= 10;
  const steps = [];

  if (bTens > 0) {
    steps.push({
      label: "先加整十",
      expression: `${a} + ${bTens} = ${firstTotal}`
    });
  }

  if (bOnes > 0) {
    steps.push({
      label: bTens > 0 ? "再加个位" : "加上剩下的数",
      expression: `${firstTotal} + ${bOnes} = ${a + b}`
    });
  }

  return {
    headline: bTens > 0 ? `把 ${b} 拆成 ${bTens} 和 ${bOnes}` : `一步一步加上 ${b}`,
    steps,
    tip: carry
      ? "个位满十，别忘了向十位进一。"
      : (bTens > 0 ? "先加整十，再加个位，会更好算。" : "把两部分合起来就好。"),
    visual: {
      type: carry ? "carry" : "steps",
      operator: "+",
      a: a % 10,
      b: bOnes,
      total: (a % 10) + bOnes
    }
  };
}

function subtractionExplanation(a, b) {
  const bTens = Math.floor(b / 10) * 10;
  const bOnes = b % 10;
  const firstTotal = a - bTens;
  const borrow = a % 10 < bOnes;
  const steps = [];

  if (bTens > 0) {
    steps.push({
      label: "先减整十",
      expression: `${a} - ${bTens} = ${firstTotal}`
    });
  }

  if (bOnes > 0) {
    steps.push({
      label: bTens > 0 ? "再减个位" : "减去剩下的数",
      expression: `${firstTotal} - ${bOnes} = ${a - b}`
    });
  }

  return {
    headline: bTens > 0 ? `把 ${b} 拆成 ${bTens} 和 ${bOnes}` : `一步一步减去 ${b}`,
    steps,
    tip: borrow
      ? "个位不够减，就借 1 个十，换成 10 个一。"
      : (bTens > 0 ? "先减整十，再减个位，会更好算。" : "直接从原来的数里减去它。"),
    visual: {
      type: borrow ? "borrow" : "steps",
      operator: "-",
      a: a % 10,
      b: bOnes
    }
  };
}

function directQuestion({ index, stage, difficulty, operation, rng }) {
  const values = operation === "add"
    ? makeAddition(rng, difficulty)
    : makeSubtraction(rng, difficulty);
  const answer = operation === "add" ? values.a + values.b : values.a - values.b;
  const symbol = operation === "add" ? "+" : "−";
  const hasCarry = operation === "add" && values.a % 10 + values.b % 10 >= 10;
  const hasBorrow = operation === "sub" && values.a % 10 < values.b % 10;
  const skillKey = operation;
  const skillLabel = difficulty === 1
    ? (operation === "add" ? "20 以内加法" : "20 以内减法")
    : (operation === "add"
        ? (hasCarry ? "进位加法" : "两位数加法")
        : (hasBorrow ? "退位减法" : "两位数减法"));

  return {
    id: `q-${index + 1}`,
    index,
    stage,
    kind: "direct",
    operation,
    difficulty,
    skillKey,
    skillLabel,
    title: "算一算",
    expression: [numberPart(values.a), operatorPart(symbol), numberPart(values.b), operatorPart("=")],
    expressionText: `${values.a} ${symbol} ${values.b} =`,
    answer,
    hint: values.b >= 10
      ? (operation === "add"
          ? `把 ${values.b} 拆成整十和个位，先加整十。`
          : `把 ${values.b} 拆成整十和个位，先减整十。`)
      : (operation === "add"
          ? `直接把 ${values.b} 加上去。`
          : `直接从原来的数里减去 ${values.b}。`),
    explanation: operation === "add"
      ? additionExplanation(values.a, values.b)
      : subtractionExplanation(values.a, values.b),
    usedValues: [values.a, values.b]
  };
}

function wordQuestion({ index, stage, difficulty, operation, rng }) {
  const values = operation === "add"
    ? makeAddition(rng, difficulty)
    : makeSubtraction(rng, difficulty);
  const answer = operation === "add" ? values.a + values.b : values.a - values.b;
  const storyVariants = operation === "add"
    ? [
        `花圃里原来有 ${values.a} 朵花，又开了 ${values.b} 朵。现在一共有多少朵花？`,
        `桌上原来有 ${values.a} 张贴纸，又拿来 ${values.b} 张。现在一共有多少张贴纸？`
      ]
    : [
        `花圃里原来有 ${values.a} 朵花，摘走了 ${values.b} 朵。还剩多少朵花？`,
        `盒子里原来有 ${values.a} 张彩纸，用掉了 ${values.b} 张。还剩多少张彩纸？`
      ];
  const story = storyVariants[randomInt(rng, 0, storyVariants.length - 1)];
  const symbol = operation === "add" ? "+" : "−";
  const explanation = operation === "add"
    ? additionExplanation(values.a, values.b)
    : subtractionExplanation(values.a, values.b);

  explanation.steps = [
    {
      label: "先列算式",
      expression: `${values.a} ${symbol} ${values.b} = ${answer}`
    },
    ...explanation.steps
  ];

  return {
    id: `q-${index + 1}`,
    index,
    stage,
    kind: "word",
    operation,
    difficulty,
    skillKey: operation,
    skillLabel: operation === "add" ? "加法情境" : "减法情境",
    title: "读一读，算一算",
    story,
    expression: [numberPart(values.a), operatorPart(symbol), numberPart(values.b), operatorPart("=")],
    expressionText: `${values.a} ${symbol} ${values.b} =`,
    answer,
    hint: operation === "add"
      ? "看到“一共”，就用两部分合起来。"
      : "看到“还剩”，就从原来的数量里减去用掉的数量。",
    explanation,
    usedValues: [values.a, values.b]
  };
}

function missingQuestion({ index, stage, difficulty, operation, rng }) {
  if (operation === "add") {
    const values = makeAddition(rng, Math.max(2, difficulty));
    const total = values.a + values.b;
    const hideOperand = rng() < 0.62;
    const expression = hideOperand
      ? [numberPart(values.a), operatorPart("+"), blankPart(), operatorPart("="), numberPart(total)]
      : [numberPart(values.a), operatorPart("+"), numberPart(values.b), operatorPart("="), blankPart()];

    return {
      id: `q-${index + 1}`,
      index,
      stage,
      kind: "missing",
      operation,
      difficulty,
      skillKey: "missing",
      skillLabel: "缺失数字",
      title: "补上缺失的数字",
      expression,
      expressionText: hideOperand
        ? `${values.a} + ? = ${total}`
        : `${values.a} + ${values.b} = ?`,
      answer: hideOperand ? values.b : total,
      hint: "把总数和已知的部分放在一起想。",
      explanation: hideOperand
        ? {
            headline: "从总数里拿走已知部分",
            steps: [
              { label: "先找总数", expression: `总数是 ${total}` },
              { label: "倒过来算", expression: `${total} − ${values.a} = ${values.b}` }
            ],
            tip: "加法和减法可以互相帮忙。",
            visual: { type: "inverse", left: `${total}`, right: `${values.a} + ${values.b}` }
          }
        : additionExplanation(values.a, values.b),
      usedValues: [values.a, values.b]
    };
  }

  const values = makeSubtraction(rng, Math.max(2, difficulty));
  const difference = values.a - values.b;
  const roleRoll = rng();
  let expression;
  let answer;
  let expressionText;
  let explanation;
  let hint;

  if (roleRoll < 0.38) {
    expression = [numberPart(values.a), operatorPart("−"), blankPart(), operatorPart("="), numberPart(difference)];
    answer = values.b;
    expressionText = `${values.a} − ? = ${difference}`;
    hint = "从原来的数量里减去剩下的数量。";
    explanation = {
      headline: "倒过来找减去的部分",
      steps: [
        { label: "原来的数量", expression: `${values.a}` },
        { label: "倒过来算", expression: `${values.a} − ${difference} = ${values.b}` }
      ],
      tip: "被减数减差，就能找到减去的数。",
      visual: { type: "inverse", left: `${values.a}`, right: `${values.b} + ${difference}` }
    };
  } else if (roleRoll < 0.72) {
    expression = [blankPart(), operatorPart("−"), numberPart(values.b), operatorPart("="), numberPart(difference)];
    answer = values.a;
    expressionText = `? − ${values.b} = ${difference}`;
    hint = "把差和减去的数量合起来。";
    explanation = {
      headline: "把两部分再合起来",
      steps: [
        { label: "先看剩下的", expression: `剩下 ${difference}` },
        { label: "加回减去的", expression: `${difference} + ${values.b} = ${values.a}` }
      ],
      tip: "差加回减数，就是原来的数量。",
      visual: { type: "inverse", left: `${difference} + ${values.b}`, right: `${values.a}` }
    };
  } else {
    expression = [numberPart(values.a), operatorPart("−"), numberPart(values.b), operatorPart("="), blankPart()];
    answer = difference;
    expressionText = `${values.a} − ${values.b} = ?`;
    hint = `先减整十 ${Math.floor(values.b / 10) * 10}，再减个位。`;
    explanation = subtractionExplanation(values.a, values.b);
  }

  return {
    id: `q-${index + 1}`,
    index,
    stage,
    kind: "missing",
    operation,
    difficulty,
    skillKey: "missing",
    skillLabel: "缺失数字",
    title: "补上缺失的数字",
    expression,
    expressionText,
    answer,
    hint,
    explanation,
    usedValues: [values.a, values.b]
  };
}

function multiStepQuestion({ index, stage, difficulty, rng }) {
  const useAddition = rng() < 0.5;

  if (useAddition) {
    const first = difficulty >= 3 ? randomInt(rng, 18, 58) : randomInt(rng, 10, 34);
    const second = difficulty >= 3 ? randomInt(rng, 7, 18) : randomInt(rng, 3, 9);
    const thirdMax = Math.min(difficulty >= 3 ? 9 : 6, 99 - first - second);
    const third = randomInt(rng, 2, Math.max(2, thirdMax));
    const firstTotal = first + second;
    const total = firstTotal + third;
    return {
      id: `q-${index + 1}`,
      index,
      stage,
      kind: "multi",
      operation: "add",
      difficulty,
      skillKey: "multi",
      skillLabel: "分步计算",
      title: "分成两步算",
      expression: [
        numberPart(first),
        operatorPart("+"),
        numberPart(second),
        operatorPart("+"),
        numberPart(third),
        operatorPart("=")
      ],
      expressionText: `${first} + ${second} + ${third} =`,
      answer: total,
      hint: "先算前两个数，再用结果加上最后一个数。",
      explanation: {
        headline: "一步一步来",
        steps: [
          { label: "先算前一步", expression: `${first} + ${second} = ${firstTotal}` },
          { label: "再加最后一个", expression: `${firstTotal} + ${third} = ${total}` }
        ],
        tip: "每一步只处理两个数，就没那么难了。",
        visual: { type: "steps", operator: "+", a: firstTotal, b: third, total }
      },
      usedValues: [first, second, third]
    };
  }

  const third = difficulty >= 3 ? randomInt(rng, 4, 9) : randomInt(rng, 1, 5);
  const second = difficulty >= 3 ? randomInt(rng, 10, 24) : randomInt(rng, 3, 9);
  const minimum = second + third + (difficulty >= 3 ? 20 : 8);
  const first = randomInt(rng, minimum, 99);
  const firstTotal = first - second;
  const total = firstTotal - third;
  return {
    id: `q-${index + 1}`,
    index,
    stage,
    kind: "multi",
    operation: "sub",
    difficulty,
    skillKey: "multi",
    skillLabel: "分步计算",
    title: "分成两步算",
    expression: [
      numberPart(first),
      operatorPart("−"),
      numberPart(second),
      operatorPart("−"),
      numberPart(third),
      operatorPart("=")
    ],
    expressionText: `${first} − ${second} − ${third} =`,
    answer: total,
    hint: "先算第一次剩下多少，再减去最后一个数。",
    explanation: {
      headline: "一步一步来",
      steps: [
        { label: "先算前一步", expression: `${first} − ${second} = ${firstTotal}` },
        { label: "再减最后一个", expression: `${firstTotal} − ${third} = ${total}` }
      ],
      tip: "每一步只处理两个数，就没那么难了。",
      visual: { type: "steps", operator: "-", a: firstTotal, b: third, total }
    },
    usedValues: [first, second, third]
  };
}

export function labelForSkill(skillKey) {
  return SKILL_LABELS[skillKey] ?? "加减法";
}

export function createQuestionForIndex(index, sessionSeed, difficultyProfile, usedQuestions = []) {
  const stage = stageForIndex(index);
  const usedKeys = new Set(usedQuestions.map((question) => question.questionKey).filter(Boolean));

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const rng = createRng(hashString(`${sessionSeed}:${index}:${stage}:${JSON.stringify(difficultyProfile)}:${attempt}`));
    let question;

    if (stage === "warmup" || stage === "core") {
      const operation = rng() < 0.5 ? "add" : "sub";
      const targetDifficulty = effectiveDifficulty(index, difficultyProfile, operation);
      question = directQuestion({ index, stage, difficulty: targetDifficulty, operation, rng });
    } else if (stage === "story") {
      const operation = rng() < 0.5 ? "add" : "sub";
      const targetDifficulty = effectiveDifficulty(index, difficultyProfile, operation);
      question = wordQuestion({ index, stage, difficulty: targetDifficulty, operation, rng });
    } else if (stage === "missing") {
      const operation = rng() < 0.5 ? "add" : "sub";
      const targetDifficulty = effectiveDifficulty(index, difficultyProfile, "missing");
      question = missingQuestion({ index, stage, difficulty: targetDifficulty, operation, rng });
    } else {
      const targetDifficulty = effectiveDifficulty(index, difficultyProfile, "multi");
      question = multiStepQuestion({ index, stage, difficulty: targetDifficulty, rng });
    }

    question.questionKey = `${question.kind}:${question.expressionText}:${question.story ?? ""}`;
    if (!usedKeys.has(question.questionKey)) {
      return question;
    }
  }

  const fallbackRng = createRng(hashString(`${sessionSeed}:${index}:fallback`));
  const fallbackOperation = fallbackRng() < 0.5 ? "add" : "sub";
  const fallback = directQuestion({
    index,
    stage,
    difficulty: effectiveDifficulty(index, difficultyProfile, fallbackOperation),
    operation: fallbackOperation,
    rng: fallbackRng
  });
  fallback.questionKey = `${fallback.kind}:${fallback.expressionText}:${fallback.story ?? ""}`;
  return fallback;
}
