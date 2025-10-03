
// Mobile nav
document.getElementById('hamburger')?.addEventListener('click', ()=>{
  const nav = document.getElementById('nav');
  if(!nav) return;
  const open = nav.style.display==='block';
  nav.style.display = open ? 'none' : 'block';
});

// Enquiry form (EmailJS placeholder)
function bindSimpleForm(formId, statusId){
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    status.textContent = 'Sending...';
    try{
      // Replace with EmailJS / your backend endpoint
      await new Promise(r=>setTimeout(r,700));
      status.textContent = 'Thanks! We'll get back to you shortly.';
      form.reset();
    }catch(err){
      status.textContent = 'Something went wrong. Please WhatsApp us.';
    }
  });
}
bindSimpleForm('enquiryForm','enquiryStatus');
bindSimpleForm('contactForm','contactStatus');
bindSimpleForm('transferForm','transferStatus');

// Excursions page rendering
(function(){
  const listEl = document.getElementById('tourList');
  if(!listEl || !window.TOURS) return;
  const q = document.getElementById('q');
  const sel = document.getElementById('filterType');
  function render(){
    const query = (q?.value||'').toLowerCase();
    const type = sel?.value||'all';
    const data = window.TOURS.filter(t=>{
      const matchesQuery = !query || t.title.toLowerCase().includes(query) || t.summary.toLowerCase().includes(query);
      const matchesType = type==='all' || t.type.includes(type);
      return matchesQuery && matchesType;
    });
    listEl.innerHTML = data.map(t=>`<article class="card">
      <img src="assets/placeholder.png" alt="${t.title}">
      <div class="card-body">
        <h3>${t.title}</h3>
        <p>${t.summary}</p>
        <div class="row between center">
          <span class="price">Rs ${t.price.toLocaleString()}</span>
          <a class="btn small" href="#book-${t.id}">Book</a>
        </div>
      </div>
    </article>`).join('');
  }
  q?.addEventListener('input', render);
  sel?.addEventListener('change', render);
  render();
})();

// Simple i18n (EN/FR)
const langToggle = document.getElementById('langToggle');
let currentLang = 'en';
async function loadLang(l){
  const res = await fetch(`js/lang/${l}.json`);
  const dict = await res.json();
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(dict[key]) el.textContent = dict[key];
  });
}
langToggle?.addEventListener('click', async ()=>{
  currentLang = currentLang==='en' ? 'fr' : 'en';
  langToggle.textContent = currentLang==='en' ? 'FR' : 'EN';
  await loadLang(currentLang);
});
loadLang('en');
