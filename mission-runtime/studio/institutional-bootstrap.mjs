const params=new URLSearchParams(location.search);
let allowed=false;
try {allowed=window.parent!==window&&window.parent.location.origin===location.origin&&params.get('institutional')==='1'&&(params.get('snapshot')==='1'||params.has('editar'));} catch {}
if(allowed) await import('./assets/index-Di3aszpa.js');
else {document.querySelector('#root').textContent='Abra esta atividade pelo ambiente institucional autorizado.';document.documentElement.dataset.institutionalBlocked='true';}
