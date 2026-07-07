// Firebase configuration (compat SDK)
const firebaseConfig = {
  apiKey: "AIzaSyBygt7wo7bGBVO-ho-P7LA6nO-olV_Wj_U",
  authDomain: "expenseprivatedb.firebaseapp.com",
  projectId: "expenseprivatedb",
  storageBucket: "expenseprivatedb.firebasestorage.app",
  messagingSenderId: "531840474729",
  appId: "1:531840474729:web:0518e417181df7f4198cf8"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
