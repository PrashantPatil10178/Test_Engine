const standardsData = [
  { id: cuid(), standard: "STD_11", order: 1 },
  { id: cuid(), standard: "STD_12", order: 2 },
];

await db.insert(standards).values(standardsData);
