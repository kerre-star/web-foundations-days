// Starting data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes(word) — filter + toLowerCase + includes
function searchNotes(word) {
  const w = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(w));
}

// 2. longestNote() — handle empty array first, then compare lengths
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

// 3. countByCategory() — loop over notes, increase a counter in an object
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

// 4. getSummary() — countByCategory + template literal, "note" vs "notes"
function getSummary() {
  const total = notes.length;
  if (total === 0) return "0 notes.";
  const word = total === 1 ? "note" : "notes";
  const counts = countByCategory();
  const parts = ["personal", "work", "study"]
    .filter(category => counts[category])
    .map(category => `${counts[category]} ${category}`);
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// 5. isDuplicate(text) — some + trimmed lower-case comparison
function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === cleaned);
}

// 6. addNote(text, category) — checks length, duplicate and category
function addNote(text, category) {
  const cleaned = text.trim();
  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("❌ Note must be 1–200 characters.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("❌ Duplicate note — not added.");
    return false;
  }
  if (!["personal", "work", "study"].includes(category)) {
    console.log("❌ Category must be personal, work or study.");
    return false;
  }
  notes.push({ id: Date.now(), text: cleaned, category: category });
  console.log("✅ Note added.");
  return true;
}

// ---- Tests: normal case + edge case, expected output in comments ----

// searchNotes
console.log(searchNotes("MILK"));   // [ { id: 1, text: "Buy milk and bread", category: "personal" } ]
console.log(searchNotes("zzz"));    // []  (edge: no results)

// longestNote
console.log(longestNote());         // { id: 3, text: "Email the project report to Grace", category: "work" }
{
  const saved = notes;              // edge: no notes
  notes = [];
  console.log(longestNote());       // null
  notes = saved;
}

// countByCategory
console.log(countByCategory());     // { personal: 2, study: 2, work: 1 }
{
  const saved = notes;              // edge: no notes
  notes = [];
  console.log(countByCategory());   // {}
  notes = saved;
}

// getSummary
console.log(getSummary());          // "5 notes: 2 personal, 1 work, 2 study."
{
  const saved = notes;              // edge: exactly one note
  notes = [{ id: 99, text: "Solo", category: "work" }];
  console.log(getSummary());        // "1 note: 1 work."
  notes = saved;
}

// isDuplicate
console.log(isDuplicate("Call mum"));       // true
console.log(isDuplicate("  CALL MUM  "));   // true   (edge: extra spaces + different case)
console.log(isDuplicate("Something new"));  // false

// addNote
console.log(addNote("Book dentist appointment", "personal")); // ✅ Note added.  then true
console.log(addNote("   ", "work"));                          // ❌ Note must be 1–200 characters.  then false  (edge: blank)
console.log(addNote("x".repeat(201), "work"));                // ❌ Note must be 1–200 characters.  then false  (edge: too long)
console.log(addNote("  call MUM ", "personal"));              // ❌ Duplicate note — not added.  then false  (edge: duplicate)
console.log(addNote("Water the plants", "gardening"));        // ❌ Category must be personal, work or study.  then false  (edge: bad category)