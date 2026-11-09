// Same-origin institutional runtime. No credential or session is transported here.
window.RaizesMissionRuntimeReady=import('/mission-runtime/institutional.mjs');
window.RaizesMissionRuntimeReady.catch(()=>{});
window.RaizesEditionLibraryReady=import('/library-edition-boot.mjs');
window.RaizesEditionLibraryReady.catch(()=>{});
