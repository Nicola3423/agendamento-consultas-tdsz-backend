import * as functions from "firebase-functions";
import { signUp } from "./auth";
import { createAppointment, getAppointments } from "./appointments";
export { signUp };
export { createAppointment, getAppointments };
export const helloWorld = functions.https.onRequest((req, res) => {
  res.json({ message: "API funcionando!" });
});