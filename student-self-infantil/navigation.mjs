// Wire to the existing auth SDK/session-change notification as well as storage;
// storage events alone do not fire in the tab which performs logout.
export function bindInfantilNavigation({window, navigation, subscribeSession}) {
  const enter = () => navigation.enter(window.location.href);
  const hide = () => navigation.clear();
  const visibility = () => window.document.hidden ? hide() : enter();
  window.addEventListener('pageshow', enter);
  window.addEventListener('pagehide', hide);
  window.addEventListener('popstate', enter);
  window.document.addEventListener('visibilitychange', visibility);
  const unsubscribe = subscribeSession(() => { hide(); void enter(); });
  void enter();
  return () => {
    hide(); unsubscribe();
    window.removeEventListener('pageshow', enter);
    window.removeEventListener('pagehide', hide);
    window.removeEventListener('popstate', enter);
    window.document.removeEventListener('visibilitychange', visibility);
  };
}
