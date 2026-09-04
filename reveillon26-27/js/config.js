/* ------------------------------------------------------------------
   Configuração da votação.

   Enquanto `firebase` estiver null, a página funciona normalmente,
   mas cada voto fica só no navegador de quem votou (modo rascunho).

   Para ligar a votação de verdade (grátis, plano Spark):
   1. console.firebase.google.com → "Adicionar projeto" (sem cartão)
   2. Build → Realtime Database → Criar banco → modo de teste
   3. Configurações do projeto → Seus apps → Web (</>) → copie o objeto
   4. Cole o objeto abaixo no lugar do null e publique.
   ------------------------------------------------------------------ */
window.CONFIG = {
  firebase: null,
  // firebase: {
  //   apiKey: "...",
  //   authDomain: "seu-projeto.firebaseapp.com",
  //   databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  //   projectId: "seu-projeto",
  //   appId: "..."
  // },
  sala: 'reveillon-2026-2027'
};
