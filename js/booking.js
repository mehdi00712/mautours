// js/booking.js
(function(){
  const list = document.getElementById('excList');
  const modal = document.getElementById('bookingModal');
  const closeBtn = document.getElementById('closeModal');
  const form = document.getElementById('bookingForm');
  const statusEl = document.getElementById('bkStatus');
  const titleEl = document.getElementById('bkTitle');

  function renderList(){
    if(!list || !window.EXCURSIONS) return;
    list.innerHTML = window.EXCURSIONS.map((t,i)=>`
      <section class="exc-item ${i%2===1 ? "reversed":""}">
        <div class="exc-img"><img src="${t.img}" alt="${t.title}"></div>
        <div class="exc-panel">
          <h2 class="exc-title">${t.title}</h2>
          <p class="exc-desc">${t.summary}</p>
          <button class="btn primary" data-book="${t.id}">Book now</button>
        </div>
      </section>
    `).join('');
    list.querySelectorAll('[data-book]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const exc = window.EXCURSIONS.find(x=>x.id===btn.dataset.book);
        if(!exc) return;
        document.getElementById('bkExcursionId').value = exc.id;
        titleEl.textContent = `Book: ${exc.title}`;
        openModal();
      });
    });
  }

  function openModal(){ if(modal){ modal.setAttribute('aria-hidden','false'); modal.classList.add('open'); } }
  function closeModal(){ if(modal){ modal.setAttribute('aria-hidden','true'); modal.classList.remove('open'); statusEl.textContent=''; } }
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    statusEl.textContent = 'Preparing secure checkout...';
    const data = {
      excursionId: document.getElementById('bkExcursionId').value,
      date: document.getElementById('bkDate').value,
      timeSlot: document.getElementById('bkTime').value,
      adults: Number(document.getElementById('bkAdults').value || 0),
      children: Number(document.getElementById('bkChildren').value || 0),
      email: document.getElementById('bkEmail').value
    };
    try{
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      if(!res.ok){ throw new Error('Failed to start checkout'); }
      const { url } = await res.json();
      window.location.href = url;
    }catch(err){
      console.error(err);
      statusEl.textContent = 'Could not start checkout. Please try again.';
    }
  });

  renderList();
})();
