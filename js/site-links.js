// js/site-links.js
// Points every WhatsApp link on the page at the number saved in
// Admin → Settings, keeping each link's pre-filled message.

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateWhatsappLinks() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "settings"));
    if (!snap.exists()) return;

    const number = String(snap.data().whatsappNumber || "").replace(/\D/g, "");
    if (!number) return;

    document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => {
      const url = new URL(a.href);
      a.href = `https://wa.me/${number}${url.search}`;
    });
  } catch (error) {
    console.error("WhatsApp link settings error:", error);
  }
}

updateWhatsappLinks();
