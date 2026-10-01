// Starting data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes — filter + toLowerCase + includes
function searchNotes(query) {
  const q = query.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(q));
}

// 2. longestNote — empty array first, then compare lengths
function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// 3. countByCategory — loop and increment a counter in an object
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

// 4. getSummary — countByCategory + template literal, singular/plural
function getSummary() {
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";
  const counts = countByCategory();
  const breakdown = Object.entries(counts)
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");
  return `You have ${total} ${word} (${breakdown}).`;
}

// 5. isDuplicate — some + trimmed lower-case compare
function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === cleaned);
}

// 6. addNote — isDuplicate + length + category checks
function addNote(text, category) {
  const cleaned = text.trim();
  if (isDuplicate(cleaned)) {
    console.log("❌ Duplicate note — not added.");
    return false;
  }
  if (cleaned.length === 0 || cleaned.length > 200) {
    console.log("❌ Note must be 1–200 characters.");
    return false;
  }
  if (!category || category.trim() === "") {
    console.log("❌ A category is required.");
    return false;
  }
  notes.push({ id: Date.now(), text: cleaned, category: category.trim() });
  console.log("✅ Note added.");
  return true;
}

// ---- Tests: normal case + edge case, expected output in comments ----

// searchNotes
console.log(searchNotes("milk"));   // [ { id: 1, text: "Buy milk and bread", category: "personal" } ]
console.log(searchNotes("zzz"));    // []  (edge: no results)

// longestNote
console.log(longestNote());         // { id: 3, text: "Email the project report to Grace", category: "work" }
// edge case: empty array
{
  const saved = notes;
  notes = [];
  console.log(longestNote());       // null
  notes = saved;
}

// countByCategory
console.log(countByCategory());     // { personal: 2, study: 2, work: 1 }
// edge case: empty array
{
  const saved = notes;
  notes = [];
  console.log(countByCategory());   // {}
  notes = saved;
}

// getSummary
console.log(getSummary());          // "You have 5 notes (personal: 2, study: 2, work: 1)."
// edge case: exactly one note
{
  const saved = notes;
  notes = [{ id: 99, text: "Solo", category: "misc" }];
  console.log(getSummary());        // "You have 1 note (misc: 1)."
  notes = saved;
}

// isDuplicate
console.log(isDuplicate("Call mum"));          // true
console.log(isDuplicate("  CALL MUM  "));      // true  (edge: trim + case)
console.log(isDuplicate("Something new"));     // false

// addNote
console.log(addNote("Book dentist appointment", "personal")); // ✅ then true
console.log(addNote("   "));                    // ❌ then false  (edge: blank)
console.log(addNote("Call mum", "personal"));   // ❌ then false  (edge: duplicate)