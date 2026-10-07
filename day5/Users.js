// ---------- 1. Select the elements we need ----------
const loadBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";

// ---------- 2. Store the loaded users ----------
let users = [];

// ---------- 3. Fetch the users ----------
async function loadUsers() {
  loadBtn.disabled = true;
  statusMessage.textContent = "Loading users...";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    users = await response.json();
    applyFilter(); // draw the users (respecting any text already typed)
    statusMessage.textContent = `Success: loaded ${users.length} users.`;
  } catch (error) {
    statusMessage.textContent = `Error: could not load users. (${error.message})`;
  } finally {
    loadBtn.disabled = false; // runs after success or failure
  }
}

// ---------- 4. Draw any array of users ----------
function renderUsers(list) {
  usersList.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.classList.add("message");
    empty.textContent = "No users match your filter.";
    usersList.appendChild(empty);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");
    li.classList.add("user");

    const name = document.createElement("p");
    name.classList.add("user-name");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.appendChild(name);
    li.appendChild(email);
    li.appendChild(city);
    li.appendChild(company);
    usersList.appendChild(li);
  });
}

// ---------- 5. Filter the stored array (no new request) ----------
function applyFilter() {
  const term = filterInput.value.trim().toLowerCase();
  const matches = users.filter((user) =>
    user.name.toLowerCase().includes(term)
  );
  renderUsers(matches);
}

// ---------- 6. Listen for events ----------
loadBtn.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  if (users.length > 0) {
    applyFilter(); // nothing to filter until users are loaded
  }
});
