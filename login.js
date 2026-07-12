const demoAccess = {
  email: "demo@raizesesaberes.com.br",
  password: "Raizes2026",
  key: "raizes:demo-authenticated",
};

const getNextPage = () => {
  const requestedPage = new URLSearchParams(window.location.search).get("next");
  if (!requestedPage) {
    return "biblioteca.html";
  }

  try {
    const decodedPage = decodeURIComponent(requestedPage);
    return decodedPage.startsWith("http") ? "biblioteca.html" : decodedPage;
  } catch (error) {
    return "biblioteca.html";
  }
};

if (localStorage.getItem(demoAccess.key) === "true") {
  window.location.replace(getNextPage());
}

const form = document.querySelector("[data-login-form]");
const errorMessage = document.querySelector("[data-login-error]");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const isValid = email === demoAccess.email && password === demoAccess.password;

  if (!isValid) {
    if (errorMessage) {
      errorMessage.hidden = false;
    }
    return;
  }

  localStorage.setItem(demoAccess.key, "true");
  window.location.replace(getNextPage());
});
