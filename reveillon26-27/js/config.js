/* ------------------------------------------------------------------
   Votação — Firebase Realtime Database (projeto renecastro-a6d57,
   conta rene.affonso@gmail.com, plano Spark/gratuito).

   Esta config é pública por design: toda app Firebase web expõe estes
   valores no HTML. Quem protege o banco são as regras, publicadas no
   console e reproduzidas abaixo para referência:

   {
     "rules": {
       "reveillon-2026-2027": {
         "votos": {
           ".read": true,
           "$slug": {
             ".write": true,
             ".validate": "newData.hasChildren(['casa','nome','em'])
                && newData.child('casa').val().length <= 40
                && newData.child('nome').val().length <= 60
                && newData.child('em').isNumber()"
           }
         }
       }
     }
   }

   Ou seja: qualquer um lê os votos e grava um voto no formato esperado,
   e nada além disso — o resto do banco fica fechado.
   ------------------------------------------------------------------ */
window.CONFIG = {
  firebase: {
    apiKey: "AIzaSyDI4y8uRzi7zSp1dk1x_nvJ6Gw3huia7yc",
    authDomain: "renecastro-a6d57.firebaseapp.com",
    databaseURL: "https://renecastro-a6d57-default-rtdb.firebaseio.com",
    projectId: "renecastro-a6d57",
    storageBucket: "renecastro-a6d57.firebasestorage.app",
    messagingSenderId: "837536344970",
    appId: "1:837536344970:web:70279889a9456e43e7b673"
  },
  sala: 'reveillon-2026-2027'
};
