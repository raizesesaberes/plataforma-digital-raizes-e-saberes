const demoAccess = {
  email: "demo@raizesesaberes.com.br",
  password: "Raizes2026",
  curatorEmail: "curadoria@raizesesaberes.com.br",
  curatorPassword: "Curadoria2026",
  key: "raizes:demo-authenticated",
  curatorKey: "raizes:demo-curator",
};

const getNextPage = () => {
  const requestedPage = new URLSearchParams(window.location.search).get("next");
  if (!requestedPage) {
    return "plataforma.html";
  }

  try {
    const decodedPage = decodeURIComponent(requestedPage);
    return decodedPage.startsWith("http") ? "plataforma.html" : decodedPage;
  } catch (error) {
    return "plataforma.html";
  }
};

const nextPage = getNextPage();
const needsCuratorAccess = nextPage.startsWith("curadoria.html");

if (
  localStorage.getItem(demoAccess.key) === "true" &&
  (!needsCuratorAccess || localStorage.getItem(demoAccess.curatorKey) === "true")
) {
  window.location.replace(getNextPage());
}

const form = document.querySelector("[data-login-form]");
const errorMessage = document.querySelector("[data-login-error]");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const isDemo = email === demoAccess.email && password === demoAccess.password;
  const isCurator = email === demoAccess.curatorEmail && password === demoAccess.curatorPassword;
  const isValid = isDemo || isCurator;

  if (!isValid || (needsCuratorAccess && !isCurator)) {
    if (errorMessage) {
      errorMessage.hidden = false;
      errorMessage.textContent = needsCuratorAccess
        ? "Use as credenciais demonstrativas de curadoria para acessar esta area."
        : "Credenciais invalidas para este ambiente.";
    }
    return;
  }

  localStorage.setItem(demoAccess.key, "true");
  if (isCurator) {
    localStorage.setItem(demoAccess.curatorKey, "true");
  }
  window.location.replace(getNextPage());
});
