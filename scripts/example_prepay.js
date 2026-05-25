const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

async function run() {
  const inputPath = path.join(__dirname, "..", "examples", "prepay_input.json");
  const raw = fs.readFileSync(inputPath, "utf8");
  const input = JSON.parse(raw);

  const formatDate = (value) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const moduleUrl = pathToFileURL(
    path.join(__dirname, "..", "src", "lib", "simulator.js")
  ).href;
  const { simulateLoan } = await import(moduleUrl);

  const baseline = simulateLoan({ ...input, recomputeAfterPrepay: false });
  const reconduced = simulateLoan({
    ...input,
    recomputeAfterPrepay: true,
    prepayAction: input.prepayAction || "reduce_term",
  });

  const pick = (result) => {
    const schedule = result.schedule || [];
    const sample = schedule.slice(0, 4).map((row) => ({
      index: row.index,
      dueDate: formatDate(row.dueDate),
      paymentAmount: row.paymentAmount,
      paidExtra: row.paidExtra,
      balanceUvc: row.balanceUvc,
      balanceBs: row.balanceBs,
    }));

    if (schedule.length > 4) {
      const last = schedule[schedule.length - 1];
      sample.push({
        index: last.index,
        dueDate: formatDate(last.dueDate),
        balanceUvc: last.balanceUvc,
        balanceBs: last.balanceBs,
      });
    }

    return { termMonths: schedule.length, sample };
  };

  const output = {
    input,
    baseline: pick(baseline),
    reconduced: pick(reconduced),
  };

  console.log(JSON.stringify(output, null, 2));
}

run().catch((error) => {
  console.error("Error running example:", error);
  process.exit(1);
});
