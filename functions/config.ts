import * as admin from "firebase-admin";
admin.initializeApp({
  databaseURL: "https://agendamento-consultas-tdsz-default-rtdb.firebaseio.com",
});
export const db = admin.database();