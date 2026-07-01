(function(){
  function normalizeCabinetText(text){
    return (text || "").toLowerCase()
      .replace(/ə/g,"e").replace(/ı/g,"i").replace(/ö/g,"o")
      .replace(/ü/g,"u").replace(/ş/g,"s").replace(/ç/g,"c")
      .replace(/ğ/g,"g");
  }
  function applyProfessionalCabinetIcons(){
    document.querySelectorAll(".cabinet-menu button").forEach(function(btn){
      var t = normalizeCabinetText(btn.textContent);
      var icon = "settings";
      if(t.includes("profil") || t.includes("hesab")) icon = "profile";
      else if(t.includes("mesaj") || t.includes("chat") || t.includes("yazisma")) icon = "messages";
      else if(t.includes("destək") || t.includes("destek") || t.includes("sikay") || t.includes("bilet") || t.includes("ticket")) icon = "support";
      else if(t.includes("sifaris") || t.includes("order")) icon = "orders";
      else if(t.includes("alis")) icon = "purchases";
      else if(t.includes("yadda") || t.includes("sevim") || t.includes("favor")) icon = "saved";
      else if(t.includes("elan yerles") || t.includes("add") || t.includes("yeni elan")) icon = "add";
      else if(t.includes("elan")) icon = "ads";
      else if(t.includes("cixaris") || t.includes("withdraw") || t.includes("bank")) icon = "withdraw";
      else if(t.includes("balans") || t.includes("pul") || t.includes("wallet") || t.includes("oden")) icon = "wallet";
      else if(t.includes("satis") || t.includes("qazanc")) icon = "sales";
      else if(t.includes("admin")) icon = "admin";
      else if(t.includes("cix") || t.includes("logout")) icon = "logout";
      btn.setAttribute("data-cabinet-icon", icon);
    });
  }
  document.addEventListener("DOMContentLoaded", applyProfessionalCabinetIcons);
  document.addEventListener("click", function(){
    setTimeout(applyProfessionalCabinetIcons, 60);
  });
})();

// THEME TOGGLE
function toggleTheme(){
  const isLight = document.body.classList.toggle("light-mode");
  const btn = document.getElementById("themeToggleBtn");
  if(btn) btn.textContent = isLight ? "🌑" : "🌙";
  try{ localStorage.setItem("gs_theme", isLight ? "light" : "dark"); }catch(e){}
  // update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = isLight ? "#f0f2f5" : "#050607";
}
// Restore saved theme on load
(function(){
  try{
    const saved = localStorage.getItem("gs_theme");
    if(saved === "light"){
      document.body.classList.add("light-mode");
      document.addEventListener("DOMContentLoaded", function(){
        const btn = document.getElementById("themeToggleBtn");
        if(btn) btn.textContent = "🌑";
        const meta = document.querySelector('meta[name="theme-color"]');
        if(meta) meta.content = "#f0f2f5";
      });
    }
  }catch(e){}
})();

</body>
