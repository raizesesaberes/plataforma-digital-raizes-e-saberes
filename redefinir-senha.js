const resetSessionStorageKey = "raizes:supabase-auth-session";

const getResetSupabaseConfig = () => window.RAIZES_SUPABASE || {};

const getResetParams = () => {
  const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search || "");
  return {
    accessToken: hashParams.get("access_token") || queryParams.get("access_token") || "",
    refreshToken: hashParams.get("refresh_token") || queryParams.get("refresh_token") || "",
    type: hashParams.get("type") || queryParams.get("type") || "",
  };
};

const resetTokens = getResetParams();
const resetForm = document.querySelector("[data-reset-password-form]");
const resetError = document.querySelector("[data-reset-password-error]");
const resetSuccess = document.querySelector("[data-reset-password-success]");
const resetInvalid = document.querySelector("[data-reset-invalid]");

const showResetError = (message) => {
  if (!resetError) return;
  resetError.hidden = false;
  resetError.textContent = message;
};

const showResetSuccess = (message) => {
  if (!resetSuccess) return;
  resetSuccess.hidden = false;
  resetSuccess.textContent = message;
};

const setResetBusy = (isBusy) => {
  const button = resetForm?.querySelector("button[type='submit']");
  if (button) {
    button.disabled = isBusy;
    button.textContent = isBusy ? "Salvando..." : "Salvar nova senha";
  }
};

const setResetComplete = () => {
  resetForm?.querySelectorAll("input, button").forEach((item) => {
    item.disabled = true;
  });
  const button = resetForm?.querySelector("button[type='submit']");
  if (button) {
    button.textContent = "Senha atualizada";
  }
};

const hasValidRecoveryToken = () => Boolean(resetTokens.accessToken && (!resetTokens.type || ["recovery", "invite"].includes(resetTokens.type)));

if (!hasValidRecoveryToken()) {
  if (resetInvalid) resetInvalid.hidden = false;
  resetForm?.querySelectorAll("input, button").forEach((item) => {
    item.disabled = true;
  });
}

document.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const fieldName = button.dataset.togglePassword;
    const input = resetForm?.querySelector(`[name="${fieldName}"]`);
    if (!input) return;
    const nextType = input.type === "password" ? "text" : "password";
    input.type = nextType;
    button.textContent = nextType === "password" ? "Mostrar" : "Ocultar";
  });
});

resetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!hasValidRecoveryToken()) return;
  const config = getResetSupabaseConfig();
  const baseUrl = config.url?.replace(/\/$/, "");
  const formData = new FormData(resetForm);
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("password_confirm") || "");

  if (resetError) resetError.hidden = true;
  if (resetSuccess) resetSuccess.hidden = true;

  if (password.length < 8) {
    showResetError("Use uma senha com pelo menos 8 caracteres.");
    return;
  }
  if (password !== passwordConfirm) {
    showResetError("As senhas não conferem.");
    return;
  }
  if (!baseUrl || !config.anonKey) {
    showResetError("Não foi possível conectar ao serviço de acesso.");
    return;
  }

  setResetBusy(true);
  try {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${resetTokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      throw new Error("Não foi possível redefinir a senha com este link.");
    }
    localStorage.removeItem(resetSessionStorageKey);
    localStorage.removeItem("raizes:supabase-access-token");
    window.history.replaceState(null, "", "redefinir-senha.html");
    showResetSuccess("Senha atualizada. Volte ao login e acesse com a nova senha.");
    setResetComplete();
  } catch (error) {
    showResetError(error.message || "Não foi possível redefinir a senha.");
    setResetBusy(false);
  }
});
