
document.addEventListener("DOMContentLoaded", () => {
  // Admin Mode: Auth state
  let teacherToken = localStorage.getItem("teacherToken") || null;
  let teacherUsername = localStorage.getItem("teacherUsername") || null;

  // UI elements
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const userLabel = document.getElementById("user-label");
  const loginModal = document.getElementById("login-modal");
  const closeLogin = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutBtn = document.getElementById("logout-btn");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Only show delete buttons if teacher is logged in
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map(
                      (email) =>
                        `<li><span class="participant-email">${email}</span>${teacherToken ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if teacher)
      if (teacherToken) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!teacherToken) {
      messageDiv.textContent = "Only teachers can unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${teacherToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherToken) {
      messageDiv.textContent = "Only teachers can register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${teacherToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Admin Mode: Login modal logic
  function updateUserUI() {
    if (teacherToken && teacherUsername) {
      userLabel.textContent = `Teacher: ${teacherUsername}`;
      userLabel.classList.remove("hidden");
      userIcon.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      userLabel.textContent = "";
      userLabel.classList.add("hidden");
      userIcon.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  userIcon.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  });

  closeLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (response.ok && result.token) {
        teacherToken = result.token;
        teacherUsername = result.username;
        localStorage.setItem("teacherToken", teacherToken);
        localStorage.setItem("teacherUsername", teacherUsername);
        loginModal.classList.add("hidden");
        updateUserUI();
        fetchActivities();
      } else {
        loginMessage.textContent = result.detail || "Login failed.";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login error. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
    }
  });

  // Logout on logout button click
  logoutBtn.addEventListener("click", () => {
    teacherToken = null;
    teacherUsername = null;
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUsername");
    updateUserUI();
    fetchActivities();
  });

  // Initialize app
  updateUserUI();
  fetchActivities();
});
