// src/modules/tests/services/generator.ts
import { db } from "../../../../db/client";
import {
  questions,
  tests,
  subjects,
  chapters,
  standards,
} from "../../../../db/schema";
import { eq, and, inArray, sql, notInArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { log } from "../../../common/logger";

type TestType = "PCM" | "PCB";

// Helper to match partial names
const matchCh = (dbName: string, targets: string[]) =>
  targets.some((t) => dbName.toLowerCase().includes(t.toLowerCase()));

const CHAPTER_CONFIG: any = {
  // PHYSICS
  PHYS: {
    STD_12: [
      { threads: ["Kinetic Theory", "Radiation"], count: 6 },
      { threads: ["Oscillations", "Superposition"], count: 5 },
      { threads: ["Structure of Atoms", "Nuclei"], count: 4 },
      { threads: ["Rotational"], count: 4 },
      { threads: ["Electrostatics", "Current Electricity"], count: 5 },
      { threads: ["Magnetic", "Electromagnetic", "AC Circuits"], count: 4 },
      { threads: ["Semiconductors", "Wave Optics"], count: 3 },
    ],
    STD_11: [
      { threads: ["Motion in a Plane", "Laws of Motion"], count: 2 }, // 1 each
      { threads: ["Thermal", "Sound", "Optics"], count: 3 }, // 1 each
    ],
  },
  // CHEMISTRY
  CHEM: {
    STD_12: [
      { threads: ["Thermodynamics"], count: 7 },
      { threads: ["Groups 16", "Transition", "Coordination"], count: 9 }, // p-block, d-block, coord
      { threads: ["Alcohols", "Phenols", "Ethers"], count: 4 },
      { threads: ["Halogen", "Aldehydes", "Ketones"], count: 4 },
      { threads: ["Solid State", "Solutions", "Electrochemistry"], count: 3 },
    ],
    STD_11: [
      { threads: ["Basic Concepts", "Structure of Atom"], count: 2 },
      { threads: ["Redox", "Adsorption", "Hydrocarbons"], count: 3 },
    ],
  },
  // MATHS (Handled as M1 and M2 separately, we distribute the total 50 logic approximately)
  MATHS_1: {
    STD_12: [
      { threads: ["Trigonometric Functions"], count: 4 },
      {
        threads: ["Mathematical Logic", "Matrices", "Pair of Straight Lines"],
        count: 6,
      }, // 2 each
      { threads: ["Vectors", "Line and Plane"], count: 6 }, // 3D Geometry
    ],
    STD_11: [
      { threads: ["Trigonometry II", "Straight Line", "Circle"], count: 3 },
    ],
  },
  MATHS_2: {
    STD_12: [
      { threads: ["Indefinite Integration", "Definite Integration"], count: 6 },
      { threads: ["Differentiation", "Applications of Derivatives"], count: 5 },
      { threads: ["Probability Distribution", "Binomial"], count: 4 },
      { threads: ["Differential Equations"], count: 3 },
    ],
    STD_11: [
      {
        threads: [
          "Complex Numbers",
          "Permutations",
          "Functions",
          "Limits",
          "Continuity",
        ],
        count: 3,
      }, // Combined pool for 11th
    ],
  },
  // BIOLOGY
  BIO: {
    STD_12: [
      { threads: ["Respiration", "Circulation", "Control"], count: 22 }, // Human Phys
      { threads: ["Inheritance", "Molecular", "Biotechnology"], count: 20 }, // Genetics
      { threads: ["Plant Water", "Plant Growth"], count: 12 }, // Plant Phys
      { threads: ["Reproduction"], count: 12 },
      { threads: ["Organisms", "Ecosystem", "Biodiversity"], count: 8 }, // Ecology
    ],
    STD_11: [
      {
        threads: ["Biomolecules", "Nutrition", "Respiration", "Excretion"],
        count: 20,
      },
    ],
  },
};

const CONFIG = {
  STD_12_WEIGHT: 0.8,
  STD_11_WEIGHT: 0.2,
  PCM: {
    SECTIONS: [
      { subjects: ["PHYS", "CHEM"], count: 100, time: 90 }, // 50 Phys + 50 Chem
      { subjects: ["MATHS_1", "MATHS_2"], count: 50, time: 90 },
    ],
  },
  PCB: {
    SECTIONS: [
      { subjects: ["PHYS", "CHEM"], count: 100, time: 90 },
      { subjects: ["BIO"], count: 100, time: 90 },
    ],
  },
};

async function getStructuredQuestions(subjectCode: string, totalCount: number) {
  const questionsList: string[] = [];

  // 1. Get Subject ID and Standard IDs
  const std11 = await db
    .select()
    .from(standards)
    .where(eq(standards.standard, "STD_11"))
    .limit(1)
    .then((r) => r[0]);
  const std12 = await db
    .select()
    .from(standards)
    .where(eq(standards.standard, "STD_12"))
    .limit(1)
    .then((r) => r[0]);

  // Helper to process a standard
  const processStandard = async (stdId: string, ruleSet: any[]) => {
    const sub = await db.query.subjects.findFirst({
      where: and(
        eq(subjects.code, subjectCode as any),
        eq(subjects.standardId, stdId),
      ),
    });

    if (!sub)
      return {
        chosen: [] as string[],
        subjectId: "",
        usedChaps: [] as string[],
      };

    // Get All Chapters
    const allChapters = await db.query.chapters.findMany({
      where: eq(chapters.subjectId, sub.id),
    });

    let chosenQIds: string[] = [];
    const usedChapterIds = new Set<string>();

    // 1. Fulfill Specific Rules
    if (ruleSet) {
      for (const rule of ruleSet) {
        // Find matching chapters
        const matchedChaps = allChapters.filter((c) =>
          matchCh(c.name, rule.threads),
        );
        const chIds = matchedChaps.map((c) => c.id);
        chIds.forEach((id) => usedChapterIds.add(id));

        if (chIds.length > 0) {
          const qs = await db
            .select({ id: questions.id })
            .from(questions)
            .where(inArray(questions.chapterId, chIds))
            .orderBy(sql`RANDOM()`)
            .limit(rule.count);
          chosenQIds.push(...qs.map((q) => q.id));
        }
      }
    }

    return {
      chosen: chosenQIds,
      subjectId: sub.id,
      usedChaps: Array.from(usedChapterIds),
    };
  };

  // Rules
  const rules = CHAPTER_CONFIG[subjectCode];

  // Process Class 12
  const res12 = await processStandard(std12!.id, rules?.STD_12 || []);
  let q12 = res12.chosen;

  // Fill remainder of Class 12 (to reach 80% or approximate)
  const target12 = Math.round(totalCount * 0.8);
  if (q12.length < target12) {
    const needed = target12 - q12.length;
    // Fetch from ANY chapter in 12th (excluding ones we already mined heavily? No, just random from subject is fine to fill gaps)
    if (res12.subjectId) {
      const extra = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.subjectId, res12.subjectId),
            notInArray(questions.id, q12.length ? q12 : ["dummy"]),
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(needed);
      q12.push(...extra.map((e) => e.id));
    }
  }

  // Process Class 11
  const res11 = await processStandard(std11!.id, rules?.STD_11 || []);
  let q11 = res11.chosen;

  // For Class 11, we ONLY want questions from the specific list usually.
  // But if we are short, should we fill? The prompt says "Class 11 questions are drawn from a specific list".
  // So if that list is exhausted or small, we stick to it. BUT we need to reach the count (20%).
  const target11 = totalCount - q12.length; // Remaining slots
  if (q11.length < target11) {
    const needed = target11 - q11.length;
    // Try to fetch more from the "Used Chapters" first (User specified chapters)
    if (res11.usedChaps.length > 0) {
      const extra = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            inArray(questions.chapterId, res11.usedChaps),
            notInArray(questions.id, q11.length ? q11 : ["dummy"]),
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(needed);
      q11.push(...extra.map((e) => e.id));
    }
    // If still short? Failover to any 11th chapter?
    // For safety, let's fill from subject to avoid crashing/empty tests.
    if (q11.length + q12.length < totalCount && res11.subjectId) {
      const finalNeed = totalCount - (q11.length + q12.length);
      const panicFill = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.subjectId, res11.subjectId),
            notInArray(
              questions.id,
              [...q11, ...q12].length ? [...q11, ...q12] : ["dummy"],
            ),
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(finalNeed);
      q11.push(...panicFill.map((e) => e.id));
    }
  }

  return [...q12, ...q11];
}

export const generateTest = async (type: TestType) => {
  const config = CONFIG[type];
  const sectionData = [];

  // NOTE: Logic assumes Database Migration is done and 'standards' table exists and populated.

  for (const section of config.SECTIONS) {
    let sectionQIds: string[] = [];

    // Split count evenly among subjects in section
    const countPerSubject = Math.floor(section.count / section.subjects.length);

    for (const subjCode of section.subjects) {
      const qs = await getStructuredQuestions(subjCode, countPerSubject);
      sectionQIds = [...sectionQIds, ...qs];
    }

    // Check if we hit total count (due to even split rounding)
    // If odd count, one subject might be short 1.
    // We can rely on randomness for now.

    // Shuffle Section
    sectionQIds = sectionQIds.sort(() => Math.random() - 0.5);

    sectionData.push({
      questions: sectionQIds,
      timeLimit: section.time,
    });
  }

  const testId = uuidv7();
  log.db("Persisting Test to DB", { testId, type });
  await db.insert(tests).values({
    id: testId,
    type,
    questionSet: sectionData,
  });

  return testId;
};
